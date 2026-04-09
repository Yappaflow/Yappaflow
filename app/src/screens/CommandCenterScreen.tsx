"use client";

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  useEffect as _useEffect,
  Dimensions,
} from "react-native";
import { useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Zap,
  MessageCircle,
  Instagram,
  ArrowRight,
  Radio,
  Clock,
  CheckCircle2,
  Rocket,
  ChevronRight,
} from "lucide-react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useAppSelector } from "../store/hooks";
import { Colors, Radius, Space, Font } from "../design/tokens";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "CommandCenter">;
};

const SIGNALS = [
  {
    id: "1",
    platform: "whatsapp" as const,
    sender: "Ahmet Yılmaz",
    message: "Shopify mağazamı yenilemek istiyorum...",
    time: "2m ago",
    unread: true,
  },
  {
    id: "2",
    platform: "instagram" as const,
    sender: "@butikmode",
    message: "Yeni koleksiyon için web sitesi lazım",
    time: "14m ago",
    unread: false,
  },
  {
    id: "3",
    platform: "whatsapp" as const,
    sender: "Sara K.",
    message: "Portfolio web sitesi fiyat alabilir miyim?",
    time: "1h ago",
    unread: false,
  },
];

const PIPELINE = [
  {
    id: "p1",
    name: "Butik Mode",
    phase: "deploying",
    platform: "Shopify",
    progress: 82,
  },
  {
    id: "p2",
    name: "Ahmet Mimarlık",
    phase: "building",
    platform: "Custom",
    progress: 47,
  },
  {
    id: "p3",
    name: "Leziz Restoran",
    phase: "live",
    platform: "WordPress",
    progress: 100,
  },
];

const PHASE_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  listening:  { label: "Listening",       color: Colors.info,    icon: <Radio     size={12} color={Colors.info}    /> },
  building:   { label: "Building",        color: Colors.warn,    icon: <Clock     size={12} color={Colors.warn}    /> },
  deploying:  { label: "Deploying",       color: Colors.accent,  icon: <Rocket    size={12} color={Colors.accent}  /> },
  live:       { label: "Live",            color: Colors.live,    icon: <CheckCircle2 size={12} color={Colors.live} /> },
};

function PulseDot({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1.6, duration: 900, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
          Animated.timing(opacity, { toValue: 0,   duration: 900, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, [opacity, scale]);

  return (
    <View style={{ width: 10, height: 10, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={{
          position: "absolute",
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
          transform: [{ scale }],
          opacity,
        }}
      />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}

function GlowButton({ label, onPress }: { label: string; onPress: () => void }) {
  const glow = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1,   duration: 1400, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(glow, { toValue: 0.4, duration: 1400, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();
  }, [glow]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.glowWrap}>
      <Animated.View style={[styles.glowRing, { opacity: glow }]} />
      <View style={styles.glowBtn}>
        <Radio size={20} color="#fff" />
        <Text style={styles.glowLabel}>{label}</Text>
        <ArrowRight size={18} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

export function CommandCenterScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const user = useAppSelector((s) => s.auth.user);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {new Date().getHours() < 12 ? "Good morning" : "Good evening"}
            {user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </Text>
          <View style={styles.agencyRow}>
            <PulseDot color={Colors.live} />
            <Text style={styles.agencyLabel}>Agency Online</Text>
          </View>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? "A"}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Active Signals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Signals</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{SIGNALS.filter((s) => s.unread).length} new</Text>
            </View>
          </View>

          <View style={styles.signalsCard}>
            {SIGNALS.map((sig, i) => (
              <TouchableOpacity
                key={sig.id}
                style={[styles.signalRow, i < SIGNALS.length - 1 && styles.signalBorder]}
                onPress={() => navigation.navigate("EngineRoom", { signalId: sig.id })}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.platformIcon,
                    { backgroundColor: sig.platform === "whatsapp" ? "rgba(37,211,102,0.12)" : "rgba(225,48,108,0.12)" },
                  ]}
                >
                  {sig.platform === "whatsapp" ? (
                    <MessageCircle size={16} color={Colors.whatsapp} />
                  ) : (
                    <Instagram size={16} color={Colors.instagram} />
                  )}
                </View>
                <View style={styles.signalBody}>
                  <View style={styles.signalTop}>
                    <Text style={styles.signalSender}>{sig.sender}</Text>
                    <Text style={styles.signalTime}>{sig.time}</Text>
                  </View>
                  <Text style={styles.signalMsg} numberOfLines={1}>
                    {sig.message}
                  </Text>
                </View>
                {sig.unread && <View style={styles.unreadDot} />}
                <ChevronRight size={16} color={Colors.textMuted} style={{ marginLeft: Space.xs }} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pipeline */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pipeline</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          <View style={{ gap: Space.sm }}>
            {PIPELINE.map((proj) => {
              const meta = PHASE_META[proj.phase];
              return (
                <TouchableOpacity
                  key={proj.id}
                  style={styles.pipeCard}
                  onPress={() => navigation.navigate("DeploymentHub", { projectId: proj.id })}
                  activeOpacity={0.75}
                >
                  <View style={styles.pipeTop}>
                    <Text style={styles.pipeName}>{proj.name}</Text>
                    <View style={[styles.phasePill, { backgroundColor: `${meta.color}18` }]}>
                      {meta.icon}
                      <Text style={[styles.phaseLabel, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.pipePlatform}>{proj.platform}</Text>
                  {/* Progress bar */}
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${proj.progress}%` as `${number}%`,
                          backgroundColor: meta.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressPct, { color: meta.color }]}>{proj.progress}%</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Start Live Meeting CTA */}
        <View style={styles.section}>
          <GlowButton
            label="Start Live Meeting"
            onPress={() => navigation.navigate("EngineRoom", { signalId: null })}
          />
        </View>

        {/* Quick Stats */}
        <View style={[styles.section, styles.statsRow]}>
          {[
            { label: "This Week", value: "6", sub: "meetings" },
            { label: "Live Sites", value: "12", sub: "deployed" },
            { label: "Avg. Build", value: "4m", sub: "per site" },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statSub}>{stat.sub}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: Colors.bg },
  header:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: Space.xl, paddingTop: Space.lg, paddingBottom: Space.xl },
  greeting:      { fontSize: Font.lg, fontWeight: "700", color: Colors.textPrimary },
  agencyRow:     { flexDirection: "row", alignItems: "center", gap: Space.xs, marginTop: 4 },
  agencyLabel:   { fontSize: Font.sm, color: Colors.textSecondary },
  avatar:        { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.accentDim, borderWidth: 1, borderColor: Colors.accentBorder, alignItems: "center", justifyContent: "center" },
  avatarText:    { fontSize: Font.base, fontWeight: "700", color: Colors.accent },
  section:       { paddingHorizontal: Space.xl, marginBottom: Space.xxl },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Space.md },
  sectionTitle:  { fontSize: Font.base, fontWeight: "700", color: Colors.textPrimary, letterSpacing: 0.2 },
  seeAll:        { fontSize: Font.sm, color: Colors.accent },
  badge:         { backgroundColor: Colors.accentDim, paddingHorizontal: Space.sm, paddingVertical: 3, borderRadius: Radius.full },
  badgeText:     { fontSize: Font.xs, fontWeight: "700", color: Colors.accent },
  signalsCard:   { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  signalRow:     { flexDirection: "row", alignItems: "center", padding: Space.lg, gap: Space.md },
  signalBorder:  { borderBottomWidth: 1, borderBottomColor: Colors.border },
  platformIcon:  { width: 36, height: 36, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  signalBody:    { flex: 1 },
  signalTop:     { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  signalSender:  { fontSize: Font.sm, fontWeight: "600", color: Colors.textPrimary },
  signalTime:    { fontSize: Font.xs, color: Colors.textMuted },
  signalMsg:     { fontSize: Font.xs, color: Colors.textSecondary },
  unreadDot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.accent },
  pipeCard:      { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Space.lg },
  pipeTop:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  pipeName:      { fontSize: Font.base, fontWeight: "600", color: Colors.textPrimary },
  pipePlatform:  { fontSize: Font.xs, color: Colors.textMuted, marginBottom: Space.md },
  phasePill:     { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: Space.sm, paddingVertical: 4, borderRadius: Radius.full },
  phaseLabel:    { fontSize: Font.xs, fontWeight: "700" },
  progressTrack: { height: 3, backgroundColor: Colors.surface3, borderRadius: 2, overflow: "hidden" },
  progressFill:  { height: 3, borderRadius: 2 },
  progressPct:   { fontSize: Font.xs, fontWeight: "700", marginTop: 6, textAlign: "right" },
  glowWrap:      { alignItems: "center", justifyContent: "center", height: 64 },
  glowRing:      { position: "absolute", width: "100%", height: 64, borderRadius: Radius.lg, backgroundColor: Colors.accentDim, borderWidth: 1, borderColor: Colors.accentBorder },
  glowBtn:       { flexDirection: "row", alignItems: "center", gap: Space.md, backgroundColor: Colors.accent, paddingHorizontal: Space.xxl, paddingVertical: Space.lg, borderRadius: Radius.lg, width: "100%" },
  glowLabel:     { flex: 1, fontSize: Font.md, fontWeight: "700", color: "#fff", textAlign: "center" },
  statsRow:      { flexDirection: "row", gap: Space.sm },
  statCard:      { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Space.lg, alignItems: "center" },
  statValue:     { fontSize: Font.xl, fontWeight: "800", color: Colors.textPrimary },
  statSub:       { fontSize: Font.xs, color: Colors.textMuted, marginTop: 2 },
  statLabel:     { fontSize: Font.xs, color: Colors.textSecondary, marginTop: 4, textAlign: "center" },
});
