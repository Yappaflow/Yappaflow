import { useState } from "react";
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { ArrowLeft } from "lucide-react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import { apiVerifyWhatsappOtp, apiRequestWhatsappOtp } from "../../services/auth.service";
import { useAppDispatch } from "../../store/hooks";
import { setUser } from "../../store/slices/authSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "WhatsAppOtp">;
  route: RouteProp<AuthStackParamList, "WhatsAppOtp">;
};

export function WhatsAppOtpScreen({ navigation, route }: Props) {
  const { phone } = route.params;
  const dispatch = useAppDispatch();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVerify() {
    if (otp.length !== 6) {
      Alert.alert("Invalid code", "Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      const result = await apiVerifyWhatsappOtp(phone, otp);
      await AsyncStorage.setItem("yappaflow_token", result.token);
      dispatch(setUser({ id: result.user.id, email: result.user.email ?? phone, name: result.user.name }));
      // WhatsApp OTP = phone verified, go to main
      navigation.getParent()?.reset({ index: 0, routes: [{ name: "Main" as never }] });
    } catch (err: unknown) {
      Alert.alert("Invalid code", err instanceof Error ? err.message : "Please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#6B7280" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Enter your code</Text>
        <Text style={styles.subtitle}>We sent a 6-digit code to WhatsApp{"\n"}{phone}</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Verification code</Text>
          <TextInput
            style={styles.otpInput}
            value={otp}
            onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />

          <TouchableOpacity style={styles.btn} onPress={handleVerify} disabled={loading || otp.length < 6}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Verify</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { setOtp(""); apiRequestWhatsappOtp(phone); }}
          >
            <Text style={styles.resend}>Resend code</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },
  container: { flexGrow: 1, padding: 24 },
  back: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 24 },
  backText: { color: "#6B7280", fontSize: 14 },
  title: { fontSize: 26, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 6, marginBottom: 28, lineHeight: 20 },
  form: { gap: 12 },
  label: { fontSize: 14, fontWeight: "500", color: "#111827" },
  otpInput: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB",
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 28, letterSpacing: 16, textAlign: "center", fontFamily: "monospace",
  },
  btn: { backgroundColor: "#111827", borderRadius: 14, padding: 16, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  resend: { textAlign: "center", fontSize: 14, color: "#6B7280" },
});
