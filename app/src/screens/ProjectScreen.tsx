import { StyleSheet, Text, View, ScrollView } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Project">;
  route: RouteProp<RootStackParamList, "Project">;
};

export function ProjectScreen({ route }: Props) {
  const { projectId } = route.params;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Project Details</Text>
        <Text style={styles.id}>ID: {projectId}</Text>

        {/* Status Timeline */}
        <View style={styles.timeline}>
          {["Intake", "Building", "Deploying", "Deployed"].map((step, i) => (
            <View key={step} style={styles.timelineStep}>
              <View style={[styles.dot, i === 0 && styles.dotActive]} />
              <Text style={[styles.stepLabel, i === 0 && styles.stepLabelActive]}>
                {step}
              </Text>
            </View>
          ))}
        </View>

        {/* Placeholder sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Brief</Text>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              AI-generated project brief will appear here after the intake conversation.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Generated Code</Text>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              Code generation preview and file tree will be shown here.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deployment</Text>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              Deployment status, URL, and logs will appear here.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 20, paddingTop: 16 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827" },
  id: { fontSize: 13, color: "#9CA3AF", marginTop: 4 },
  timeline: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  timelineStep: { alignItems: "center", gap: 6 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#E5E7EB" },
  dotActive: { backgroundColor: "#111827" },
  stepLabel: { fontSize: 12, color: "#9CA3AF" },
  stepLabelActive: { color: "#111827", fontWeight: "600" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#111827", marginBottom: 12 },
  placeholder: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  placeholderText: { fontSize: 14, color: "#9CA3AF", textAlign: "center" },
});
