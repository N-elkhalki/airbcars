import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, shadow, WHATSAPP_PHONE } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { getBookings, updateBookingStatus, LocalBooking } from "@/src/bookingsStore";
import { fetchBookingStatus } from "@/src/api";
import { AppText, Button, Loading } from "@/src/components/ui";

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "rgba(180,83,9,0.12)", fg: colors.warning },
  confirmed: { bg: "rgba(45,106,79,0.12)", fg: colors.success },
  completed: { bg: "rgba(37,99,235,0.12)", fg: colors.brand },
  cancelled: { bg: "rgba(220,38,38,0.12)", fg: colors.error },
};

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <AppText color={colors.muted}>{label}</AppText>
      <AppText weight="medium" style={{ flexShrink: 1, textAlign: "right" }} numberOfLines={2}>
        {value}
      </AppText>
    </View>
  );
}

function Step({
  icon,
  bg,
  color,
  title,
  desc,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  color: string;
  title: string;
  desc: string;
}) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText weight="semibold">{title}</AppText>
        <AppText size="sm" color={colors.muted} style={{ marginTop: 2, lineHeight: 20 }}>
          {desc}
        </AppText>
      </View>
    </View>
  );
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [booking, setBooking] = useState<LocalBooking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const list = await getBookings();
      let b = list.find((x) => x.id === id) || null;
      setBooking(b);
      setLoading(false);
      // refresh live status
      if (b?.reference && b?.pin_code) {
        const status = await fetchBookingStatus(b.reference, b.pin_code);
        if (status && status !== b.status) {
          await updateBookingStatus(b.id, status);
          setBooking({ ...b, status });
        }
      }
    })();
  }, [id]);

  if (loading) return <Loading />;
  if (!booking) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 40, alignItems: "center" }]}>
        <AppText color={colors.muted}>—</AppText>
      </View>
    );
  }

  const sc = STATUS_COLORS[booking.status] || STATUS_COLORS.pending;
  const waMsg = encodeURIComponent(
    `Bonjour AIRBCARS, ma réservation ${booking.reference} (PIN ${booking.pin_code}) - ${booking.car_name}.`,
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="detail-back-btn" onPress={() => router.back()} style={styles.hBack}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <AppText size="lg" weight="semibold">
          {t("bookingDetails")}
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <View style={styles.heroCard}>
          <Image source={{ uri: booking.car_image }} style={styles.heroImage} contentFit="cover" />
          <View style={styles.heroBody}>
            <AppText weight="semibold" size="lg" numberOfLines={1}>
              {booking.car_name}
            </AppText>
            <View style={[styles.badge, { backgroundColor: sc.bg, marginTop: spacing.sm }]}>
              <AppText size="sm" weight="semibold" color={sc.fg}>
                {t(booking.status) || booking.status}
              </AppText>
            </View>
          </View>
        </View>

        {/* Booking info */}
        <AppText size="lg" weight="semibold" style={styles.sectionTitle}>
          {t("bookingInfo")}
        </AppText>
        <View style={styles.card}>
          <InfoRow label={t("reference")} value={booking.reference} />
          <InfoRow label={t("pinCode")} value={booking.pin_code} />
          <InfoRow label={t("customerName")} value={booking.customer_name} />
          <InfoRow label={t("phoneNumber")} value={booking.customer_phone} />
          <InfoRow label={t("pickupDate")} value={booking.pickup_date} />
          <InfoRow label={t("returnDate")} value={booking.return_date} />
          <InfoRow label={t("pickupCity")} value={booking.pickup_city} />
          {booking.total_price ? (
            <InfoRow label={t("totalAmount")} value={`${Math.round(booking.total_price)} €`} />
          ) : null}
        </View>

        {/* Next steps */}
        <AppText size="lg" weight="semibold" style={styles.sectionTitle}>
          {t("nextSteps")}
        </AppText>
        <View style={[styles.card, { gap: spacing.lg }]}>
          <Step
            icon="chatbubble-ellipses"
            bg="rgba(37,99,235,0.12)"
            color={colors.brand}
            title={t("step1Title")}
            desc={t("step1Desc")}
          />
          <Step
            icon="calendar"
            bg="rgba(45,106,79,0.12)"
            color={colors.success}
            title={t("step2Title")}
            desc={t("step2Desc")}
          />
          <Step
            icon="car-sport"
            bg="rgba(180,83,9,0.12)"
            color={colors.warning}
            title={t("step3Title")}
            desc={t("step3Desc")}
          />
        </View>
      </ScrollView>

      {/* Sticky WhatsApp CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          label={t("contactWhatsapp")}
          onPress={() => Linking.openURL(`https://wa.me/${WHATSAPP_PHONE}?text=${waMsg}`)}
          variant="whatsapp"
          icon="logo-whatsapp"
          testID="detail-whatsapp-btn"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  hBack: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  heroImage: { width: "100%", height: 170, backgroundColor: colors.surfaceTertiary },
  heroBody: { padding: spacing.lg },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.md, color: colors.onSurface },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  step: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...shadow.float,
  },
});
