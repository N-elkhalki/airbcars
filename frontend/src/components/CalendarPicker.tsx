import React, { useState } from "react";
import { View, StyleSheet, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, spacing, radius } from "@/src/theme";
import { AppText } from "@/src/components/ui";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function CalendarPicker({
  visible,
  value,
  minDate,
  onClose,
  onSelect,
  testID,
}: {
  visible: boolean;
  value: Date;
  minDate?: Date;
  onClose: () => void;
  onSelect: (d: Date) => void;
  testID?: string;
}) {
  const [view, setView] = useState(new Date(value.getFullYear(), value.getMonth(), 1));

  React.useEffect(() => {
    if (visible) setView(new Date(value.getFullYear(), value.getMonth(), 1));
  }, [visible, value]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const min = minDate ? startOfDay(minDate) : null;
  const selected = startOfDay(value);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const changeMonth = (delta: number) => {
    Haptics.selectionAsync();
    setView(new Date(year, month + delta, 1));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} testID={`${testID}-backdrop`}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Pressable onPress={() => changeMonth(-1)} style={styles.navBtn} testID="cal-prev">
              <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
            </Pressable>
            <AppText weight="semibold" size="lg">
              {MONTHS[month]} {year}
            </AppText>
            <Pressable onPress={() => changeMonth(1)} style={styles.navBtn} testID="cal-next">
              <Ionicons name="chevron-forward" size={22} color={colors.onSurface} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((w, i) => (
              <View key={i} style={styles.cell}>
                <AppText size="sm" color={colors.muted}>
                  {w}
                </AppText>
              </View>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((d, i) => {
              if (d === null) return <View key={i} style={styles.cell} />;
              const date = startOfDay(new Date(year, month, d));
              const disabled = min ? date < min : false;
              const isSel =
                date.getTime() === selected.getTime();
              return (
                <Pressable
                  key={i}
                  testID={`cal-day-${year}-${month + 1}-${d}`}
                  disabled={disabled}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onSelect(date);
                    onClose();
                  }}
                  style={styles.cell}
                >
                  <View style={[styles.dayInner, isSel && styles.daySelected]}>
                    <AppText
                      color={
                        disabled
                          ? colors.borderStrong
                          : isSel
                            ? colors.onSurfaceInverse
                            : colors.onSurface
                      }
                    >
                      {d}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const CELL = 40;
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
  },
  weekRow: { flexDirection: "row", flexWrap: "wrap" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: `${100 / 7}%`,
    height: CELL,
    alignItems: "center",
    justifyContent: "center",
  },
  dayInner: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  daySelected: { backgroundColor: colors.brand },
});
