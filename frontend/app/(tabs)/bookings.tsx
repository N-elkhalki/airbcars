import React, { useCallback, useState } from "react";
import { View, StyleSheet, FlatList, RefreshControl, Pressable } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { getBookings, updateBookingStatus, LocalBooking } from "@/src/bookingsStore";
import { fetchBookingStatus } from "@/src/api";
import { notifyStatusChange } from "@/src/notify";
import { AppText, Button } from "@/src/components/ui";

const STATUS_COLORS: Record<string, { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { bg: "rgba(180,83,9,0.12)", fg: colors.warning, icon: "time-outline" },
  confirmed: { bg: "rgba(45,106,79,0.12)", fg: colors.success, icon: "checkmark-circle-outline" },
  completed: { bg: "rgba(37,99,235,0.12)", fg: colors.brand, icon: "flag-outline" },
  cancelled: { bg: "rgba(220,38,38,0.12)", fg: colors.error, icon: "close-circle-outline" },
};

export default function BookingsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<LocalBooking[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const refreshStatuses = useCallback(async (list: LocalBooking[]) => {
    const updated = await Promise.all(
      list.map(async (b) => {
        if (!b.reference || !b.pin_code) return b;
        const status = await fetchBookingStatus(b.reference, b.pin_code);
        if (status && status !== b.status) {
          await updateBookingStatus(b.id, status);
          // Alert the client that their reservation status changed.
          notifyStatusChange(
            t("statusUpdated"),
            t("statusUpdatedBody")
              .replace("{ref}", b.reference)
              .replace("{status}", t(status) || status),
          );
          return { ...b, status };
        }
        return b;
      }),
    );
    setBookings(updated);
  }, [t]);

  const loadAndRefresh = useCallback(async () => {
    const list = await getBookings();
    setBookings(list);
    await refreshStatuses(list);
  }, [refreshStatuses]);

  useFocusEffect(
    useCallback(() => {
      loadAndRefresh();
    }, [loadAndRefresh]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAndRefresh();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.titleRow}>
        <AppText size="2xl" weight="bold">
          {t("myBookings")}
        </AppText>
        <Pressable
          testID="manage-reservation-btn"
          onPress={() => router.push("/manage-reservation")}
          style={styles.manageBtn}
        >
          <Ionicons name="add-circle-outline" size={18} color={colors.brand} />
          <AppText size="sm" weight="medium" color={colors.brand}>
            {t("manageReservation")}
          </AppText>
        </Pressable>
      </View>

      {bookings.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="key-outline" size={40} color={colors.brand} />
          </View>
          <AppText color={colors.muted} style={{ marginVertical: spacing.lg, textAlign: "center" }}>
            {t("noBookings")}
          </AppText>
          <Button
            label={t("startExploring")}
            onPress={() => router.push("/cars")}
            testID="explore-cars-btn"
            style={{ paddingHorizontal: spacing["2xl"] }}
          />
          <Pressable
            testID="have-reservation-btn"
            onPress={() => router.push("/manage-reservation")}
            style={{ marginTop: spacing.lg }}
          >
            <AppText weight="medium" color={colors.brand}>
              {t("haveReservation")}
            </AppText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          testID="bookings-list"
          data={bookings}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
          }
          ListHeaderComponent={
            <AppText size="sm" color={colors.muted} style={{ marginBottom: spacing.md }}>
              {t("pullToRefresh")}
            </AppText>
          }
          renderItem={({ item }) => {
            const sc = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
            return (
              <Pressable
                style={styles.card}
                testID={`booking-${item.id}`}
                onPress={() => router.push(`/booking-detail/${item.id}`)}
              >
                <Image source={{ uri: item.car_image }} style={styles.thumb} contentFit="cover" />
                <View style={{ flex: 1, gap: 4 }}>
                  <AppText weight="semibold" size="lg" numberOfLines={1}>
                    {item.car_name}
                  </AppText>
                  <AppText size="sm" color={colors.muted}>
                    {item.pickup_date} → {item.return_date}
                  </AppText>
                  {item.pickup_city ? (
                    <AppText size="sm" color={colors.muted}>
                      <Ionicons name="location-outline" size={12} /> {item.pickup_city}
                    </AppText>
                  ) : null}
                  <View style={styles.cardFooter}>
                    <View style={[styles.badge, { backgroundColor: sc.bg }]} testID={`status-${item.id}`}>
                      <Ionicons name={sc.icon} size={13} color={sc.fg} />
                      <AppText size="sm" weight="medium" color={sc.fg}>
                        {t(item.status) || item.status}
                      </AppText>
                    </View>
                    {item.total_price ? (
                      <AppText weight="bold">{Math.round(item.total_price)} €</AppText>
                    ) : null}
                  </View>
                  <View style={styles.refRow}>
                    <AppText size="sm" color={colors.borderStrong}>
                      {t("reference")}: {item.reference}
                    </AppText>
                    {item.pin_code ? (
                      <AppText size="sm" color={colors.borderStrong}>
                        {t("pinCode")}: {item.pin_code}
                      </AppText>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  title: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  refRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: 2,
  },
});
