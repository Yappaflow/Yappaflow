import { useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, ActivityIndicator, Text } from "react-native";
import { Home, Settings } from "lucide-react-native";

import { CommandCenterScreen } from "../screens/CommandCenterScreen";
import { EngineRoomScreen }    from "../screens/EngineRoomScreen";
import { DeploymentHubScreen } from "../screens/DeploymentHubScreen";
import { IntegrationsScreen }  from "../screens/IntegrationsScreen";
import { AuthNavigator }       from "./AuthNavigator";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setToken, setUser }   from "../store/slices/authSlice";
import { Colors }              from "../design/tokens";

export type RootStackParamList = {
  Auth:          undefined;
  Main:          undefined;
  EngineRoom:    { signalId: string | null };
  DeploymentHub: { projectId: string };
  CommandCenter: undefined;
};

export type MainTabParamList = {
  CommandCenter: undefined;
  Integrations:  undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor:  Colors.border,
          borderTopWidth:  1,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor:   Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tab.Screen
        name="CommandCenter"
        component={CommandCenterScreen}
        options={{
          tabBarLabel: "Command",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Integrations"
        component={IntegrationsScreen}
        options={{
          tabBarLabel: "Settings",
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const dispatch        = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      try {
        const token = await AsyncStorage.getItem("yappaflow_token");
        if (token) {
          dispatch(setToken(token));
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
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bg }}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={{ color: Colors.textMuted, marginTop: 12, fontSize: 13 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="EngineRoom"
            component={EngineRoomScreen}
            options={{ animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="DeploymentHub"
            component={DeploymentHubScreen}
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="CommandCenter"
            component={MainTabs}
            options={{ animation: "slide_from_left" }}
          />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}
