import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, spacing, radius } from "@/src/theme";
import { AppText } from "@/src/components/ui";
import { COUNTRIES, Country } from "@/src/countries";

export function CountryPicker({
  visible,
  selected,
  onClose,
  onSelect,
}: {
  visible: boolean;
  selected: string;
  onClose: () => void;
  onSelect: (code: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.includes(q),
    );
  }, [query]);

  const renderItem = ({ item }: { item: Country }) => {
    const active = item.code === selected;
    return (
      <Pressable
        testID={`country-${item.code}-${item.name}`}
        onPress={() => {
          Haptics.selectionAsync();
          onSelect(item.code);
          onClose();
        }}
        style={styles.row}
      >
        <AppText size="xl">{item.emoji}</AppText>
        <AppText size="lg" style={{ flex: 1 }}>
          {item.name}
        </AppText>
        <AppText color={colors.muted}>{item.code}</AppText>
        {active ? (
          <Ionicons name="checkmark-circle" size={20} color={colors.brand} />
        ) : null}
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.header}>
          <AppText size="xl" weight="semibold">
            {query ? "" : ""}
            {"Country"}
          </AppText>
          <Pressable onPress={onClose} testID="country-close" style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.onSurface} />
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            testID="country-search"
            placeholder="Search country..."
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            autoCorrect={false}
          />
        </View>

        <FlatList
          data={data}
          keyExtractor={(c) => `${c.code}-${c.name}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </Modal>
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
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  searchInput: {
    flex: 1,
    fontFamily: "PlusJakartaSans-Regular",
    fontSize: 16,
    color: colors.onSurface,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
});
