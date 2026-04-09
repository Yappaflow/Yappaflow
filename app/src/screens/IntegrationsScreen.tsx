import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
} from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Key, Globe, LogOut, ChevronRight, Eye, EyeOff } from "lucide-react-native";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { logout } from "../store/slices/authSlice";
import { Colors, Radius, Space, Font } from "../design/tokens";

const API_FIELDS: { id: string; label: string; service: string; placeholder: string; color: string }[] = [
  { id: "namecheap",  label: "Namecheap API Key",  service: "Domain registrar", placeholder: "nc_api_xxxxxxxxxx",  color: "#E05C00" },
  { id: "hostinger",  label: "Hostinger API Key",  service: "Hosting provider", placeholder: "hg_tok_xxxxxxxxxx",  color: "#7823DC" },
  { id: "whatsapp",   label: "WhatsApp Token",     service: "Meta Business API",placeholder: "EAAxxxxxxxxxxxxxx",  color: "#25D366" },
  { id: "iyzico",     label: "Iyzico API Key",     service: "Payment gateway",  placeholder: "sandbox-xxxxxxxxxx", color: "#00B4D8" },
];

function ApiKeyInput({
  label,
  service,
  placeholder,
  accentColor,
}: {
  label: string;
  service: string;
  placeholder: string;
  accentColor: string;
}) {
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.apiField, focused && { borderColor: accentColor }]}>
      <View style={styles.apiFieldHeader}>
        <View style={[styles.apiDot, { backgroundColor: accentColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.apiLabel}>{label}</Text>
          <Text style={styles.apiService}>{service}</Text>
        </View>
        {value.length > 0 && (
          <View style={[styles.connectedBadge, { backgroundColor: `${accentColor}18` }]}>
            <Text style={[styles.connectedText, { color: accentColor }]}>Connected</Text>
          </View>
        )}
      </View>
      <View style={styles.apiInputRow}>
        <TextInput
          style={styles.apiInput}
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={!visible}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity onPress={() => setVisible((v) => !v)} style={styles.eyeBtn}>
          {visible
            ? <Eye size={16} color={Colors.textMuted} />
            : <EyeOff size={16} color={Colors.textMuted} />
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function IntegrationsScreen() {
  const insets  = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user    = useAppSelector((s) => s.auth.user);
  const [lang, setLang] = useState<"tr" | "en">("tr");

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Integrations</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{user?.name?.[0]?.toUpperCase() ?? "A"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user?.name ?? "Agency"}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? ""}</Text>
          </View>
          <TouchableOpacity style={styles.editBtn}>
            <ChevronRight size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Language */}
        <Text style={styles.sectionLabel}>Language</Text>
        <View style={styles.langToggle}>
          <TouchableOpacity
            style={[styles.langBtn, lang === "tr" && styles.langBtnActive]}
            onPress={() => setLang("tr")}
          >
            <Text style={[styles.langBtnText, lang === "tr" && styles.langBtnTextActive]}>🇹🇷 Türkçe</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, lang === "en" && styles.langBtnActive]}
            onPress={() => setLang("en")}
          >
            <Text style={[styles.langBtnText, lang === "en" && styles.langBtnTextActive]}>🇺🇸 English</Text>
          </TouchableOpacity>
        </View>

        {/* API Keys */}
        <View style={styles.sectionHeader}>
          <Key size={14} color={Colors.textSecondary} />
          <Text style={styles.sectionLabel}>API Keys</Text>
        </View>

        <View style={styles.apiGroup}>
          {API_FIELDS.map((field) => (
            <ApiKeyInput
              key={field.id}
              label={field.label}
              service={field.service}
              placeholder={field.placeholder}
              accentColor={field.color}
            />
          ))}
        </View>

        {/* Notifications toggle */}
        <Text style={[styles.sectionLabel, { marginTop: Space.xxl }]}>Preferences</Text>
        <View style={styles.prefCard}>
          {[
            { label: "Push Notifications", sub: "New signals & deployments" },
            { label: "Sound Alerts",        sub: "Audio cue on new message" },
            { label: "Auto-Build",          sub: "Start building on intake end" },
          ].map((pref, i, arr) => (
            <View
              key={pref.label}
              style={[styles.prefRow, i < arr.length - 1 && styles.prefBorder]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.prefLabel}>{pref.label}</Text>
                <Text style={styles.prefSub}>{pref.sub}</Text>
              </View>
              <Switch
                value={true}
                thumbColor="#fff"
                trackColor={{ false: Colors.surface3, true: Colors.accent }}
                ios_backgroundColor={Colors.surface3}
              />
            </View>
          ))}
        </View>

        {/* App info */}
        <View style={styles.infoRow}>
          <Globe size={12} color={Colors.textMuted} />
          <Text style={styles.infoText}>Yappaflow v0.1.0 · yappaflow.com</Text>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => dispatch(logout())}>
          <LogOut size={16} color={Colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:              { flex: 1, backgroundColor: Colors.bg },
  header:            { paddingHorizontal: Space.xl, paddingVertical: Space.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle:       { fontSize: Font.xl, fontWeight: "800", color: Colors.textPrimary },
  scroll:            { padding: Space.xl, paddingBottom: 120 },
  profileCard:       { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Space.lg, gap: Space.md, marginBottom: Space.xxl },
  profileAvatar:     { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.accentDim, borderWidth: 1, borderColor: Colors.accentBorder, alignItems: "center", justifyContent: "center" },
  profileAvatarText: { fontSize: Font.lg, fontWeight: "800", color: Colors.accent },
  profileName:       { fontSize: Font.base, fontWeight: "700", color: Colors.textPrimary },
  profileEmail:      { fontSize: Font.xs, color: Colors.textMuted, marginTop: 2 },
  editBtn:           { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surface2, alignItems: "center", justifyContent: "center" },
  sectionLabel:      { fontSize: Font.xs, fontWeight: "700", color: Colors.textSecondary, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: Space.md },
  sectionHeader:     { flexDirection: "row", alignItems: "center", gap: Space.xs },
  langToggle:        { flexDirection: "row", backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: 4, gap: 4, marginBottom: Space.xxl },
  langBtn:           { flex: 1, paddingVertical: Space.md, borderRadius: Radius.md, alignItems: "center" },
  langBtnActive:     { backgroundColor: Colors.surface3 },
  langBtnText:       { fontSize: Font.sm, fontWeight: "600", color: Colors.textMuted },
  langBtnTextActive: { color: Colors.textPrimary },
  apiGroup:          { gap: Space.sm },
  apiField:          { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Space.lg, gap: Space.md },
  apiFieldHeader:    { flexDirection: "row", alignItems: "center", gap: Space.sm },
  apiDot:            { width: 8, height: 8, borderRadius: 4, marginTop: 2 },
  apiLabel:          { fontSize: Font.sm, fontWeight: "600", color: Colors.textPrimary },
  apiService:        { fontSize: Font.xs, color: Colors.textMuted },
  connectedBadge:    { paddingHorizontal: Space.sm, paddingVertical: 3, borderRadius: Radius.full },
  connectedText:     { fontSize: Font.xs, fontWeight: "700" },
  apiInputRow:       { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface2, borderRadius: Radius.md, paddingHorizontal: Space.md, gap: Space.sm },
  apiInput:          { flex: 1, fontSize: Font.sm, color: Colors.textPrimary, paddingVertical: Space.md, fontFamily: "monospace" },
  eyeBtn:            { padding: Space.xs },
  prefCard:          { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  prefRow:           { flexDirection: "row", alignItems: "center", padding: Space.lg, gap: Space.md },
  prefBorder:        { borderBottomWidth: 1, borderBottomColor: Colors.border },
  prefLabel:         { fontSize: Font.sm, fontWeight: "600", color: Colors.textPrimary },
  prefSub:           { fontSize: Font.xs, color: Colors.textMuted, marginTop: 2 },
  infoRow:           { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Space.xs, marginTop: Space.xxl, marginBottom: Space.lg },
  infoText:          { fontSize: Font.xs, color: Colors.textMuted },
  logoutBtn:         { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Space.sm, backgroundColor: "rgba(239,68,68,0.08)", borderRadius: Radius.lg, borderWidth: 1, borderColor: "rgba(239,68,68,0.2)", padding: Space.lg },
  logoutText:        { fontSize: Font.base, fontWeight: "700", color: Colors.error },
});
