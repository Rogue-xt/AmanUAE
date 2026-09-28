import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { DocumentRecord } from "@/src/context/AppContext";
import { Theme } from "@/constants/Theme";

const URGENCY_COLOR = {
  Expired: Theme.colors.danger,
  Critical: Theme.colors.danger,
  Warning: Theme.colors.warning,
  Safe: Theme.colors.success,
};

type Urgency = keyof typeof URGENCY_COLOR;

type DocumentCardProps = {
  document: DocumentRecord;
  onView?: (doc: DocumentRecord) => void;
  onShare?: (doc: DocumentRecord) => void;
  onDelete?: (doc: DocumentRecord) => void;
  onEdit?: (doc: DocumentRecord) => void;
  onRenew?: (doc: DocumentRecord) => void;
  onLink?: () => void;
  linkedVehicleName?: string;
};

const getDaysRemaining = (expiryDate: string) => {
  const today = new Date();
  const expiry = new Date(`${expiryDate}T00:00:00`);

  today.setHours(0, 0, 0, 0);

  return Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
};

const getUrgency = (days: number): Urgency => {
  if (days < 0) return "Expired";
  if (days <= 30) return "Critical";
  if (days <= 90) return "Warning";
  return "Safe";
};

const formatDocType = (type: DocumentRecord["type"]) => {
  const map: Record<DocumentRecord["type"], string> = {
    EmiratesID: "Emirates ID",
    Mulkiya: "Mulkiya",
    DrivingLicense: "Driving License",
    Passport: "Passport",
    Visa: "Visa",
    Insurance: "Insurance",
    Ejari: "Ejari",
    Other: "Other",
  };

  return map[type];
};

const getDocIconName = (
  type: DocumentRecord["type"],
): React.ComponentProps<typeof FontAwesome6>["name"] => {
  const map: Record<
    DocumentRecord["type"],
    React.ComponentProps<typeof FontAwesome6>["name"]
  > = {
    EmiratesID: "id-card",
    Mulkiya: "car",
    DrivingLicense: "address-card",
    Passport: "passport",
    Visa: "file-contract",
    Insurance: "shield-halved",
    Ejari: "house-lock",
    Other: "file-lines",
  };

  return map[type];
};

const formatFileSize = (size?: number) => {
  if (!size) return "Unknown size";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

function StatusPill({ status }: { status: Urgency }) {
  return (
    <View
      style={[
        styles.statusPill,
        { backgroundColor: `${URGENCY_COLOR[status]}22` },
      ]}
    >
      <View
        style={[styles.statusDot, { backgroundColor: URGENCY_COLOR[status] }]}
      />
      <Text style={[styles.statusText, { color: URGENCY_COLOR[status] }]}>
        {status}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  variant = "default",
  disabled,
}: {
  label: string;
  icon: React.ComponentProps<typeof FontAwesome6>["name"];
  onPress?: () => void;
  variant?: "default" | "primary" | "danger" | "success";
  disabled?: boolean;
}) {
  const iconColor =
    variant === "primary"
      ? Theme.colors.primaryGlow
      : variant === "danger"
        ? Theme.colors.danger
        : variant === "success"
          ? Theme.colors.success
          : Theme.colors.textSecondary;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.actionBtn,
        variant === "primary" && styles.primaryActionBtn,
        variant === "danger" && styles.dangerActionBtn,
        disabled && styles.actionDisabled,
      ]}
    >
      <FontAwesome6 name={icon} size={12} color={iconColor} />
      <Text
        style={[
          styles.actionText,
          variant === "primary" && styles.primaryActionText,
          variant === "danger" && styles.dangerActionText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function DocumentCard({
  document,
  onView,
  onShare,
  onEdit,
  onRenew,
  onDelete,
  onLink,
  linkedVehicleName,
}: DocumentCardProps) {
  const days = getDaysRemaining(document.expiryDate);
  const urgency = getUrgency(days);
  const accentColor = URGENCY_COLOR[urgency];

  return (
    <View style={styles.docCard}>
      <View style={[styles.topAccent, { backgroundColor: accentColor }]} />

      <View style={styles.headerRow}>
        <View style={styles.iconBox}>
          <FontAwesome6
            name={getDocIconName(document.type)}
            size={20}
            color={Theme.colors.primaryGlow}
          />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.docTitle} numberOfLines={3}>
            {document.title}
          </Text>

          <Text style={styles.docType}>{formatDocType(document.type)}</Text>
        </View>

        <StatusPill status={urgency} />
      </View>

      <View style={styles.vehicleChip}>
        <FontAwesome6
          name="car-side"
          size={11}
          color={Theme.colors.primaryGlow}
        />
        <Text style={styles.vehicleChipText} numberOfLines={1}>
          {linkedVehicleName || "Not linked to vehicle"}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <View>
          <Text style={styles.infoLabel}>Expires</Text>
          <Text style={styles.infoValue}>{document.expiryDate}</Text>
        </View>

        <View style={styles.daysBlock}>
          <Text style={[styles.daysValue, { color: accentColor }]}>
            {days < 0 ? Math.abs(days) : days}
          </Text>
          <Text style={styles.daysLabel}>
            {days < 0 ? "days overdue" : "days left"}
          </Text>
        </View>
      </View>

      <View style={styles.fileRow}>
        <View style={styles.fileIconBox}>
          <FontAwesome6
            name="paperclip"
            size={11}
            color={Theme.colors.textMuted}
          />
        </View>

        <Text style={styles.fileText} numberOfLines={1}>
          {document.fileName
            ? `${document.fileName} · ${formatFileSize(document.fileSize)}`
            : "No file attached"}
        </Text>
      </View>

      <View style={styles.actionsWrap}>
        {onView && (
          <ActionButton
            label="View"
            icon="eye"
            // variant="primary"
            disabled={!document.fileUri && !(document as any).fileUrl}
            onPress={() => onView(document)}
          />
        )}

        {onEdit && (
          <ActionButton
            label="Edit"
            icon="pen-to-square"
            onPress={() => onEdit(document)}
          />
        )}

        {onRenew && (
          <ActionButton
            label="Renew"
            icon="rotate"
            variant="success"
            onPress={() => onRenew(document)}
          />
        )}

        {onShare && (
          <ActionButton
            label="Share"
            icon="share-nodes"
            disabled={!document.fileUri && !(document as any).fileUrl}
            onPress={() => onShare(document)}
          />
        )}

        {onLink && <ActionButton label="Link" icon="link" onPress={onLink} />}

        {onDelete && (
          <ActionButton
            label="Delete"
            icon="trash"
            variant="danger"
            onPress={() => onDelete(document)}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  docCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: Theme.colors.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    ...Theme.shadow.card,
  },

  topAccent: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    height: 3,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    opacity: 0.95,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 4,
  },

  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: Theme.colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },

  titleBlock: {
    flex: 1,
    flexShrink: 1, // Forces the container to shrink to fit remaining space
    minWidth: 0, // Crucial bug fix for nested flex text containers in React Native
  },

  docTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0,
    paddingRight: 0, // Keeps the heavy '900' font weight from clipping the last letter
  },

  docType: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    fontWeight: "700",
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Theme.radius.full,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },

  vehicleChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 7,
    marginTop: 14,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },

  vehicleChipText: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    maxWidth: 210,
  },

  divider: {
    height: 1,
    backgroundColor: Theme.colors.borderSubtle,
    marginVertical: 18,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  infoLabel: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 5,
  },

  infoValue: {
    color: Theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "900",
  },

  daysBlock: {
    alignItems: "flex-end",
  },

  daysValue: {
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 30,
  },

  daysLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 3,
  },

  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 18,
    padding: 12,
    borderRadius: 16,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },

  fileIconBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Theme.colors.card,
  },

  fileText: {
    flex: 1,
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },

  actionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 16,
  },

  actionBtn: {
    minWidth: "30%",
    flexGrow: 1,
    height: 42,
    borderRadius: 15,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  primaryActionBtn: {
    backgroundColor: Theme.colors.primaryMuted,
    borderColor: Theme.colors.primaryMuted,
  },

  dangerActionBtn: {
    backgroundColor: Theme.colors.dangerMuted,
    borderColor: Theme.colors.dangerMuted,
  },

  actionDisabled: {
    opacity: 0.35,
  },

  actionText: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "900",
  },

  primaryActionText: {
    color: Theme.colors.primaryGlow,
  },

  dangerActionText: {
    color: Theme.colors.danger,
  },
});
