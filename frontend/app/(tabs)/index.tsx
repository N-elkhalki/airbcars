import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, CITIES, CATEGORIES } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { fetchFeaturedCars, Car } from "@/src/api";
import { AppText, CarCard, Chip, Loading, ErrorState } from "@/src/components/ui";
import { Logo } from "@/src/components/Logo";

const HERO =
  "https://images.unsplash.com/photo-1596061343448-3ebc93432ab7?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  economy: "car-outline",
  compact: "car-sport-outline",
  suv: "car-sport",
  luxury: "diamond-outline",
  van: "bus-outline",
};

export default function HomeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const cars = await fetchFeaturedCars();
      setCars(cars);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const goCity = (city: string) =>
    router.push({ pathname: "/cars", params: { city } });
  const goCategory = (cat: string) =>
    router.push({ pathname: "/cars", params: { category: cat } });

  if (loading) return <Loading label={t("loadingCars")} />;
  if (error)
    return (
      <ErrorState label={t("errorLoad")} onRetry={load} retryLabel={t("retry")} />
    );

  return (
    <ScrollView
      testID="home-scroll"
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
    >
      {/* Hero */}
      <View style={styles.hero}>
        <Image source={{ uri: HERO }} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient
          colors={["rgba(20,21,20,0.15)", "rgba(20,21,20,0.85)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.heroContent, { paddingTop: insets.top + spacing.lg }]}>
          <Logo height={30} color="#FFFFFF" />
          <AppText size="3xl" weight="bold" color="#fff" style={{ marginTop: spacing.md }}>
            {t("tagline")}
          </AppText>
          <Pressable
            testID="hero-explore-btn"
            onPress={() => router.push("/cars")}
            style={styles.heroBtn}
          >
            <AppText weight="semibold" color={colors.onSurface}>
              {t("viewAll")}
            </AppText>
            <Ionicons name="arrow-forward" size={16} color={colors.onSurface} />
          </Pressable>
        </View>
      </View>

      {/* Cities */}
      <View style={styles.section}>
        <AppText size="lg" weight="semibold" style={styles.sectionTitle}>
          {t("selectCity")}
        </AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {CITIES.map((c) => (
            <Chip key={c} label={c} onPress={() => goCity(c)} testID={`city-${c}`} />
          ))}
        </ScrollView>
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <AppText size="lg" weight="semibold" style={styles.sectionTitle}>
          {t("categories")}
        </AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              testID={`category-${cat}`}
              onPress={() => goCategory(cat)}
              style={styles.catCard}
            >
              <Ionicons name={CATEGORY_ICONS[cat]} size={26} color={colors.brand} />
              <AppText size="sm" weight="medium" style={{ marginTop: spacing.sm }}>
                {t(cat)}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Featured */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText size="lg" weight="semibold">
            {t("featured")}
          </AppText>
          <Pressable testID="view-all-btn" onPress={() => router.push("/cars")}>
            <AppText size="sm" weight="medium" color={colors.muted}>
              {t("viewAll")}
            </AppText>
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: spacing.lg }}>
          {cars.map((car) => (
            <CarCard
              key={car.id}
              car={car}
              onPress={() => router.push(`/car/${car.id}`)}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  hero: {
    height: 320,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  heroContent: { padding: spacing.xl },
  heroBtn: {
    marginTop: spacing.lg,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#fff",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  section: { marginTop: spacing.xl },
  sectionTitle: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  chipRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  catCard: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
