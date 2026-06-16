import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Theme } from "@/constants/Theme";

type SegmentedChipsProps<T extends string> = {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
  horizontal?: boolean;
};

export function SegmentedChips<T extends string>({
  options,
  selected,
  onSelect,
  horizontal = false,
}: SegmentedChipsProps<T>) {
  const content = options.map((opt) => {
    const isActive = opt.value === selected;
    return (
      <Pressable
        key={opt.value}
        onPress={() => onSelect(opt.value)}
        style={({ pressed }) => [
          styles.chip,
          horizontal && styles.chipHorizontal,
          isActive && styles.chipActive,
          pressed && styles.chipPressed,
        ]}
      >
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
          {opt.label}
        </Text>
      </Pressable>
    );
  });

  if (horizontal) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalContainer}
      >
        {content}
      </ScrollView>
    );
  }

  return <View style={styles.grid}>{content}</View>;
}

const styles = StyleSheet.create({
  horizontalContainer: {
    gap: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Theme.spacing.sm,
  },
  chip: {
    backgroundColor: Theme.colors.surface,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    minWidth: 72,
    alignItems: "center",
  },
  chipHorizontal: {
    marginRight: 0,
  },
  chipActive: {
    backgroundColor: Theme.colors.primaryMuted,
    borderColor: Theme.colors.primary,
    ...Theme.shadow.glow,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    fontWeight: "700",
  },
  chipTextActive: {
    color: Theme.colors.primaryGlow,
  },
});
