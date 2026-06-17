import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { DocumentRecord } from "@/src/context/AppContext";
import { Theme } from "@/constants/Theme";

const URGENCY_BORDER = {
  Expired: Theme.colors.danger,
  Critical: Theme.colors.danger,
  Warning: Theme.colors.warning,
  Safe: Theme.colors.success,
};

type Urgency = keyof typeof URGENCY_BORDER;

type DocumentCardProps = {
  document: DocumentRecord;
  onView?: (doc: DocumentRecord) => void;
  onShare?: (doc: DocumentRecord) => void;
  onDelete?: (doc: DocumentRecord) => void;
  onEdit?: (doc: DocumentRecord) => void;
  onRenew?: (doc: DocumentRecord) => void;
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
    <View style={[styles.statusPill, styles[`status${status}`]]}>
      <Text style={styles.statusText}>{status}</Text>
    </View>
  );
}

export function DocumentCard({
  document,
  onView,
  onShare,
  onEdit,
  onRenew,
  onDelete,
}: DocumentCardProps) {
  const days = getDaysRemaining(document.expiryDate);
  const urgency = getUrgency(days);
  const borderColor = URGENCY_BORDER[urgency];

  return (
    <View style={[styles.docCard, { borderLeftColor: borderColor }]}>
      <View style={styles.docTop}>
        <View style={styles.docIconBox}>
          <FontAwesome6
            name={getDocIconName(document.type)}
            size={18}
            color={Theme.colors.primaryGlow}
          />
        </View>

        <View style={styles.docInfo}>
          <Text style={styles.docTitle}>{document.title}</Text>
          <Text style={styles.docType}>{formatDocType(document.type)}</Text>
        </View>

        <StatusPill status={urgency} />
      </View>

      <View style={styles.expiryRow}>
        <View>
          <Text style={styles.expiryLabel}>Expires</Text>
          <Text style={styles.expiryDate}>{document.expiryDate}</Text>
        </View>

        <View style={styles.daysBlock}>
          <Text style={styles.daysValue}>
            {days < 0 ? Math.abs(days) : days}
          </Text>
          <Text style={styles.daysLabel}>
            {days < 0 ? "days overdue" : "days left"}
          </Text>
        </View>
      </View>

      <View style={styles.fileInfo}>
        <FontAwesome6
          name="paperclip"
          size={12}
          color={Theme.colors.textMuted}
        />
        <Text style={styles.fileText}>
          {document.fileName
            ? `${document.fileName} · ${formatFileSize(document.fileSize)}`
            : "No file attached"}
        </Text>
      </View>
      {/* 
      <View style={styles.actions}>
        {onView && (
          <Pressable
            style={[
              styles.actionBtn,
              !document.fileUri && styles.actionDisabled,
            ]}
            onPress={() => onView(document)}
          >
            <FontAwesome6
              name="eye"
              size={12}
              color={Theme.colors.textSecondary}
            />
            <Text style={styles.actionText}>View</Text>
          </Pressable>
        )}

        {onShare && (
          <Pressable
            style={[
              styles.actionBtn,
              !document.fileUri && styles.actionDisabled,
            ]}
            onPress={() => onShare(document)}
          >
            <FontAwesome6
              name="share-nodes"
              size={12}
              color={Theme.colors.textSecondary}
            />
            <Text style={styles.actionText}>Share</Text>
          </Pressable>
        )}
        {onEdit && (
          <Pressable style={styles.actionBtn} onPress={() => onEdit(document)}>
            <FontAwesome6
              name="pen-to-square"
              size={12}
              color={Theme.colors.textSecondary}
            />
            <Text style={styles.actionText}>Edit</Text>
          </Pressable>
        )}

        {onRenew && (
          <Pressable style={styles.actionBtn} onPress={() => onRenew(document)}>
            <FontAwesome6
              name="rotate"
              size={12}
              color={Theme.colors.success}
            />
            <Text style={styles.actionText}>Renew</Text>
          </Pressable>
        )}
        {onDelete && (
          <Pressable
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => onDelete(document)}
          >
            <FontAwesome6 name="trash" size={12} color={Theme.colors.danger} />
            <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
          </Pressable>
        )}
      </View> */}
      <View style={styles.actionsStack}>
        <View style={styles.actionsRow}>
          {onView && (
            <Pressable
              style={[
                styles.actionBtn,
                !document.fileUri && styles.actionDisabled,
              ]}
              onPress={() => onView(document)}
            >
              <FontAwesome6
                name="eye"
                size={12}
                color={Theme.colors.textSecondary}
              />
              <Text style={styles.actionText}>View</Text>
            </Pressable>
          )}

          {onShare && (
            <Pressable
              style={[
                styles.actionBtn,
                !document.fileUri && styles.actionDisabled,
              ]}
              onPress={() => onShare(document)}
            >
              <FontAwesome6
                name="share-nodes"
                size={12}
                color={Theme.colors.textSecondary}
              />
              <Text style={styles.actionText}>Share</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.actionsRow}>
          {onEdit && (
            <Pressable
              style={styles.actionBtn}
              onPress={() => onEdit(document)}
            >
              <FontAwesome6
                name="pen-to-square"
                size={12}
                color={Theme.colors.textSecondary}
              />
              <Text style={styles.actionText}>Edit</Text>
            </Pressable>
          )}

          {onRenew && (
            <Pressable
              style={styles.actionBtn}
              onPress={() => onRenew(document)}
            >
              <FontAwesome6
                name="rotate"
                size={12}
                color={Theme.colors.success}
              />
              <Text style={styles.actionText}>Renew</Text>
            </Pressable>
          )}

          {onDelete && (
            <Pressable
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={() => onDelete(document)}
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  docCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.md,
    ...Theme.shadow.card,
  },
  docTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.md,
  },
  docIconBox: {
    width: 42,
    height: 42,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  docType: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
    fontWeight: "600",
  },
  statusPill: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 5,
    borderRadius: Theme.radius.full,
  },
  statusExpired: {
    backgroundColor: Theme.colors.dangerMuted,
  },
  statusCritical: {
    backgroundColor: Theme.colors.dangerMuted,
  },
  statusWarning: {
    backgroundColor: Theme.colors.warningMuted,
  },
  statusSafe: {
    backgroundColor: Theme.colors.successMuted,
  },
  statusText: {
    color: Theme.colors.textPrimary,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  expiryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
    marginTop: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  expiryLabel: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  expiryDate: {
    color: Theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  daysBlock: {
    alignItems: "flex-end",
  },
  daysValue: {
    color: Theme.colors.primaryGlow,
    fontSize: 22,
    fontWeight: "900",
  },
  daysLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: Theme.spacing.md,
  },
  fileText: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.md,
    paddingVertical: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  actionDisabled: {
    opacity: 0.35,
  },
  deleteBtn: {
    backgroundColor: Theme.colors.dangerMuted,
    borderColor: Theme.colors.dangerMuted,
  },
  actionText: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  deleteText: {
    color: Theme.colors.danger,
  },
  actionsStack: {
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.md,
  },
  actionsRow: {
    flexDirection: "row",
    gap: Theme.spacing.sm,
  },
});
