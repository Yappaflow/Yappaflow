import {
  StyleSheet, View, Text, TouchableOpacity,
  SafeAreaView, ScrollView,
} from "react-native";
import { MessageCircle, Mail, Instagram } from "lucide-react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "Login">;
};

export function LoginScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>Y</Text>
          </View>
          <Text style={styles.logoLabel}>Yappaflow</Text>
        </View>

        <Text style={styles.title}>Welcome to Yappaflow</Text>
        <Text style={styles.subtitle}>Choose how you'd like to sign in</Text>

        <View style={styles.buttons}>
          {/* WhatsApp */}
          <TouchableOpacity
            style={styles.socialBtn}
            onPress={() => navigation.navigate("WhatsAppPhone")}
          >
            <View style={[styles.iconBox, { backgroundColor: "#25D366" }]}>
              <MessageCircle color="white" size={20} />
            </View>
            <Text style={styles.socialBtnText}>Continue with WhatsApp</Text>
          </TouchableOpacity>

          {/* Instagram */}
          <TouchableOpacity
            style={styles.socialBtn}
            onPress={() => navigation.navigate("InstagramAuth")}
          >
            <View style={[styles.iconBox, { backgroundColor: "#C13584" }]}>
              <Instagram color="white" size={20} />
            </View>
            <Text style={styles.socialBtnText}>Continue with Instagram</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email */}
          <TouchableOpacity
            style={styles.socialBtn}
            onPress={() => navigation.navigate("EmailAuth")}
          >
            <View style={[styles.iconBox, { backgroundColor: "#F3F4F6" }]}>
              <Mail color="#111827" size={20} />
            </View>
            <Text style={styles.socialBtnText}>Continue with Email</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },
  container: { flexGrow: 1, padding: 24, justifyContent: "center" },
  logoContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 40 },
  logo: { width: 40, height: 40, backgroundColor: "#000", borderRadius: 10, alignItems: "center", justifyContent: "center" },
  logoText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  logoLabel: { fontSize: 20, fontWeight: "700", color: "#111827" },
  title: { fontSize: 26, fontWeight: "700", color: "#111827", textAlign: "center" },
  subtitle: { fontSize: 15, color: "#6B7280", textAlign: "center", marginTop: 8, marginBottom: 32 },
  buttons: { gap: 12 },
  socialBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  socialBtnText: { fontSize: 15, fontWeight: "600", color: "#111827" },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  dividerText: { fontSize: 13, color: "#9CA3AF" },
});
