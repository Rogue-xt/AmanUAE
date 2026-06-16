import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Theme, VehicleType } from "@/constants/Theme";
import { formatEmirate } from "./utils";

const VEHICLE_ICONS: Record<
  VehicleType,
  React.ComponentProps<typeof FontAwesome6>["name"]
> = {
  sedan: "car-side",
  suv: "truck-pickup",
  truck: "truck",
  van: "van-shuttle",
};

type PremiumVehicleCardProps = {
  label: string;
  emirate: string;
  plateCode: string;
  plateNumber: string;
  vehicleType?: VehicleType;
  selected?: boolean;
  compact?: boolean;
  onPress?: () => void;
  onView?: () => void;
  onDelete?: () => void;
  style?: ViewStyle;
};

export function PremiumVehicleCard({
  label,
  emirate,
  plateCode,
  plateNumber,
  vehicleType = "sedan",
  selected = false,
  compact = false,
  onPress,
  onView,
  onDelete,
  style,
}: PremiumVehicleCardProps) {
  const iconName = VEHICLE_ICONS[vehicleType];

  const content = (
    <>
      <View style={[styles.illustration, selected && styles.illustrationActive]}>
        <View style={styles.glowOrb} />
        <FontAwesome6
          name={iconName}
          size={compact ? 28 : 42}
          color={selected ? Theme.colors.primaryGlow : Theme.colors.textMuted}
        />
        <View style={styles.uaeAccent} />
      </View>

      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>

      <View style={styles.plateRow}>
        <Text style={styles.plateCode}>{plateCode}</Text>
        <Text style={styles.plateNumber}>{plateNumber}</Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.emirate}>{formatEmirate(emirate)}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Registered</Text>
        </View>
      </View>

      {!compact && (onView || onDelete) && (
        <View style={styles.actions}>
          {onView && (
            <Pressable style={styles.actionBtn} onPress={onView}>
              <FontAwesome6 name="eye" size={12} color={Theme.colors.primaryGlow} />
              <Text style={styles.actionText}>View</Text>
            </Pressable>
          )}
          {onDelete && (
            <Pressable style={[styles.actionBtn, styles.deleteBtn]} onPress={onDelete}>
              <FontAwesome6 name="trash" size={12} color={Theme.colors.danger} />
              <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
            </Pressable>
          )}
        </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          compact && styles.cardCompact,
          selected && styles.cardSelected,
          pressed && styles.cardPressed,
          style,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        selected && styles.cardSelected,
        style,
      ]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.md,
    ...Theme.shadow.card,
  },
  cardCompact: {
    width: 168,
    marginRight: Theme.spacing.md,
    marginBottom: 0,
  },
  cardSelected: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.elevated,
    ...Theme.shadow.glow,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  illustration: {
    height: 88,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Theme.spacing.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  illustrationActive: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primaryMuted,
  },
  glowOrb: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Theme.colors.primaryMuted,
    top: -20,
    right: -10,
  },
  uaeAccent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Theme.colors.primary,
    opacity: 0.6,
  },
  label: {
    color: Theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: Theme.spacing.xs,
  },
  plateRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
  plateCode: {
    color: Theme.colors.primaryGlow,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
  plateNumber: {
    color: Theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  emirate: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  badge: {
    backgroundColor: Theme.colors.successMuted,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: Theme.radius.full,
  },
  badgeText: {
    color: Theme.colors.success,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: "row",
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.borderSubtle,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Theme.colors.surface,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  deleteBtn: {
    borderColor: Theme.colors.dangerMuted,
    backgroundColor: Theme.colors.dangerMuted,
  },
  actionText: {
    color: Theme.colors.primaryGlow,
    fontSize: 12,
    fontWeight: "700",
  },
  deleteText: {
    color: Theme.colors.danger,
  },
});
