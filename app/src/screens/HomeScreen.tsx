import { StyleSheet, Text, View, TouchableOpacity, FlatList } from "react-native";
import { useAppSelector } from "../store/hooks";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Home">;
};

const MOCK_PROJECTS = [
  { id: "1", name: "Client E-Commerce Store", status: "deployed", platform: "Shopify" },
  { id: "2", name: "Portfolio Website", status: "building", platform: "WordPress" },
  { id: "3", name: "Restaurant App", status: "intake", platform: "Custom" },
];

export function HomeScreen({ navigation }: Props) {
  const user = useAppSelector((state) => state.auth.user);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back{user ? `, ${user.name}` : ""}</Text>
        <Text style={styles.subtitle}>Your Projects</Text>
      </View>

      <FlatList
        data={MOCK_PROJECTS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("Project", { projectId: item.id })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <View
                style={[
                  styles.statusBadge,
                  item.status === "deployed" && styles.statusDeployed,
                  item.status === "building" && styles.statusBuilding,
                  item.status === "intake" && styles.statusIntake,
                ]}
              >
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.cardPlatform}>{item.platform}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, backgroundColor: "#fff" },
  greeting: { fontSize: 28, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 16, color: "#6B7280", marginTop: 4 },
  list: { padding: 20, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#111827", flex: 1 },
  cardPlatform: { fontSize: 13, color: "#9CA3AF", marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: "#E5E7EB" },
  statusDeployed: { backgroundColor: "#D1FAE5" },
  statusBuilding: { backgroundColor: "#FEF3C7" },
  statusIntake: { backgroundColor: "#DBEAFE" },
  statusText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
});
