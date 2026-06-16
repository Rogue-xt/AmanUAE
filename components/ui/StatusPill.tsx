import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Theme } from "@/constants/Theme";
import { UrgencyLevel } from "./utils";

const URGENCY_COLORS: Record<UrgencyLevel, { bg: string; text: string; border: string }> = {
  Safe: {
    bg: Theme.colors.successMuted,
    text: Theme.colors.success,
    border: Theme.colors.success,
  },
  Warning: {
    bg: Theme.colors.warningMuted,
    text: Theme.colors.warning,
    border: Theme.colors.warning,
  },
  Critical: {
    bg: Theme.colors.warningMuted,
    text: Theme.colors.warning,
    border: Theme.colors.warning,
  },
  Expired: {
    bg: Theme.colors.dangerMuted,
    text: Theme.colors.danger,
    border: Theme.colors.danger,
  },
};

type StatusPillProps = {
  status: UrgencyLevel;
};

export function StatusPill({ status }: StatusPillProps) {
  const colors = URGENCY_COLORS[status];
  return (
    <View style={[styles.pill, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.text, { color: colors.text }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 5,
    borderRadius: Theme.radius.full,
    borderWidth: 1,
  },
  text: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
