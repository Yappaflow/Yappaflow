import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView } from "react-native";
import { Instagram, ArrowLeft } from "lucide-react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/AuthNavigator";

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "InstagramAuth">;
};

// Instagram OAuth in React Native requires expo-web-browser + expo-auth-session.
// This screen shows a placeholder with instructions to configure.
export function InstagramAuthScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#6B7280" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.iconBox}>
          <Instagram color="white" size={28} />
        </View>
        <Text style={styles.title}>Continue with Instagram</Text>
        <Text style={styles.subtitle}>
          You'll be redirected to Instagram to authorize Yappaflow.
        </Text>

        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>Setup Required</Text>
          <Text style={styles.noteText}>
            Instagram OAuth requires{"\n"}
            • expo-web-browser{"\n"}
            • expo-auth-session{"\n"}
            • Instagram App credentials in .env
          </Text>
        </View>

        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },
  container: { flex: 1, padding: 24 },
  back: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 24 },
  backText: { color: "#6B7280", fontSize: 14 },
  iconBox: {
    width: 56, height: 56, borderRadius: 16, marginBottom: 16,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#C13584",
  },
  title: { fontSize: 26, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 6, marginBottom: 28, lineHeight: 20 },
  noteBox: {
    backgroundColor: "#FEF3C7", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "#FDE68A", marginBottom: 24,
  },
  noteTitle: { fontSize: 14, fontWeight: "600", color: "#92400E", marginBottom: 8 },
  noteText: { fontSize: 13, color: "#92400E", lineHeight: 20 },
  btn: { backgroundColor: "#111827", borderRadius: 14, padding: 16, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
