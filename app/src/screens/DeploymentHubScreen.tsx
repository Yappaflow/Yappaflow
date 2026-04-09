import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Check, Globe, Server, ExternalLink, Sparkles } from "lucide-react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { Colors, Radius, Space, Font } from "../design/tokens";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "DeploymentHub">;
  route: RouteProp<RootStackParamList, "DeploymentHub">;
};

type Route = "cms" | "custom" | null;
type CMS = "shopify" | "wordpress" | "webflow" | "ikas";

const CMS_OPTIONS: { id: CMS; label: string; color: string }[] = [
  { id: "shopify",   label: "Shopify",   color: "#96BF48" },
  { id: "wordpress", label: "WordPress", color: "#21759B" },
  { id: "webflow",   label: "Webflow",   color: "#4353FF" },
  { id: "ikas",      label: "IKAS",      color: "#FF6B35" },
];

function SuccessOverlay({ url, onClose }: { url: string; onClose: () => void }) {
  const scale  = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const ring1  = useRef(new Animated.Value(1)).current;
  const ring2  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ring1, { toValue: 2.2, duration: 1200, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        ]),
        Animated.timing(ring1, { toValue: 1, duration: 0, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(ring2, { toValue: 2.2, duration: 1200, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        Animated.timing(ring2, { toValue: 1, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity, ring1, ring2, scale]);

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      <Animated.View style={[styles.successCard, { transform: [{ scale }] }]}>
        <View style={styles.successIconWrap}>
          <Animated.View style={[styles.ring, { transform: [{ scale: ring1 }], opacity: ring1.interpolate({ inputRange: [1, 2.2], outputRange: [0.4, 0] }) }]} />
          <Animated.View style={[styles.ring, { transform: [{ scale: ring2 }], opacity: ring2.interpolate({ inputRange: [1, 2.2], outputRange: [0.4, 0] }) }]} />
          <View style={styles.successIcon}>
            <Check size={32} color="#fff" strokeWidth={3} />
          </View>
        </View>

        <Text style={styles.successTitle}>Site is Live! 🎉</Text>
        <Text style={styles.successSub}>Your project has been deployed successfully</Text>

        <View style={styles.urlBox}>
          <Globe size={14} color={Colors.live} />
          <Text style={styles.urlText} numberOfLines={1}>{url}</Text>
        </View>

        <TouchableOpacity style={styles.openBtn}>
          <ExternalLink size={16} color="#fff" />
          <Text style={styles.openLabel}>Open Live Site</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
          <Text style={styles.doneLabel}>Back to Dashboard</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

export function DeploymentHubScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [route, setRoute]         = useState<Route>(null);
  const [selectedCMS, setSelectedCMS] = useState<CMS | null>(null);
  const [domain, setDomain]       = useState("");
  const [deploying, setDeploying] = useState(false);
  const [success, setSuccess]     = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  const startDeploy = () => {
    setDeploying(true);
    Animated.timing(progress, {
      toValue: 1, duration: 3200, useNativeDriver: false, easing: Easing.out(Easing.ease),
    }).start(() => setSuccess(true));
  };

  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Deployment Hub</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Route selector */}
        {!route && (
          <>
            <Text style={styles.sectionLabel}>Choose Deployment Route</Text>
            <View style={styles.routeCards}>
              <TouchableOpacity
                style={styles.routeCard}
                onPress={() => setRoute("cms")}
                activeOpacity={0.8}
              >
                <View style={[styles.routeIcon, { backgroundColor: "rgba(59,130,246,0.12)" }]}>
                  <Globe size={28} color={Colors.info} />
                </View>
                <Text style={styles.routeTitle}>Deploy to CMS</Text>
                <Text style={styles.routeSub}>Shopify, WordPress, Webflow, or IKAS</Text>
                <View style={styles.routeArrow}>
                  <Text style={styles.routeArrowText}>Select →</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.routeCard}
                onPress={() => setRoute("custom")}
                activeOpacity={0.8}
              >
                <View style={[styles.routeIcon, { backgroundColor: Colors.accentDim }]}>
                  <Server size={28} color={Colors.accent} />
                </View>
                <Text style={styles.routeTitle}>Deploy Custom</Text>
                <Text style={styles.routeSub}>Domain via Namecheap + Hostinger server</Text>
                <View style={styles.routeArrow}>
                  <Text style={[styles.routeArrowText, { color: Colors.accent }]}>Select →</Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* CMS route */}
        {route === "cms" && (
          <>
            <TouchableOpacity onPress={() => setRoute(null)} style={styles.backLink}>
              <Text style={styles.backLinkText}>← Change route</Text>
            </TouchableOpacity>
            <Text style={styles.sectionLabel}>Select Platform</Text>
            <View style={styles.cmsGrid}>
              {CMS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.cmsCard, selectedCMS === opt.id && { borderColor: opt.color, borderWidth: 2 }]}
                  onPress={() => setSelectedCMS(opt.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.cmsDot, { backgroundColor: opt.color }]} />
                  <Text style={[styles.cmsLabel, selectedCMS === opt.id && { color: opt.color }]}>
                    {opt.label}
                  </Text>
                  {selectedCMS === opt.id && (
                    <View style={[styles.cmsCheck, { backgroundColor: opt.color }]}>
                      <Check size={10} color="#fff" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {selectedCMS && !deploying && (
              <TouchableOpacity style={styles.deployBtn} onPress={startDeploy} activeOpacity={0.85}>
                <Sparkles size={18} color="#fff" />
                <Text style={styles.deployLabel}>Deploy to {CMS_OPTIONS.find((c) => c.id === selectedCMS)?.label}</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Custom route */}
        {route === "custom" && (
          <>
            <TouchableOpacity onPress={() => setRoute(null)} style={styles.backLink}>
              <Text style={styles.backLinkText}>← Change route</Text>
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>Domain Setup</Text>
            <View style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
              <View style={styles.stepBody}>
                <Text style={styles.stepTitle}>Search Domain (Namecheap)</Text>
                <View style={styles.domainInput}>
                  <Text style={styles.domainPrefix}>https://</Text>
                  <Text style={styles.domainValue}>butikmode.com</Text>
                  <View style={styles.domainCheck}><Check size={12} color={Colors.live} strokeWidth={3} /></View>
                </View>
                <Text style={styles.domainAvail}>✓ Available — $10.98/yr</Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
              <View style={styles.stepBody}>
                <Text style={styles.stepTitle}>Server (Hostinger)</Text>
                <View style={styles.serverCard}>
                  <Text style={styles.serverPlan}>Business Plan</Text>
                  <Text style={styles.serverPrice}>$3.99/mo</Text>
                </View>
                <Text style={styles.serverSpec}>4 GB RAM · 200 GB SSD · Auto SSL</Text>
              </View>
            </View>

            {!deploying && (
              <TouchableOpacity style={styles.deployBtn} onPress={startDeploy} activeOpacity={0.85}>
                <Sparkles size={18} color="#fff" />
                <Text style={styles.deployLabel}>Confirm & Deploy</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Deploying progress */}
        {deploying && !success && (
          <View style={styles.progressSection}>
            <Text style={styles.progressTitle}>Deploying your site...</Text>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
            {["Building assets", "Configuring DNS", "SSL certificate", "Going live"].map((step, i) => (
              <View key={step} style={styles.progressStep}>
                <View style={[styles.progressDot, { backgroundColor: i < 2 ? Colors.live : Colors.border }]} />
                <Text style={[styles.progressStepText, { color: i < 2 ? Colors.live : Colors.textMuted }]}>
                  {step}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {success && (
        <SuccessOverlay
          url="https://butikmode.com"
          onClose={() => navigation.navigate("CommandCenter")}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:            { flex: 1, backgroundColor: Colors.bg },
  header:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Space.xl, paddingVertical: Space.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle:     { fontSize: Font.base, fontWeight: "700", color: Colors.textPrimary },
  backBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface2, alignItems: "center", justifyContent: "center" },
  scroll:          { padding: Space.xl, paddingBottom: 120 },
  sectionLabel:    { fontSize: Font.sm, fontWeight: "700", color: Colors.textSecondary, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: Space.lg },
  routeCards:      { gap: Space.md },
  routeCard:       { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Space.xl },
  routeIcon:       { width: 56, height: 56, borderRadius: Radius.lg, alignItems: "center", justifyContent: "center", marginBottom: Space.md },
  routeTitle:      { fontSize: Font.md, fontWeight: "700", color: Colors.textPrimary, marginBottom: 4 },
  routeSub:        { fontSize: Font.sm, color: Colors.textSecondary, lineHeight: 20 },
  routeArrow:      { marginTop: Space.lg },
  routeArrowText:  { fontSize: Font.sm, fontWeight: "700", color: Colors.info },
  backLink:        { marginBottom: Space.xl },
  backLinkText:    { fontSize: Font.sm, color: Colors.textSecondary },
  cmsGrid:         { flexDirection: "row", flexWrap: "wrap", gap: Space.sm, marginBottom: Space.xl },
  cmsCard:         { width: "47%", backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Space.lg, position: "relative" },
  cmsDot:          { width: 8, height: 8, borderRadius: 4, marginBottom: Space.sm },
  cmsLabel:        { fontSize: Font.base, fontWeight: "600", color: Colors.textPrimary },
  cmsCheck:        { position: "absolute", top: Space.sm, right: Space.sm, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  deployBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Space.sm, backgroundColor: Colors.accent, borderRadius: Radius.lg, padding: Space.xl },
  deployLabel:     { fontSize: Font.base, fontWeight: "700", color: "#fff" },
  step:            { flexDirection: "row", gap: Space.md, marginBottom: Space.xl },
  stepNum:         { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.accentDim, borderWidth: 1, borderColor: Colors.accentBorder, alignItems: "center", justifyContent: "center", marginTop: 2 },
  stepNumText:     { fontSize: Font.xs, fontWeight: "800", color: Colors.accent },
  stepBody:        { flex: 1 },
  stepTitle:       { fontSize: Font.base, fontWeight: "600", color: Colors.textPrimary, marginBottom: Space.sm },
  domainInput:     { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.live, padding: Space.md, gap: Space.xs },
  domainPrefix:    { fontSize: Font.sm, color: Colors.textMuted },
  domainValue:     { fontSize: Font.sm, fontWeight: "600", color: Colors.textPrimary, flex: 1 },
  domainCheck:     { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.liveDim, alignItems: "center", justifyContent: "center" },
  domainAvail:     { fontSize: Font.xs, color: Colors.live, marginTop: Space.xs },
  serverCard:      { flexDirection: "row", justifyContent: "space-between", backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Space.md, marginBottom: Space.xs },
  serverPlan:      { fontSize: Font.base, fontWeight: "600", color: Colors.textPrimary },
  serverPrice:     { fontSize: Font.base, fontWeight: "700", color: Colors.accent },
  serverSpec:      { fontSize: Font.xs, color: Colors.textMuted },
  progressSection: { gap: Space.md, marginTop: Space.xl },
  progressTitle:   { fontSize: Font.md, fontWeight: "700", color: Colors.textPrimary, textAlign: "center" },
  progressTrack:   { height: 4, backgroundColor: Colors.surface3, borderRadius: 2, overflow: "hidden", marginBottom: Space.md },
  progressFill:    { height: 4, backgroundColor: Colors.accent, borderRadius: 2 },
  progressStep:    { flexDirection: "row", alignItems: "center", gap: Space.sm },
  progressDot:     { width: 8, height: 8, borderRadius: 4 },
  progressStepText:{ fontSize: Font.sm },
  overlay:         { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center", padding: Space.xl },
  successCard:     { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Space.xxl, alignItems: "center", width: "100%" },
  successIconWrap: { alignItems: "center", justifyContent: "center", width: 80, height: 80, marginBottom: Space.xl },
  ring:            { position: "absolute", width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: Colors.live },
  successIcon:     { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.live, alignItems: "center", justifyContent: "center" },
  successTitle:    { fontSize: Font.xl, fontWeight: "800", color: Colors.textPrimary, marginBottom: Space.xs },
  successSub:      { fontSize: Font.sm, color: Colors.textSecondary, textAlign: "center", marginBottom: Space.xl },
  urlBox:          { flexDirection: "row", alignItems: "center", gap: Space.sm, backgroundColor: Colors.liveDim, borderRadius: Radius.md, paddingHorizontal: Space.md, paddingVertical: Space.sm, marginBottom: Space.xl, width: "100%" },
  urlText:         { fontSize: Font.sm, fontWeight: "600", color: Colors.live, flex: 1 },
  openBtn:         { flexDirection: "row", alignItems: "center", gap: Space.sm, backgroundColor: Colors.live, borderRadius: Radius.md, padding: Space.lg, width: "100%", justifyContent: "center", marginBottom: Space.sm },
  openLabel:       { fontSize: Font.base, fontWeight: "700", color: "#fff" },
  doneBtn:         { padding: Space.md, width: "100%", alignItems: "center" },
  doneLabel:       { fontSize: Font.sm, color: Colors.textSecondary },
});
