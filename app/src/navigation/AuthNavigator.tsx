import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { EmailAuthScreen } from "../screens/auth/EmailAuthScreen";
import { WhatsAppPhoneScreen } from "../screens/auth/WhatsAppPhoneScreen";
import { WhatsAppOtpScreen } from "../screens/auth/WhatsAppOtpScreen";
import { PhoneVerifyScreen } from "../screens/auth/PhoneVerifyScreen";
import { InstagramAuthScreen } from "../screens/auth/InstagramAuthScreen";

export type AuthStackParamList = {
  Login: undefined;
  EmailAuth: undefined;
  WhatsAppPhone: undefined;
  WhatsAppOtp: { phone: string };
  PhoneVerify: { token: string };
  InstagramAuth: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="EmailAuth" component={EmailAuthScreen} />
      <Stack.Screen name="WhatsAppPhone" component={WhatsAppPhoneScreen} />
      <Stack.Screen name="WhatsAppOtp" component={WhatsAppOtpScreen} />
      <Stack.Screen name="PhoneVerify" component={PhoneVerifyScreen} />
      <Stack.Screen name="InstagramAuth" component={InstagramAuthScreen} />
    </Stack.Navigator>
  );
}
