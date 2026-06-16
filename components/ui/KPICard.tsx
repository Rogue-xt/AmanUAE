import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { Theme } from "@/constants/Theme";

type KPICardProps = {
  label: string;
  value: string | number;
  accent?: string;
  style?: ViewStyle;
};

export function KPICard({ label, value, accent, style }: KPICardProps) {
  return (
    <View style={[styles.card, style]}>
      <Text style={[styles.value, accent ? { color: accent } : null]}>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Theme.colors.elevated,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  value: {
    color: Theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
  },
  label: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: Theme.spacing.xs,
  },
});
