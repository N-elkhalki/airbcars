import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { lookupBooking } from "@/src/api";
import { getBookings, addBooking } from "@/src/bookingsStore";
import { AppText, Button } from "@/src/components/ui";

export default function ManageReservationScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [reference, setReference] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    if (!reference.trim() || !pin.trim()) {
      setErr(t("fillAllFields"));
      return;
    }
    setLoading(true);
    try {
      const existing = await getBookings();
      if (existing.some((b) => b.reference === reference.trim())) {
        setErr(t("alreadyImported"));
        setLoading(false);
        return;
      }
      const b = await lookupBooking(reference.trim(), pin.trim());
      const id = `${Date.now()}`;
      await addBooking({
        id,
        reference: b.reference,
        pin_code: b.pin_code,
        car_id: b.car_id,
        car_name: b.car_name,
        car_image: b.car_image,
        customer_name: b.customer_name,
        customer_phone: b.customer_phone,
        pickup_date: b.pickup_date,
        return_date: b.return_date,
        pickup_city: b.pickup_city,
        total_price: b.total_price ?? undefined,
        status: b.status || "pending",
        created_at: new Date().toISOString(),
      });
      router.replace(`/booking-detail/${id}`);
    } catch {
      setErr(t("bookingNotFound"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="manage-back-btn" onPress={() => router.back()} style={styles.hBack}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <AppText size="lg" weight="semibold">
          {t("manageReservation")}
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="lock-open-outline" size={34} color={colors.brand} />
        </View>
        <AppText size="2xl" weight="bold" style={{ marginTop: spacing.lg, textAlign: "center" }}>
          {t("manageReservation")}
        </AppText>
        <AppText color={colors.muted} style={{ marginTop: spacing.sm, marginBottom: spacing.xl, textAlign: "center", lineHeight: 22 }}>
          {t("manageSubtitle")}
        </AppText>

        <AppText weight="medium" style={styles.label}>
          {t("bookingReference")}
        </AppText>
        <TextInput
          testID="manage-reference"
          placeholder="ABC123456"
          placeholderTextColor={colors.muted}
          value={reference}
          onChangeText={(v) => setReference(v.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.input}
        />

        <AppText weight="medium" style={styles.label}>
          {t("pinCode")}
        </AppText>
        <TextInput
          testID="manage-pin"
          placeholder="000000"
          placeholderTextColor={colors.muted}
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          style={styles.input}
        />

        {err ? (
          <AppText color={colors.error} style={{ marginTop: spacing.md }} testID="manage-error">
            {err}
          </AppText>
        ) : null}

        <Button
          label={loading ? t("importing") : t("importBooking")}
          onPress={submit}
          loading={loading}
          icon="download-outline"
          testID="manage-submit-btn"
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
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
  iconWrap: {
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  label: { marginTop: spacing.lg, marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    fontFamily: "PlusJakartaSans-Regular",
    fontSize: 16,
    color: colors.onSurface,
    backgroundColor: colors.surfaceSecondary,
    letterSpacing: 1,
  },
});
