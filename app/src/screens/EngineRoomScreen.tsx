import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Zap, Mic, MicOff, ChevronRight } from "lucide-react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { Colors, Radius, Space, Font } from "../design/tokens";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "EngineRoom">;
  route: RouteProp<RootStackParamList, "EngineRoom">;
};

const { height: SCREEN_H } = Dimensions.get("window");

const TRANSCRIPT_LINES = [
  { role: "client",  text: "Merhaba, bir e-ticaret sitesi istiyorum." },
  { role: "agent",   text: "Hangi ürünleri satıyorsunuz?" },
  { role: "client",  text: "Kadın giyim. Shopify üzerinden gitmek istiyoruz." },
  { role: "agent",   text: "Kaç ürün var yaklaşık olarak?" },
  { role: "client",  text: "Şu an 80 ürün, ama büyüyecek." },
  { role: "agent",   text: "Anladım. Tema tercihiniz var mı?" },
  { role: "client",  text: "Minimalist, beyaz ağırlıklı bir şey olsun." },
];

const CODE_STREAM = [
  "// Generating Shopify theme scaffold...",
  "theme.json → { 'name': 'butikmode', 'version': '1.0' }",
  "sections/header.liquid → created",
  "sections/hero-banner.liquid → created",
  "sections/product-grid.liquid → created",
  "snippets/product-card.liquid → created",
  "assets/style.css → injecting brand tokens...",
  "config/settings_schema.json → 42 fields mapped",
  "layout/theme.liquid → SEO meta injected",
  "locales/tr.default.json → 128 strings",
  "// Running Shopify CLI deploy check...",
  "✓ Theme validated — 0 errors",
  "// Pushing to Shopify store...",
  "✓ Deployed to preview: https://butikmode.myshopify.com/",
];

function TypingLine({ text, delay, color }: { text: string; delay: number; color: string }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let i = 0;
    timer = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) clearInterval(interval);
      }, 18);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [text, delay]);

  return (
    <Text style={[styles.codeLine, { color }]}>
      {displayed}
      {displayed.length < text.length && (
        <Text style={{ color: Colors.accent }}>▋</Text>
      )}
    </Text>
  );
}

function AudioBars() {
  const bars = Array.from({ length: 5 }, (_, i) => useRef(new Animated.Value(0.3)).current);

  useEffect(() => {
    bars.forEach((bar, i) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: 0.3 + Math.random() * 0.7,
            duration: 200 + i * 80,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(bar, {
            toValue: 0.2,
            duration: 200 + i * 60,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      );
      loop.start();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.audioBars}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[styles.audioBar, { transform: [{ scaleY: bar }] }]}
        />
      ))}
    </View>
  );
}

export function EngineRoomScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [micOn, setMicOn] = useState(true);
  const [visibleCode, setVisibleCode] = useState(0);
  const codeScrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 600, useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i++;
      setVisibleCode(i);
      codeScrollRef.current?.scrollToEnd({ animated: true });
      if (i >= CODE_STREAM.length) clearInterval(t);
    }, 700);
    return () => clearInterval(t);
  }, []);

  return (
    <Animated.View style={[styles.root, { paddingTop: insets.top, opacity: fadeAnim }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.liveTag}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE SESSION</Text>
        </View>
        <Text style={styles.topTitle}>Engine Room</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <X size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Split pane */}
      <View style={styles.splitPane}>
        {/* LEFT: Transcript */}
        <View style={styles.pane}>
          <View style={styles.paneHeader}>
            <Text style={styles.paneTitle}>Transcript</Text>
            {micOn && <AudioBars />}
          </View>
          <ScrollView style={styles.paneScroll} showsVerticalScrollIndicator={false}>
            {TRANSCRIPT_LINES.map((line, i) => (
              <View
                key={i}
                style={[
                  styles.bubble,
                  line.role === "agent" ? styles.bubbleAgent : styles.bubbleClient,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    line.role === "agent" && styles.bubbleTextAgent,
                  ]}
                >
                  {line.text}
                </Text>
              </View>
            ))}
          </ScrollView>
          {/* Mic control */}
          <TouchableOpacity
            style={[styles.micBtn, !micOn && styles.micBtnOff]}
            onPress={() => setMicOn((v) => !v)}
          >
            {micOn ? <Mic size={20} color="#fff" /> : <MicOff size={20} color={Colors.textSecondary} />}
            <Text style={[styles.micLabel, !micOn && { color: Colors.textSecondary }]}>
              {micOn ? "Listening..." : "Muted"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* RIGHT: Code stream */}
        <View style={styles.pane}>
          <View style={styles.paneHeader}>
            <Zap size={14} color={Colors.accent} />
            <Text style={styles.paneTitle}>AI Output</Text>
          </View>
          <ScrollView
            ref={codeScrollRef}
            style={styles.terminal}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.terminalPrompt}>yappaflow@engine ~ %</Text>
            {CODE_STREAM.slice(0, visibleCode).map((line, i) => (
              <TypingLine
                key={i}
                text={line}
                delay={0}
                color={
                  line.startsWith("//") ? Colors.textMuted :
                  line.startsWith("✓")  ? Colors.live :
                                          Colors.textPrimary
                }
              />
            ))}
            {visibleCode < CODE_STREAM.length && (
              <Text style={[styles.codeLine, { color: Colors.accent }]}>▋</Text>
            )}
          </ScrollView>

          {/* Deploy CTA */}
          {visibleCode >= CODE_STREAM.length && (
            <TouchableOpacity
              style={styles.deployBtn}
              onPress={() => navigation.navigate("DeploymentHub", { projectId: "new" })}
            >
              <Text style={styles.deployLabel}>Review & Deploy</Text>
              <ChevronRight size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root:            { flex: 1, backgroundColor: Colors.bg },
  topBar:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Space.xl, paddingVertical: Space.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  liveTag:         { flexDirection: "row", alignItems: "center", gap: Space.xs, backgroundColor: "rgba(239,68,68,0.12)", paddingHorizontal: Space.sm, paddingVertical: 4, borderRadius: Radius.full },
  liveDot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.error },
  liveText:        { fontSize: Font.xs, fontWeight: "800", color: Colors.error, letterSpacing: 0.8 },
  topTitle:        { fontSize: Font.base, fontWeight: "700", color: Colors.textPrimary },
  closeBtn:        { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surface2, alignItems: "center", justifyContent: "center" },
  splitPane:       { flex: 1, flexDirection: "row" },
  pane:            { flex: 1, padding: Space.md },
  paneHeader:      { flexDirection: "row", alignItems: "center", gap: Space.xs, marginBottom: Space.md, paddingBottom: Space.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  paneTitle:       { fontSize: Font.sm, fontWeight: "700", color: Colors.textSecondary, letterSpacing: 0.5, textTransform: "uppercase" },
  paneScroll:      { flex: 1 },
  divider:         { width: 1, backgroundColor: Colors.border, marginVertical: Space.md },
  bubble:          { maxWidth: "90%", marginBottom: Space.sm, padding: Space.sm, borderRadius: Radius.md },
  bubbleClient:    { alignSelf: "flex-start", backgroundColor: Colors.surface2, borderBottomLeftRadius: 4 },
  bubbleAgent:     { alignSelf: "flex-end", backgroundColor: Colors.accentDim, borderWidth: 1, borderColor: Colors.accentBorder, borderBottomRightRadius: 4 },
  bubbleText:      { fontSize: Font.sm, color: Colors.textSecondary, lineHeight: 18 },
  bubbleTextAgent: { color: Colors.textPrimary },
  micBtn:          { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Space.sm, backgroundColor: Colors.accent, borderRadius: Radius.md, padding: Space.md, marginTop: Space.sm },
  micBtnOff:       { backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border },
  micLabel:        { fontSize: Font.sm, fontWeight: "700", color: "#fff" },
  terminal:        { flex: 1, backgroundColor: "#0D0D0E", borderRadius: Radius.md, padding: Space.md },
  terminalPrompt:  { fontSize: Font.xs, color: Colors.accent, fontFamily: "monospace", marginBottom: Space.xs },
  codeLine:        { fontSize: Font.xs, fontFamily: "monospace", lineHeight: 18, marginBottom: 2 },
  deployBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Space.sm, backgroundColor: Colors.live, borderRadius: Radius.md, padding: Space.md, marginTop: Space.sm },
  deployLabel:     { fontSize: Font.sm, fontWeight: "700", color: "#fff", flex: 1, textAlign: "center" },
  audioBars:       { flexDirection: "row", alignItems: "center", gap: 2, marginLeft: "auto" },
  audioBar:        { width: 3, height: 14, backgroundColor: Colors.accent, borderRadius: 2 },
});
