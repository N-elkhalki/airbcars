import React, { useCallback, useState } from "react";
import { View, StyleSheet, FlatList, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { getBookings, LocalBooking } from "@/src/bookingsStore";
import { AppText, Button } from "@/src/components/ui";

export default function BookingsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<LocalBooking[]>([]);

  useFocusEffect(
    useCallback(() => {
      getBookings().then(setBookings);
    }, []),
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <AppText size="2xl" weight="bold" style={styles.title}>
        {t("myBookings")}
      </AppText>

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
        </View>
      ) : (
        <FlatList
          testID="bookings-list"
          data={bookings}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <View style={styles.card} testID={`booking-${item.id}`}>
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
                  <View style={styles.badge}>
                    <AppText size="sm" weight="medium" color={colors.warning}>
                      {t(item.status === "confirmed" ? "confirmed" : "pending")}
                    </AppText>
                  </View>
                  {item.total_price ? (
                    <AppText weight="bold">{Math.round(item.total_price)} €</AppText>
                  ) : null}
                </View>
                <AppText size="sm" color={colors.borderStrong}>
                  {t("reference")}: {item.reference}
                </AppText>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  title: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
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
    backgroundColor: "rgba(176,141,87,0.12)",
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
});
