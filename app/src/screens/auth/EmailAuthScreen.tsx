import { useState } from "react";
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { ArrowLeft, Eye, EyeOff } from "lucide-react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";
import { apiLoginEmail, apiRegisterEmail } from "../../services/auth.service";
import { useAppDispatch } from "../../store/hooks";
import { setUser } from "../../store/slices/authSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "EmailAuth">;
};

export function EmailAuthScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !password || (mode === "register" && !name)) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const result =
        mode === "login"
          ? await apiLoginEmail(email, password)
          : await apiRegisterEmail(email, password, name);

      await AsyncStorage.setItem("yappaflow_token", result.token);
      dispatch(setUser({ id: result.user.id, email: result.user.email ?? "", name: result.user.name }));

      if (!result.user.phoneVerified) {
        navigation.navigate("PhoneVerify", { token: result.token });
      } else {
        navigation.getParent()?.reset({ index: 0, routes: [{ name: "Main" as never }] });
      }
    } catch (err: unknown) {
      Alert.alert("Error", err instanceof Error ? err.message : "Something went wrong");
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

        <Text style={styles.title}>{mode === "login" ? "Sign In" : "Create Account"}</Text>

        <View style={styles.form}>
          {mode === "register" && (
            <View style={styles.field}>
              <Text style={styles.label}>Full name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                autoCapitalize="words"
              />
            </View>
          )}
          <View style={styles.field}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@agency.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 8 characters"
                secureTextEntry={!showPw}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
                {showPw ? <EyeOff size={18} color="#9CA3AF" /> : <Eye size={18} color="#9CA3AF" />}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.submitText}>{mode === "login" ? "Sign In" : "Create Account"}</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => setMode(mode === "login" ? "register" : "login")}>
          <Text style={styles.switchText}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <Text style={styles.switchLink}>{mode === "login" ? "Create one" : "Sign in"}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },
  container: { flexGrow: 1, padding: 24 },
  back: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 24 },
  backText: { color: "#6B7280", fontSize: 14 },
  title: { fontSize: 26, fontWeight: "700", color: "#111827", marginBottom: 24 },
  form: { gap: 16, marginBottom: 20 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: "500", color: "#111827" },
  input: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB",
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
  },
  passwordRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyeBtn: { padding: 4 },
  submitBtn: {
    backgroundColor: "#111827", borderRadius: 14, padding: 16,
    alignItems: "center", marginTop: 8,
  },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  switchText: { textAlign: "center", fontSize: 14, color: "#6B7280" },
  switchLink: { fontWeight: "600", color: "#111827" },
});
