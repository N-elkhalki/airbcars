import React from "react";
import { View, StyleSheet, Pressable, Linking, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, spacing, radius, WHATSAPP_PHONE } from "@/src/theme";
import { useI18n, Lang } from "@/src/i18n";
import { AppText } from "@/src/components/ui";

const LANGS: { code: Lang; label: string }[] = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
];

function Row({
  icon,
  label,
  value,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.row} disabled={!onPress}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.brand} />
      </View>
      <AppText size="lg" style={{ flex: 1 }}>
        {label}
      </AppText>
      {value ? (
        <AppText color={colors.muted}>{value}</AppText>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.borderStrong} />
      ) : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { t, lang, setLang } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.sm, paddingBottom: 120 }}
    >
      <AppText size="2xl" weight="bold" style={styles.title}>
        {t("settings")}
      </AppText>

      {/* Language */}
      <AppText size="sm" weight="medium" color={colors.muted} style={styles.groupLabel}>
        {t("language").toUpperCase()}
      </AppText>
      <View style={styles.card}>
        {LANGS.map((l, i) => (
          <Pressable
            key={l.code}
            testID={`lang-${l.code}`}
            onPress={() => {
              Haptics.selectionAsync();
              setLang(l.code);
            }}
            style={[styles.langRow, i < LANGS.length - 1 && styles.divider]}
          >
            <AppText size="lg" weight={lang === l.code ? "semibold" : "regular"}>
              {l.label}
            </AppText>
            {lang === l.code ? (
              <Ionicons name="checkmark-circle" size={20} color={colors.brand} />
            ) : null}
          </Pressable>
        ))}
      </View>

      {/* Contact */}
      <AppText size="sm" weight="medium" color={colors.muted} style={styles.groupLabel}>
        {t("contactUs").toUpperCase()}
      </AppText>
      <View style={styles.card}>
        <Row
          icon="logo-whatsapp"
          label="WhatsApp"
          value="+212 644-466676"
          testID="settings-whatsapp"
          onPress={() =>
            Linking.openURL(`https://wa.me/${WHATSAPP_PHONE}`)
          }
        />
        <View style={styles.divider} />
        <Row
          icon="call-outline"
          label={t("callUs")}
          value="+212 644-466676"
          testID="settings-call"
          onPress={() => Linking.openURL(`tel:+${WHATSAPP_PHONE}`)}
        />
        <View style={styles.divider} />
        <Row
          icon="mail-outline"
          label={t("email")}
          value="contact@airbcars.ma"
          testID="settings-email"
          onPress={() => Linking.openURL("mailto:contact@airbcars.ma")}
        />
      </View>

      {/* About */}
      <AppText size="sm" weight="medium" color={colors.muted} style={styles.groupLabel}>
        {t("about").toUpperCase()}
      </AppText>
      <View style={[styles.card, { padding: spacing.lg }]}>
        <AppText color={colors.onSurfaceTertiary} style={{ lineHeight: 22 }}>
          {t("aboutText")}
        </AppText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceSecondary },
  title: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg, color: colors.onSurface },
  groupLabel: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
});
