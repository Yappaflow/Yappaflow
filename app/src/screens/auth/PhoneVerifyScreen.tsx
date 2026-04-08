import { useState } from "react";
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { Phone } from "lucide-react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import {
  apiRequestPhoneVerify,
  apiVerifyPhone,
} from "../../services/auth.service";

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "PhoneVerify">;
  route: RouteProp<AuthStackParamList, "PhoneVerify">;
};

type PhoneStep = "input" | "otp";

export function PhoneVerifyScreen({ navigation, route }: Props) {
  const { token } = route.params;
  const [step, setStep] = useState<PhoneStep>("input");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendOtp() {
    const normalized = phone.startsWith("+") ? phone : `+${phone}`;
    if (normalized.length < 8) {
      Alert.alert("Invalid number", "Enter a valid phone number with country code.");
      return;
    }
    setLoading(true);
    try {
      await apiRequestPhoneVerify(normalized, token);
      setPhone(normalized);
      setStep("otp");
    } catch (err: unknown) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (otp.length !== 6) {
      Alert.alert("Invalid code", "Enter the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      await apiVerifyPhone(phone, otp, token);
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
        <View style={styles.iconBox}>
          <Phone color="white" size={26} />
        </View>

        {step === "input" ? (
          <>
            <Text style={styles.title}>Verify your phone</Text>
            <Text style={styles.subtitle}>
              Enter your phone number to keep your account secure.{"\n"}
              We'll send a verification code via SMS.
            </Text>

            <View style={styles.form}>
              <Text style={styles.label}>Phone number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 234 567 8900"
                keyboardType="phone-pad"
                autoFocus
              />
              <Text style={styles.hint}>Include your country code</Text>

              <TouchableOpacity style={styles.btn} onPress={handleSendOtp} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Send Code</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.getParent()?.reset({ index: 0, routes: [{ name: "Main" as never }] })}
              >
                <Text style={styles.skip}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>Enter your code</Text>
            <Text style={styles.subtitle}>We sent a 6-digit code via SMS to{"\n"}{phone}</Text>

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

              <TouchableOpacity style={styles.btn} onPress={handleVerifyOtp} disabled={loading || otp.length < 6}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Verify</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setOtp(""); setStep("input"); }}>
                <Text style={styles.skip}>Change number</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },
  container: { flexGrow: 1, padding: 24 },
  iconBox: { width: 52, height: 52, backgroundColor: "#111827", borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title: { fontSize: 26, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 6, marginBottom: 28, lineHeight: 20 },
  form: { gap: 10 },
  label: { fontSize: 14, fontWeight: "500", color: "#111827" },
  input: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB",
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
  },
  otpInput: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB",
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 28, letterSpacing: 16, textAlign: "center", fontFamily: "monospace",
  },
  hint: { fontSize: 12, color: "#9CA3AF" },
  btn: { backgroundColor: "#111827", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 4 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  skip: { textAlign: "center", fontSize: 14, color: "#9CA3AF", paddingVertical: 8 },
});
