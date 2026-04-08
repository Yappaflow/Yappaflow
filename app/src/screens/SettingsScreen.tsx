import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { logout } from "../store/slices/authSlice";

export function SettingsScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const settingsItems = [
    { label: "Account", value: user?.email || "Not signed in" },
    { label: "Language", value: "English" },
    { label: "Notifications", value: "Enabled" },
    { label: "Theme", value: "Light" },
    { label: "Version", value: "0.1.0" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.card}>
        {settingsItems.map((item, i) => (
          <View
            key={item.label}
            style={[styles.row, i < settingsItems.length - 1 && styles.rowBorder]}
          >
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.value}>{item.value}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => dispatch(logout())}
      >
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "700", color: "#111827" },
  card: {
    margin: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: { flexDirection: "row", justifyContent: "space-between", padding: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  label: { fontSize: 15, fontWeight: "500", color: "#111827" },
  value: { fontSize: 15, color: "#9CA3AF" },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 8,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  logoutText: { fontSize: 15, fontWeight: "600", color: "#EF4444" },
});
