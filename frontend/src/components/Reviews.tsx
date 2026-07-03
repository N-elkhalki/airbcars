import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { fetchReviews, Review } from "@/src/api";
import { AppText } from "@/src/components/ui";

function Stars({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= rating ? "star" : "star-outline"}
          size={13}
          color="#F5A623"
        />
      ))}
    </View>
  );
}

export function Reviews() {
  const { t } = useI18n();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [average, setAverage] = useState(5);
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchReviews()
      .then((d) => {
        setReviews(d.reviews);
        setAverage(d.average);
        setCount(d.count);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || reviews.length === 0) return null;

  return (
    <View testID="reviews-section">
      <View style={styles.headerRow}>
        <AppText size="lg" weight="semibold">
          {t("customerReviews")}
        </AppText>
        <View style={styles.ratingPill}>
          <Ionicons name="logo-google" size={14} color={colors.brand} />
          <AppText weight="semibold">{average.toFixed(1)}</AppText>
          <Stars rating={Math.round(average)} />
          <AppText size="sm" color={colors.muted}>
            ({count} {t("basedOnReviews")})
          </AppText>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.lg }}
      >
        {reviews.map((r, i) => (
          <View key={i} style={styles.card} testID={`review-${i}`}>
            <View style={styles.cardHeader}>
              <Image source={{ uri: r.avatar }} style={styles.avatar} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <AppText weight="semibold" numberOfLines={1}>
                  {r.name}
                </AppText>
                <AppText size="sm" color={colors.muted}>
                  {r.date}
                </AppText>
              </View>
            </View>
            <Stars rating={r.rating} />
            <AppText size="sm" color={colors.onSurfaceTertiary} numberOfLines={5} style={{ marginTop: spacing.sm, lineHeight: 20 }}>
              {r.text}
            </AppText>
            <View style={styles.verified}>
              <Ionicons name="checkmark-circle" size={12} color={colors.success} />
              <AppText size="sm" color={colors.muted}>
                {t("verifiedReview")}
              </AppText>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  card: {
    width: 260,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
  },
  verified: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.md,
  },
});
