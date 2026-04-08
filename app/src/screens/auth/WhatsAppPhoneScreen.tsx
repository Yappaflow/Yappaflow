import { useState } from "react";
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { ArrowLeft, MessageCircle } from "lucide-react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import { apiRequestWhatsappOtp } from "../../services/auth.service";

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "WhatsAppPhone">;
};

export function WhatsAppPhoneScreen({ navigation }: Props) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    const normalized = phone.startsWith("+") ? phone : `+${phone}`;
    if (normalized.length < 8) {
      Alert.alert("Invalid number", "Please enter a valid phone number with country code.");
      return;
    }
    setLoading(true);
    try {
      await apiRequestWhatsappOtp(normalized);
      navigation.navigate("WhatsAppOtp", { phone: normalized });
    } catch (err: unknown) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to send OTP");
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

        <View style={styles.iconBox}>
          <MessageCircle color="white" size={28} />
        </View>
        <Text style={styles.title}>Sign in with WhatsApp</Text>
        <Text style={styles.subtitle}>We'll send a 6-digit code to your WhatsApp</Text>

        <View style={styles.form}>
          <Text style={styles.label}>WhatsApp Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+1 234 567 8900"
            keyboardType="phone-pad"
            autoFocus
          />
          <Text style={styles.hint}>Include your country code (e.g. +1, +44, +90)</Text>

          <TouchableOpacity style={styles.btn} onPress={handleSend} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Send Code</Text>
            }
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
  iconBox: { width: 52, height: 52, backgroundColor: "#25D366", borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title: { fontSize: 26, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 6, marginBottom: 28 },
  form: { gap: 8 },
  label: { fontSize: 14, fontWeight: "500", color: "#111827" },
  input: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB",
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
  },
  hint: { fontSize: 12, color: "#9CA3AF" },
  btn: { backgroundColor: "#111827", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
