import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Theme } from "@/constants/Theme";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  badge?: string | number;
};

export function SectionHeader({ title, subtitle, badge }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {badge !== undefined && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </View>
  );
}

type ScreenHeaderProps = {
  kicker?: string;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
};

export function ScreenHeader({
  kicker,
  title,
  subtitle,
  rightElement,
}: ScreenHeaderProps) {
  return (
    <View style={styles.screenHeader}>
      <View style={styles.screenTextBlock}>
        {kicker && <Text style={styles.kicker}>{kicker}</Text>}
        <Text style={styles.screenTitle}>{title}</Text>
        {subtitle && <Text style={styles.screenSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement}
    </View>
  );
}

export function ScreenContainer({
  children,
}: {
  children: React.ReactNode;
  bottomInset?: number;
}) {
  const insets = useSafeAreaInsets();
  const topInset = insets.top || (Platform.OS === "android" ? 24 : 44);

  return (
    <View style={[styles.screen, { paddingTop: topInset + Theme.spacing.lg }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: Theme.spacing.xl,
  },
  screenTextBlock: {
    flex: 1,
  },
  kicker: {
    ...Theme.typography.label,
    color: Theme.colors.primaryGlow,
    marginBottom: Theme.spacing.sm,
  },
  screenTitle: {
    ...Theme.typography.hero,
    color: Theme.colors.textPrimary,
  },
  screenSubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: Theme.spacing.sm,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Theme.spacing.md,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    ...Theme.typography.label,
    color: Theme.colors.textMuted,
  },
  subtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    backgroundColor: Theme.colors.primaryMuted,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.full,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
  },
  badgeText: {
    color: Theme.colors.primaryGlow,
    fontSize: 12,
    fontWeight: "800",
  },
});
