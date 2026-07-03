import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, shadow, CITIES, WHATSAPP_PHONE } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { fetchCarDetails, fetchCarPrice, createBooking, CarDetails, PriceBreakdown } from "@/src/api";
import { addBooking } from "@/src/bookingsStore";
import { AppText, Button, Loading, Chip } from "@/src/components/ui";
import { CalendarPicker } from "@/src/components/CalendarPicker";
import { CountryPicker } from "@/src/components/CountryPicker";
import { COUNTRIES } from "@/src/countries";

function iso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function label(d: Date) {
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [car, setCar] = useState<CarDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const [pickup, setPickup] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [ret, setRet] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 4); // min 3-day rental
    return d;
  });
  const [picker, setPicker] = useState<null | "pickup" | "return">(null);
  const [countryOpen, setCountryOpen] = useState(false);
  const [city, setCity] = useState<string | undefined>();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [code, setCode] = useState("+212");
  const [whatsapp, setWhatsapp] = useState("");

  const [price, setPrice] = useState<PriceBreakdown | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState<{ ref: string; pin: string; total: number } | null>(null);

  useEffect(() => {
    fetchCarDetails(id)
      .then((c) => {
        setCar(c);
        setCity(c.available_cities?.[0]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const dayMs = 1000 * 60 * 60 * 24;
  const days = Math.max(1, Math.round((ret.getTime() - pickup.getTime()) / dayMs));

  const loadPrice = useCallback(async () => {
    if (!car || ret <= pickup) return;
    try {
      const p = await fetchCarPrice(car.id, iso(pickup), iso(ret));
      setPrice(p);
    } catch {
      setPrice(null);
    }
  }, [car, pickup, ret]);

  useEffect(() => {
    loadPrice();
  }, [loadPrice]);

  if (loading || !car) return <Loading />;

  const dailyBase = parseFloat(car.price);
  const total = price ? price.total_price : dailyBase * days;
  const cities = car.available_cities?.length ? car.available_cities : CITIES;
  const selectedCountry = COUNTRIES.find((c) => c.code === code) || COUNTRIES[0];

  const onPickup = (d: Date) => {
    setPickup(d);
    // enforce min 3-day rental
    const minRet = new Date(d);
    minRet.setDate(minRet.getDate() + 3);
    if (ret < minRet) setRet(minRet);
  };
  const onReturn = (d: Date) => {
    const minRet = new Date(pickup);
    minRet.setDate(minRet.getDate() + 3);
    setRet(d < minRet ? minRet : d);
  };

  const submit = async () => {
    setErr("");
    if (!firstName.trim() || !lastName.trim() || !whatsapp.trim() || !city) {
      setErr(t("fillAllFields"));
      return;
    }
    if (days < 3) {
      setErr(t("minRental"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await createBooking({
        car_id: car.id,
        car_name: car.name,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        country_code: code,
        whatsapp: whatsapp.trim(),
        pickup_date: iso(pickup),
        return_date: iso(ret),
        pickup_city: city,
        payment_method: "cash",
      });
      const reference = res.booking_number || `ABC${Date.now()}`;
      const pin = res.pin_code || "";
      await addBooking({
        id: `${Date.now()}`,
        reference,
        pin_code: pin,
        car_id: car.id,
        car_name: car.name,
        car_image: car.images?.[0] || car.image_url,
        pickup_date: iso(pickup),
        return_date: iso(ret),
        pickup_city: city,
        total_price: total,
        status: "pending",
        created_at: new Date().toISOString(),
      });
      setSuccess({ ref: reference, pin, total });
    } catch (e: any) {
      setErr(e.message || t("errorLoad"));
    } finally {
      setSubmitting(false);
    }
  };

  const finishWhatsapp = () => {
    const msg = encodeURIComponent(
      `Bonjour AIRBCARS! Réservation ${success?.ref} (PIN ${success?.pin})\nVoiture: ${car.name}\nDu ${iso(pickup)} au ${iso(ret)}\nVille: ${city}\nNom: ${firstName} ${lastName}\nTotal: ${Math.round(success?.total || total)}€`,
    );
    Linking.openURL(`https://wa.me/${WHATSAPP_PHONE}?text=${msg}`);
  };

  if (success) {
    return (
      <View style={[styles.container, styles.successWrap, { paddingTop: insets.top }]}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={44} color="#fff" />
        </View>
        <AppText size="2xl" weight="bold" style={{ marginTop: spacing.xl, textAlign: "center" }}>
          {t("bookingConfirmed")}
        </AppText>
        <AppText color={colors.muted} style={{ marginTop: spacing.sm }}>
          {t("reference")}: {success.ref}
        </AppText>
        {success.pin ? (
          <AppText color={colors.muted} style={{ marginTop: 2 }}>
            {t("pinCode")}: {success.pin}
          </AppText>
        ) : null}
        <AppText size="2xl" weight="bold" style={{ marginTop: spacing.lg }}>
          {Math.round(success.total)} €
        </AppText>
        <View style={{ height: spacing["2xl"] }} />
        <Button
          label={t("finishWhatsapp")}
          onPress={finishWhatsapp}
          variant="whatsapp"
          icon="logo-whatsapp"
          testID="finish-whatsapp-btn"
          style={{ alignSelf: "stretch" }}
        />
        <Pressable
          testID="back-home-btn"
          onPress={() => router.replace("/(tabs)/bookings")}
          style={{ marginTop: spacing.lg }}
        >
          <AppText weight="semibold">{t("backHome")}</AppText>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="booking-back-btn" onPress={() => router.back()} style={styles.hBack}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <AppText size="lg" weight="semibold">
          {t("booking")}
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 200 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.carRow}>
          <AppText weight="semibold" size="lg" numberOfLines={1} style={{ flex: 1 }}>
            {car.name}
          </AppText>
          <AppText color={colors.muted}>
            {Math.round(dailyBase)} € {t("perDay")}
          </AppText>
        </View>

        {/* Dates */}
        <AppText weight="medium" style={styles.fieldLabel}>
          {t("pickupDate")}
        </AppText>
        <Pressable testID="pickup-date-btn" style={styles.dateBtn} onPress={() => setPicker("pickup")}>
          <Ionicons name="calendar-outline" size={18} color={colors.brand} />
          <AppText size="lg">{label(pickup)}</AppText>
        </Pressable>

        <AppText weight="medium" style={styles.fieldLabel}>
          {t("returnDate")}
        </AppText>
        <Pressable testID="return-date-btn" style={styles.dateBtn} onPress={() => setPicker("return")}>
          <Ionicons name="calendar-outline" size={18} color={colors.brand} />
          <AppText size="lg">{label(ret)}</AppText>
        </Pressable>
        <AppText size="sm" color={colors.muted} style={{ marginTop: spacing.xs }}>
          {t("minRental")}
        </AppText>

        {picker && (
          <CalendarPicker
            visible={!!picker}
            value={picker === "pickup" ? pickup : ret}
            minDate={picker === "pickup" ? new Date() : (() => { const m = new Date(pickup); m.setDate(m.getDate() + 3); return m; })()}
            onClose={() => setPicker(null)}
            onSelect={(d) => (picker === "pickup" ? onPickup(d) : onReturn(d))}
            testID={`calendar-${picker}`}
          />
        )}

        {/* City */}
        <AppText weight="medium" style={styles.fieldLabel}>
          {t("pickupCity")}
        </AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {cities.map((c) => (
            <Chip key={c} label={c} active={city === c} onPress={() => setCity(c)} testID={`bcity-${c}`} />
          ))}
        </ScrollView>

        {/* Details */}
        <AppText weight="medium" style={styles.fieldLabel}>
          {t("yourDetails")}
        </AppText>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <TextInput
            testID="input-first-name"
            placeholder={t("firstName")}
            placeholderTextColor={colors.muted}
            value={firstName}
            onChangeText={setFirstName}
            style={[styles.input, { flex: 1 }]}
          />
          <TextInput
            testID="input-last-name"
            placeholder={t("lastName")}
            placeholderTextColor={colors.muted}
            value={lastName}
            onChangeText={setLastName}
            style={[styles.input, { flex: 1 }]}
          />
        </View>

        <AppText size="sm" color={colors.muted} style={{ marginBottom: spacing.sm }}>
          <Ionicons name="logo-whatsapp" size={13} color={colors.whatsapp} /> {t("whatsappNumber")}
        </AppText>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Pressable
            testID="country-code-btn"
            onPress={() => setCountryOpen(true)}
            style={styles.codeBtn}
          >
            <AppText size="lg">{selectedCountry?.emoji}</AppText>
            <AppText size="lg" weight="medium">{code}</AppText>
            <Ionicons name="chevron-down" size={16} color={colors.muted} />
          </Pressable>
          <TextInput
            testID="input-whatsapp"
            placeholder="6XX-XXX-XXX"
            placeholderTextColor={colors.muted}
            value={whatsapp}
            onChangeText={setWhatsapp}
            keyboardType="phone-pad"
            style={[styles.input, { flex: 1 }]}
          />
        </View>

        {/* Payment */}
        <AppText weight="medium" style={styles.fieldLabel}>
          {t("paymentMethod")}
        </AppText>
        <View style={styles.payRow}>
          <Ionicons name="cash-outline" size={22} color={colors.success} />
          <View style={{ flex: 1 }}>
            <AppText weight="semibold">{t("cashOnDelivery")}</AppText>
            <AppText size="sm" color={colors.muted}>
              {t("cashDesc")}
            </AppText>
          </View>
          <Ionicons name="checkmark-circle" size={20} color={colors.brand} />
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.sumRow}>
            <AppText color={colors.onSurfaceTertiary}>{t("dailyPrice")}</AppText>
            <AppText weight="medium">
              {Math.round(price?.average_daily_price ?? dailyBase)} €
            </AppText>
          </View>
          <View style={styles.sumRow}>
            <AppText color={colors.onSurfaceTertiary}>
              {t("subtotal")} ({days} {days > 1 ? t("days") : t("day")})
            </AppText>
            <AppText weight="medium">
              {Math.round(price?.base_price_without_supplement ?? dailyBase * days)} €
            </AppText>
          </View>
          {price?.has_short_term_supplement ? (
            <View style={styles.sumRow}>
              <AppText color={colors.warning}>
                {t("shortTermFee")} (+{price.supplement_percentage}%)
              </AppText>
              <AppText weight="medium" color={colors.warning}>
                {Math.round(price.supplement_amount)} €
              </AppText>
            </View>
          ) : null}
          {car.franchise_fee ? (
            <View style={styles.sumRow}>
              <AppText color={colors.onSurfaceTertiary}>{t("franchise")}</AppText>
              <AppText weight="medium">{Math.round(car.franchise_fee)} €</AppText>
            </View>
          ) : null}
          <View style={styles.sumDivider} />
          <View style={styles.sumRow}>
            <AppText size="lg" weight="semibold">
              {t("total")}
            </AppText>
            <AppText size="xl" weight="bold">
              {Math.round(total)} €
            </AppText>
          </View>
        </View>

        {car.franchise_fee ? (
          <AppText size="sm" color={colors.muted} style={{ marginTop: spacing.sm }}>
            {t("franchiseNote")}
          </AppText>
        ) : null}

        {err ? (
          <AppText color={colors.error} style={{ marginTop: spacing.md }} testID="booking-error">
            {err}
          </AppText>
        ) : null}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          label={submitting ? t("processing") : t("confirmBooking")}
          onPress={submit}
          loading={submitting}
          testID="confirm-booking-btn"
        />
      </View>

      <CountryPicker
        visible={countryOpen}
        selected={code}
        onClose={() => setCountryOpen(false)}
        onSelect={setCode}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  hBack: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  carRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderRadius: radius.md,
  },
  fieldLabel: { marginTop: spacing.xl, marginBottom: spacing.sm },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  doneBtn: { alignSelf: "flex-end", padding: spacing.md },
  codeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 54,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    fontFamily: "PlusJakartaSans-Regular",
    fontSize: 16,
    color: colors.onSurface,
  },
  payRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  summary: {
    marginTop: spacing.xl,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  sumRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  sumDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderStrong,
    marginVertical: spacing.sm,
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
  successWrap: { alignItems: "center", justifyContent: "center", padding: spacing.xl },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
});
