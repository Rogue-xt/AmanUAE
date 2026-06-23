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
import { Image } from "expo-image";

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
  imageUri?: string;
  imageName?: string;
  onPress?: () => void;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  style?: ViewStyle;
  linkedDocuments?: {
    id: string;
    title: string;
    type: string;
    daysRemaining: number;
  }[];
};

export function PremiumVehicleCard({
  label,
  emirate,
  plateCode,
  plateNumber,
  imageUri,
  imageName,
  vehicleType = "sedan",
  selected = false,
  compact = false,
  onPress,
  onView,
  onDelete,
  onEdit,
  style,
  linkedDocuments,
}: PremiumVehicleCardProps) {
  const iconName = VEHICLE_ICONS[vehicleType];

  const content = (
    <>
      <View style={styles.cardTopRow}>
        <View
          style={[styles.vehicleThumb, selected && styles.vehicleThumbActive]}
        >
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.vehicleThumbImage}
              contentFit="cover"
            />
          ) : (
            <FontAwesome6
              name="car-side"
              size={24}
              color={Theme.colors.primaryGlow}
            />
          )}
        </View>

        <View style={styles.vehicleInfo}>
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
        </View>
      </View>
      {/* <View style={styles.linkedDocsPanel}>
        <Text style={styles.linkedDocsTitle}>
          Linked Documents ({linkedDocuments?.length || 0})
        </Text>

        {!linkedDocuments || linkedDocuments.length === 0 ? (
          <Text style={styles.linkedDocsEmpty}>No linked documents yet</Text>
        ) : (
          linkedDocuments.slice(0, 2).map((doc) => (
            <View key={doc.id} style={styles.linkedDocRow}>
              <Text style={styles.linkedDocName}>{doc.title}</Text>
              <Text
                style={[
                  styles.linkedDocDays,
                  doc.daysRemaining <= 30 && styles.linkedDocDanger,
                ]}
              >
                {doc.daysRemaining < 0
                  ? `${Math.abs(doc.daysRemaining)}d overdue`
                  : `${doc.daysRemaining}d left`}
              </Text>
            </View>
          ))
        )}
      </View> */}

      {!compact && (onView || onDelete) && (
        <View style={styles.actions}>
          {onView && (
            <Pressable style={styles.actionBtn} onPress={onView}>
              <FontAwesome6
                name="eye"
                size={12}
                color={Theme.colors.primaryGlow}
              />
              <Text style={styles.actionText}>View</Text>
            </Pressable>
          )}
          {onEdit && (
            <Pressable style={styles.actionButton} onPress={onEdit}>
              <FontAwesome6
                name="pen"
                size={13}
                color={Theme.colors.primaryGlow}
              />
              <Text style={styles.actionButtonText}>Edit</Text>
            </Pressable>
          )}
          {onDelete && (
            <Pressable
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={onDelete}
            >
              <FontAwesome6
                name="trash"
                size={12}
                color={Theme.colors.danger}
              />
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
 
  cardSelected: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.elevated,
    ...Theme.shadow.glow,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
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
  //linked doc style
  linkedDocsPanel: {
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginTop: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  linkedDocsTitle: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  linkedDocsEmpty: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  linkedDocRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  linkedDocName: {
    color: Theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "800",
    flex: 1,
    marginRight: 8,
  },
  linkedDocDays: {
    color: Theme.colors.warning,
    fontSize: 12,
    fontWeight: "900",
  },
  linkedDocDanger: {
    color: Theme.colors.danger,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
  },

  actionButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: Theme.colors.textPrimary,
  },

  //card new style
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.md,
  },



  vehicleThumbActive: {
    borderColor: Theme.colors.primary,
  },

  vehicleThumbImage: {
    width: "100%",
    height: "100%",
  },

  vehicleInfo: {
    flex: 1,
    minWidth: 0,
  },

  //compact image
  cardCompact: {
    width: 260,
    marginRight: Theme.spacing.md,
    marginBottom: 0,
  },
  vehicleThumb: {
    width: 72,
    height: 72,
    borderRadius: Theme.radius.lg,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Theme.colors.primaryMuted,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    flexShrink: 0,
  },
});
