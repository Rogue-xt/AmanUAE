import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Theme } from "@/constants/Theme";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "success" | "ghost" | "danger";
  icon?: React.ReactNode;
  style?: ViewStyle;
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  variant = "primary",
  icon,
  style,
}: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && styles.primary,
        variant === "success" && styles.success,
        variant === "ghost" && styles.ghost,
        variant === "danger" && styles.danger,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {variant === "primary" && <View style={styles.gradientOverlay} />}
      {/* {icon} */}
      {icon && <View style={{ zIndex: 2, elevation: 2 }}>{icon}</View>}
      <Text
        style={[
          styles.label,
          variant === "ghost" && styles.ghostLabel,
          variant === "danger" && styles.dangerLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Theme.spacing.sm,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xl,
    borderRadius: Theme.radius.lg,
    overflow: "hidden",
    position: "relative",
  },
  primary: {
    backgroundColor: Theme.colors.primary,
    ...Theme.shadow.glow,
  },
  // gradientOverlay: {
  //   ...StyleSheet.absoluteFillObject,
  //   backgroundColor: Theme.colors.primaryGlow,
  //   opacity: 0.25,
  //   borderRadius: Theme.radius.lg,
  // },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Theme.colors.primaryGlow,
    opacity: 0.25,
    borderRadius: Theme.radius.lg,
    zIndex: 0,
  },
  success: {
    backgroundColor: Theme.colors.success,
  },
  ghost: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  danger: {
    backgroundColor: Theme.colors.dangerMuted,
    borderWidth: 1,
    borderColor: Theme.colors.danger,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  // label: {
  //   color: Theme.colors.textPrimary,
  //   fontSize: 15,
  //   fontWeight: "800",
  //   zIndex: 1,
  // },
  label: {
    color: Theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
    zIndex: 2,
    elevation: 2,
  },
  ghostLabel: {
    color: Theme.colors.textSecondary,
  },
  dangerLabel: {
    color: Theme.colors.danger,
  },
});
