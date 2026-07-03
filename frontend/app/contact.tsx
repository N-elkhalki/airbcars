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
import { submitContact } from "@/src/api";
import { AppText, Button } from "@/src/components/ui";

export default function ContactScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setErr("");
    if (!name.trim() || !email.trim() || !message.trim()) {
      setErr(t("fillAllFields"));
      return;
    }
    setSending(true);
    try {
      await submitContact({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });
      setSent(true);
    } catch (e: any) {
      setErr(e.message || t("errorLoad"));
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <View style={[styles.container, styles.successWrap, { paddingTop: insets.top }]}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={44} color="#fff" />
        </View>
        <AppText size="2xl" weight="bold" style={{ marginTop: spacing.xl, textAlign: "center" }}>
          {t("messageSent")}
        </AppText>
        <AppText color={colors.muted} style={{ marginTop: spacing.sm, textAlign: "center" }}>
          {t("messageSentDesc")}
        </AppText>
        <View style={{ height: spacing.xl }} />
        <Button label={t("backHome")} onPress={() => router.back()} testID="contact-back-home" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="contact-back-btn" onPress={() => router.back()} style={styles.hBack}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <AppText size="lg" weight="semibold">
          {t("contactUs")}
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppText size="2xl" weight="bold">
          {t("contactTitle")}
        </AppText>
        <AppText color={colors.muted} style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}>
          {t("contactSubtitle")}
        </AppText>

        <TextInput
          testID="contact-name"
          placeholder={t("yourName")}
          placeholderTextColor={colors.muted}
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        <TextInput
          testID="contact-email"
          placeholder={t("yourEmail")}
          placeholderTextColor={colors.muted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          testID="contact-message"
          placeholder={t("yourMessage")}
          placeholderTextColor={colors.muted}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={6}
          style={[styles.input, styles.textarea]}
        />

        {err ? (
          <AppText color={colors.error} style={{ marginBottom: spacing.md }} testID="contact-error">
            {err}
          </AppText>
        ) : null}

        <Button
          label={sending ? t("sending") : t("send")}
          onPress={submit}
          loading={sending}
          icon="send"
          testID="contact-submit-btn"
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
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    fontFamily: "PlusJakartaSans-Regular",
    fontSize: 16,
    color: colors.onSurface,
    backgroundColor: colors.surfaceSecondary,
  },
  textarea: { height: 140, textAlignVertical: "top" },
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
