import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import {
  colors,
  spacing,
  CITIES,
  CATEGORIES,
  TRANSMISSIONS,
  FUELS,
} from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { fetchCars, Car } from "@/src/api";
import {
  AppText,
  CarCard,
  Chip,
  Loading,
  ErrorState,
} from "@/src/components/ui";
import { ScrollView } from "react-native";

export default function CarsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ city?: string; category?: string }>();

  const [city, setCity] = useState<string | undefined>(params.city);
  const [category, setCategory] = useState<string | undefined>(params.category);
  const [transmission, setTransmission] = useState<string | undefined>();
  const [fuel, setFuel] = useState<string | undefined>();

  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (params.city !== undefined) setCity(params.city);
    if (params.category !== undefined) setCategory(params.category);
  }, [params.city, params.category]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await fetchCars({
        limit: 50,
        city,
        category,
        transmission,
        fuel_type: fuel,
      });
      setCars(res.cars);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [city, category, transmission, fuel]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle =
    (val: string, cur: string | undefined, set: (v?: string) => void) => () =>
      set(cur === val ? undefined : val);

  const clearAll = () => {
    setCity(undefined);
    setCategory(undefined);
    setTransmission(undefined);
    setFuel(undefined);
  };

  const hasFilters = city || category || transmission || fuel;

  return (
    <View style={styles.container}>
      {/* Sticky header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerTop}>
          <AppText size="2xl" weight="bold">
            {t("cars")}
          </AppText>
          {hasFilters ? (
            <Pressable testID="clear-filters-btn" onPress={clearAll} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={16} color={colors.muted} />
              <AppText size="sm" color={colors.muted}>
                {t("clearFilters")}
              </AppText>
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {CITIES.map((c) => (
            <Chip
              key={c}
              label={c}
              active={city === c}
              onPress={toggle(c, city, setCity)}
              testID={`filter-city-${c}`}
            />
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              label={t(c)}
              active={category === c}
              onPress={toggle(c, category, setCategory)}
              testID={`filter-cat-${c}`}
            />
          ))}
          {TRANSMISSIONS.map((c) => (
            <Chip
              key={c}
              label={t(c)}
              active={transmission === c}
              onPress={toggle(c, transmission, setTransmission)}
              testID={`filter-trans-${c}`}
            />
          ))}
          {FUELS.map((c) => (
            <Chip
              key={c}
              label={t(c)}
              active={fuel === c}
              onPress={toggle(c, fuel, setFuel)}
              testID={`filter-fuel-${c}`}
            />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <Loading label={t("loadingCars")} />
      ) : error ? (
        <ErrorState label={t("errorLoad")} onRetry={load} retryLabel={t("retry")} />
      ) : cars.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="car-outline" size={56} color={colors.borderStrong} />
          <AppText color={colors.muted} style={{ marginVertical: spacing.md }}>
            {t("noCars")}
          </AppText>
          {hasFilters ? (
            <Pressable onPress={clearAll}>
              <AppText weight="semibold">{t("clearFilters")}</AppText>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <FlatList
          testID="cars-list"
          data={cars}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <CarCard car={item} onPress={() => router.push(`/car/${item.id}`)} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    backgroundColor: colors.surface,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  chipRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 120,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
});
