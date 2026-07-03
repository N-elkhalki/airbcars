import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, shadow, WHATSAPP_PHONE } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { fetchCarDetails, CarDetails } from "@/src/api";
import { AppText, Button, Loading, ErrorState, Spec } from "@/src/components/ui";
import { Reviews } from "@/src/components/Reviews";

const { width } = Dimensions.get("window");

export default function CarDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [car, setCar] = useState<CarDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);

  const load = async () => {
    try {
      setLoading(true);
      setError(false);
      const data = await fetchCarDetails(id);
      setCar(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (loading) return <Loading />;
  if (error || !car)
    return <ErrorState label={t("errorLoad")} onRetry={load} retryLabel={t("retry")} />;

  const images = car.images?.length ? car.images : [car.image_url].filter(Boolean);
  const waMsg = encodeURIComponent(
    `Bonjour AIRBCARS, je suis intéressé par la ${car.name} (${Math.round(parseFloat(car.price))}€/jour).`,
  );

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Carousel */}
        <View style={{ height: 320 }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setImgIndex(Math.round(e.nativeEvent.contentOffset.x / width))
            }
          >
            {images.map((uri, i) => (
              <Image
                key={i}
                source={{ uri: uri as string }}
                style={{ width, height: 320 }}
                contentFit="cover"
              />
            ))}
          </ScrollView>
          <LinearGradient
            colors={["rgba(20,21,20,0.5)", "transparent"]}
            style={styles.topScrim}
            pointerEvents="none"
          />
          <Pressable
            testID="back-btn"
            onPress={() => router.back()}
            style={[styles.backBtn, { top: insets.top + spacing.sm }]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
          </Pressable>
          {images.length > 1 ? (
            <View style={styles.dots}>
              {images.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === imgIndex && styles.dotActive]}
                />
              ))}
            </View>
          ) : null}
        </View>

        {/* Body */}
        <View style={styles.body}>
          <View style={styles.catPill}>
            <AppText size="sm" weight="medium" color={colors.onSurfaceInverse}>
              {t(car.category)}
            </AppText>
          </View>
          <AppText size="2xl" weight="bold" style={{ marginTop: spacing.md }}>
            {car.name}
          </AppText>
          {car.partner_name ? (
            <AppText size="sm" color={colors.muted} style={{ marginTop: 2 }}>
              {car.partner_name}
            </AppText>
          ) : null}

          {/* Specs grid */}
          <AppText size="lg" weight="semibold" style={styles.h}>
            {t("specifications")}
          </AppText>
          <View style={styles.specGrid}>
            <SpecBox icon="people-outline" label={t("seats")} value={car.seats} />
            <SpecBox icon="cog-outline" label={t("transmission")} value={t(car.transmission)} />
            <SpecBox icon="water-outline" label={t("fuel")} value={t(car.fuel_type)} />
            <SpecBox icon="calendar-outline" label={t("year")} value={car.year} />
          </View>

          {/* Available cities */}
          {car.available_cities?.length ? (
            <>
              <AppText size="lg" weight="semibold" style={styles.h}>
                {t("availableCities")}
              </AppText>
              <View style={styles.cityWrap}>
                {car.available_cities.map((c) => (
                  <View key={c} style={styles.cityPill}>
                    <Ionicons name="location" size={13} color={colors.onSurfaceTertiary} />
                    <AppText size="sm" color={colors.onSurfaceTertiary}>
                      {c}
                    </AppText>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {car.description ? (
            <>
              <AppText size="lg" weight="semibold" style={styles.h}>
                {t("description")}
              </AppText>
              <AppText color={colors.onSurfaceTertiary} style={{ lineHeight: 22 }}>
                {car.description}
              </AppText>
            </>
          ) : null}

          <View style={{ marginTop: spacing.xl }}>
            <Reviews />
          </View>
        </View>
      </ScrollView>

      {/* Sticky bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <View>
          <AppText size="sm" color={colors.muted}>
            {t("price")}
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 2 }}>
            <AppText size="2xl" weight="bold">
              {Math.round(parseFloat(car.price))} €
            </AppText>
            <AppText size="sm" color={colors.muted}>
              {t("perDay")}
            </AppText>
          </View>
        </View>
        <View style={styles.ctaRow}>
          <Pressable
            testID="whatsapp-btn"
            onPress={() => Linking.openURL(`https://wa.me/${WHATSAPP_PHONE}?text=${waMsg}`)}
            style={styles.waBtn}
          >
            <Ionicons name="logo-whatsapp" size={24} color="#fff" />
          </Pressable>
          <Button
            label={t("bookNow")}
            onPress={() => router.push(`/booking/${car.id}`)}
            testID="book-now-btn"
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  );
}

function SpecBox({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.specBox}>
      <Ionicons name={icon} size={20} color={colors.brand} />
      <AppText size="sm" color={colors.muted} style={{ marginTop: 6 }}>
        {label}
      </AppText>
      <AppText weight="semibold">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  topScrim: { position: "absolute", top: 0, left: 0, right: 0, height: 120 },
  backBtn: {
    position: "absolute",
    left: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  dots: {
    position: "absolute",
    bottom: spacing.md,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: { backgroundColor: "#fff", width: 18 },
  body: { padding: spacing.xl },
  catPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  h: { marginTop: spacing.xl, marginBottom: spacing.md },
  specGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  specBox: {
    width: (width - spacing.xl * 2 - spacing.md) / 2,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: 2,
  },
  cityWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  cityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...shadow.float,
  },
  ctaRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md },
  waBtn: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.whatsapp,
    alignItems: "center",
    justifyContent: "center",
  },
});
