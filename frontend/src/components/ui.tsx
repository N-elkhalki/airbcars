import React from "react";
import {
  Text,
  TextProps,
  Pressable,
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, font, fontSize, spacing, radius, shadow } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import type { Car } from "@/src/api";

// ---------- Text ----------
type AppTextProps = TextProps & {
  weight?: "regular" | "medium" | "semibold" | "bold";
  size?: keyof typeof fontSize;
  color?: string;
};

export function AppText({
  weight = "regular",
  size = "base",
  color = colors.onSurface,
  style,
  ...rest
}: AppTextProps) {
  const { isRTL } = useI18n();
  const family = font[weight];
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: family,
          fontSize: fontSize[size],
          color,
          writingDirection: isRTL ? "rtl" : "ltr",
          textAlign: isRTL ? "right" : "left",
        },
        style,
      ]}
    />
  );
}

// ---------- Chip ----------
export function Chip({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={[styles.chip, active && styles.chipActive]}
    >
      <AppText
        weight="medium"
        size="sm"
        color={active ? colors.onSurfaceInverse : colors.onSurfaceTertiary}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

// ---------- Button ----------
export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  style,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "whatsapp" | "outline";
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const bg =
    variant === "primary"
      ? colors.brand
      : variant === "whatsapp"
        ? colors.whatsapp
        : "transparent";
  const fg = variant === "outline" ? colors.onSurface : colors.onSurfaceInverse;
  return (
    <Pressable
      testID={testID}
      disabled={disabled || loading}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      style={[
        styles.button,
        { backgroundColor: bg },
        variant === "outline" && {
          borderWidth: 1,
          borderColor: colors.borderStrong,
        },
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={fg} />}
          <AppText weight="semibold" size="lg" color={fg}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

// ---------- Loading / Error / Empty ----------
export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.brand} />
      {label ? (
        <AppText color={colors.muted} style={{ marginTop: spacing.md }}>
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

export function ErrorState({
  label,
  onRetry,
  retryLabel,
}: {
  label: string;
  onRetry: () => void;
  retryLabel: string;
}) {
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={48} color={colors.muted} />
      <AppText color={colors.muted} style={{ marginVertical: spacing.md }}>
        {label}
      </AppText>
      <Button label={retryLabel} onPress={onRetry} variant="outline" />
    </View>
  );
}

// ---------- Spec pill ----------
export function Spec({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.spec}>
      <Ionicons name={icon} size={14} color={colors.onSurfaceTertiary} />
      <AppText size="sm" color={colors.onSurfaceTertiary}>
        {label}
      </AppText>
    </View>
  );
}

// ---------- Car Card ----------
export function CarCard({
  car,
  onPress,
  compact,
}: {
  car: Car;
  onPress: () => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  return (
    <Pressable
      testID={`car-card-${car.id}`}
      onPress={onPress}
      style={[styles.card, compact && styles.cardCompact]}
    >
      <View style={[styles.cardImageWrap, compact && { height: 130 }]}>
        <Image
          source={{ uri: car.image_url }}
          style={styles.cardImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.catPill}>
          <AppText size="sm" weight="medium" color={colors.onSurfaceInverse}>
            {t(car.category)}
          </AppText>
        </View>
      </View>
      <View style={styles.cardBody}>
        <AppText weight="semibold" size="lg" numberOfLines={1}>
          {car.name}
        </AppText>
        <View style={styles.specRow}>
          <Spec icon="people-outline" label={`${car.seats} ${t("seats")}`} />
          <Spec icon="cog-outline" label={t(car.transmission)} />
          <Spec icon="water-outline" label={t(car.fuel_type)} />
        </View>
        <View style={styles.priceRow}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 2 }}>
            <AppText weight="bold" size="xl">
              {Math.round(parseFloat(car.price))} €
            </AppText>
            <AppText size="sm" color={colors.muted}>
              {t("perDay")}
            </AppText>
          </View>
          <View style={styles.arrowBtn}>
            <Ionicons name="arrow-forward" size={16} color={colors.onSurfaceInverse} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// re-export for convenience
export { Image, LinearGradient, Ionicons, ScrollView };

const styles = StyleSheet.create({
  chip: {
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  button: {
    height: 54,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  spec: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  cardCompact: {
    width: 260,
    marginRight: spacing.lg,
    marginBottom: 0,
  },
  cardImageWrap: {
    height: 180,
    backgroundColor: colors.surfaceTertiary,
  },
  cardImage: { width: "100%", height: "100%" },
  catPill: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  cardBody: { padding: spacing.lg, gap: spacing.md },
  specRow: { flexDirection: "row", gap: spacing.lg, flexWrap: "wrap" },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
});
