import { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, ActivityIndicator } from "react-native";
import { HomeScreen } from "../screens/HomeScreen";
import { ProjectScreen } from "../screens/ProjectScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { AuthNavigator } from "./AuthNavigator";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setToken, setUser } from "../store/slices/authSlice";

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Project: { projectId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#111827",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: { backgroundColor: "#fff", borderTopColor: "#F3F4F6" },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: "Projects" }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: "Settings" }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      try {
        const token = await AsyncStorage.getItem("yappaflow_token");
        if (token) {
          dispatch(setToken(token));
          // Restore minimal user state from token (full hydration would call /me)
          dispatch(setUser({ id: "restored", email: "", name: "User" }));
        }
      } finally {
        setBootstrapping(false);
      }
    }
    bootstrap();
  }, [dispatch]);

  if (bootstrapping) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="Project"
            component={ProjectScreen}
            options={{
              headerShown: true,
              title: "Project",
              headerStyle: { backgroundColor: "#fff" },
              headerShadowVisible: false,
            }}
          />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}
