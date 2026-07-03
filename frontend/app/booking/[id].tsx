import React, { useEffect, useState } from "react";
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
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, shadow, CITIES, WHATSAPP_PHONE } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { fetchCarDetails, CarDetails, createBooking } from "@/src/api";
import { addBooking } from "@/src/bookingsStore";
import { AppText, Button, Loading, Chip } from "@/src/components/ui";

function fmt(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day} 10:00`;
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
    d.setDate(d.getDate() + 4);
    return d;
  });
  const [picker, setPicker] = useState<null | "pickup" | "return">(null);
  const [city, setCity] = useState<string | undefined>();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState<{ ref: string; total: number } | null>(null);

  useEffect(() => {
    fetchCarDetails(id)
      .then((c) => {
        setCar(c);
        setCity(c.available_cities?.[0]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !car) return <Loading />;

  const price = parseFloat(car.price);
  const dayMs = 1000 * 60 * 60 * 24;
  const days = Math.max(1, Math.round((ret.getTime() - pickup.getTime()) / dayMs));
  const total = days * price;
  const cities = car.available_cities?.length ? car.available_cities : CITIES;

  const submit = async () => {
    setErr("");
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setErr(t("fillAllFields"));
      return;
    }
    if (ret <= pickup) {
      setErr(t("selectDates"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await createBooking({
        car_id: car.id,
        car_name: car.name,
        customer_name: name.trim(),
        customer_email: email.trim(),
        customer_phone: phone.trim(),
        pickup_date: fmt(pickup),
        return_date: fmt(ret),
        pickup_city: city,
      });
      const b = res.booking || {};
      const reference = b.booking_reference || `BOOK-${Date.now()}`;
      const totalPrice = b.total_price ? parseFloat(b.total_price) : total;
      await addBooking({
        id: `${Date.now()}`,
        reference,
        car_id: car.id,
        car_name: car.name,
        car_image: car.images?.[0] || car.image_url,
        pickup_date: fmt(pickup),
        return_date: fmt(ret),
        pickup_city: city,
        total_price: totalPrice,
        status: b.status || "pending",
        created_at: new Date().toISOString(),
      });
      setSuccess({ ref: reference, total: totalPrice });
    } catch (e: any) {
      setErr(e.message || t("errorLoad"));
    } finally {
      setSubmitting(false);
    }
  };

  const finishWhatsapp = () => {
    const msg = encodeURIComponent(
      `Bonjour AIRBCARS! Réservation ${success?.ref}\nVoiture: ${car.name}\nDu ${fmt(pickup)} au ${fmt(ret)}\nVille: ${city}\nNom: ${name}\nTotal: ${Math.round(success?.total || total)}€`,
    );
    Linking.openURL(`https://wa.me/${WHATSAPP_PHONE}?text=${msg}`);
  };

  // Success view
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
      {/* Header */}
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
        {/* Car summary */}
        <View style={styles.carRow}>
          <AppText weight="semibold" size="lg">
            {car.name}
          </AppText>
          <AppText color={colors.muted}>
            {Math.round(price)} € {t("perDay")}
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

        {picker && (
          <DateTimePicker
            value={picker === "pickup" ? pickup : ret}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            minimumDate={new Date()}
            onChange={(e, d) => {
              if (Platform.OS !== "ios") setPicker(null);
              if (d) picker === "pickup" ? setPickup(d) : setRet(d);
            }}
          />
        )}
        {Platform.OS === "ios" && picker && (
          <Pressable onPress={() => setPicker(null)} style={styles.doneBtn}>
            <AppText weight="semibold" color={colors.brand}>OK</AppText>
          </Pressable>
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
        <TextInput
          testID="input-name"
          placeholder={t("fullName")}
          placeholderTextColor={colors.muted}
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        <TextInput
          testID="input-email"
          placeholder={t("email")}
          placeholderTextColor={colors.muted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          testID="input-phone"
          placeholder={t("phone")}
          placeholderTextColor={colors.muted}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={styles.input}
        />

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.sumRow}>
            <AppText color={colors.onSurfaceTertiary}>
              {Math.round(price)} € × {days} {days > 1 ? t("days") : t("day")}
            </AppText>
            <AppText weight="medium">{Math.round(price * days)} €</AppText>
          </View>
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

        {err ? (
          <AppText color={colors.error} style={{ marginTop: spacing.md }} testID="booking-error">
            {err}
          </AppText>
        ) : null}
      </ScrollView>

      {/* Sticky confirm */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          label={submitting ? t("processing") : t("confirmBooking")}
          onPress={submit}
          loading={submitting}
          testID="confirm-booking-btn"
        />
      </View>
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
  hBack: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  carRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    fontFamily: "PlusJakartaSans-Regular",
    fontSize: 16,
    color: colors.onSurface,
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
