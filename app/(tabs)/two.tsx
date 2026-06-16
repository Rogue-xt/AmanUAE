import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { DocumentRecord, useApp } from "../../src/context/AppContext";
import { Theme } from "@/constants/Theme";
import { FadeInView } from "@/components/ui/FadeInView";
import { KPICard } from "@/components/ui/KPICard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ScreenContainer, ScreenHeader, SectionHeader } from "@/components/ui/ScreenLayout";
import { SegmentedChips } from "@/components/ui/SegmentedChips";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  formatDocType,
  formatFileSize,
  getDaysRemaining,
  getDocIconName,
  getUrgency,
} from "@/components/ui/utils";

const DOCUMENT_TYPES: DocumentRecord["type"][] = [
  "EmiratesID",
  "Mulkiya",
  "DrivingLicense",
  "Passport",
  "Visa",
  "Insurance",
  "Ejari",
  "Other",
];

const URGENCY_BORDER: Record<
  ReturnType<typeof getUrgency>,
  string
> = {
  Safe: Theme.colors.success,
  Warning: Theme.colors.warning,
  Critical: Theme.colors.warning,
  Expired: Theme.colors.danger,
};

export default function VaultScreen() {
  const { documents, addDocument, deleteDocument } = useApp();

  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [selectedType, setSelectedType] =
    useState<DocumentRecord["type"]>("EmiratesID");
  const [title, setTitle] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickedFile, setPickedFile] = useState<{
    name: string;
    uri: string;
    mimeType?: string;
    size?: number;
  } | null>(null);

  const formatDateForStorage = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (!date) return;
    setSelectedDate(date);
    setExpiryDate(formatDateForStorage(date));
  };

  const sortedDocuments = useMemo(() => {
    return [...documents].sort(
      (a, b) => getDaysRemaining(a.expiryDate) - getDaysRemaining(b.expiryDate),
    );
  }, [documents]);

  const stats = useMemo(() => {
    return sortedDocuments.reduce(
      (acc, doc) => {
        const urgency = getUrgency(getDaysRemaining(doc.expiryDate));
        acc[urgency] += 1;
        return acc;
      },
      { Expired: 0, Critical: 0, Warning: 0, Safe: 0 },
    );
  }, [sortedDocuments]);

  const docTypeOptions = DOCUMENT_TYPES.map((type) => ({
    value: type,
    label: formatDocType(type),
  }));

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const safeFileName = `${Date.now()}-${asset.name.replace(/\s+/g, "_")}`;
    const permanentUri = `${FileSystem.documentDirectory}${safeFileName}`;

    await FileSystem.copyAsync({
      from: asset.uri,
      to: permanentUri,
    });

    setPickedFile({
      name: asset.name,
      uri: permanentUri,
      mimeType: asset.mimeType,
      size: asset.size,
    });
  };

  const handleAddDocument = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Enter a document title.");
      return;
    }

    if (!expiryDate.trim()) {
      Alert.alert("Missing Date", "Enter an expiry date in YYYY-MM-DD format.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate.trim())) {
      Alert.alert("Invalid Date", "Use this format: YYYY-MM-DD.");
      return;
    }

    await addDocument({
      type: selectedType,
      title: title.trim(),
      expiryDate: expiryDate.trim(),
      fileName: pickedFile?.name,
      fileUri: pickedFile?.uri,
      mimeType: pickedFile?.mimeType,
      fileSize: pickedFile?.size,
    });

    setTitle("");
    setExpiryDate("");
    setPickedFile(null);

    Alert.alert("Saved", "Document tracker secured in your local vault.");
  };

  const handleViewDocument = async (doc: DocumentRecord) => {
    if (!doc.fileUri) {
      Alert.alert("No File", "This tracker has no attached document.");
      return;
    }

    const isImage =
      doc.mimeType?.startsWith("image/") ||
      doc.fileName?.toLowerCase().endsWith(".jpg") ||
      doc.fileName?.toLowerCase().endsWith(".jpeg") ||
      doc.fileName?.toLowerCase().endsWith(".png");

    if (isImage) {
      setPreviewDoc(doc);
      return;
    }

    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert(
          "Unavailable",
          "Opening files is not available on this device.",
        );
        return;
      }

      await Sharing.shareAsync(doc.fileUri, {
        mimeType: doc.mimeType,
        dialogTitle: "Open document",
      });
    } catch (error) {
      console.error("Failed to open document:", error);
      Alert.alert("Open Failed", "Could not open this document.");
    }
  };

  const handleShareDocument = async (doc: DocumentRecord) => {
    if (!doc.fileUri) {
      Alert.alert("No File", "This tracker has no attached document.");
      return;
    }

    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert("Sharing Unavailable", "Sharing is not available here.");
      return;
    }

    await Sharing.shareAsync(doc.fileUri);
  };

  const handleDeleteDocument = (doc: DocumentRecord) => {
    Alert.alert("Delete Document", `Remove "${doc.title}" from vault?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteDocument(doc.id),
      },
    ]);
  };

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <FadeInView delay={0}>
          <ScreenHeader
            kicker="Secure Document Vault"
            title="Document Shield"
            subtitle="Store critical UAE documents, track expiry, and retrieve when needed."
          />
        </FadeInView>

        <FadeInView delay={80}>
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <FontAwesome6
                name="shield-halved"
                size={24}
                color={Theme.colors.primaryGlow}
              />
            </View>
            <View style={styles.kpiRow}>
              <KPICard label="Total" value={documents.length} />
              <KPICard
                label="Critical"
                value={stats.Critical + stats.Expired}
                accent={Theme.colors.danger}
              />
              <KPICard
                label="Warning"
                value={stats.Warning}
                accent={Theme.colors.warning}
              />
            </View>
          </View>
        </FadeInView>

        <FadeInView delay={160}>
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <SectionHeader title="Add Document" subtitle="Local encrypted storage" />
              <View style={styles.secureBadge}>
                <FontAwesome6 name="lock" size={10} color={Theme.colors.success} />
                <Text style={styles.secureBadgeText}>LOCAL ONLY</Text>
              </View>
            </View>

            <SegmentedChips
              options={docTypeOptions}
              selected={selectedType}
              onSelect={setSelectedType}
              horizontal
            />

            <TextInput
              style={styles.input}
              placeholder="Document title"
              placeholderTextColor={Theme.colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <Pressable
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <View>
                <Text style={styles.dateLabel}>Expiry Date</Text>
                <Text style={styles.dateValue}>
                  {expiryDate || "Select expiry date"}
                </Text>
              </View>
              <FontAwesome6
                name="calendar"
                size={18}
                color={Theme.colors.primaryGlow}
              />
            </Pressable>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
              />
            )}

            <Pressable style={styles.uploadZone} onPress={handlePickDocument}>
              <View style={styles.uploadIcon}>
                <FontAwesome6
                  name="cloud-arrow-up"
                  size={22}
                  color={Theme.colors.primaryGlow}
                />
              </View>
              <View style={styles.uploadText}>
                <Text style={styles.uploadTitle}>
                  {pickedFile ? pickedFile.name : "Secure Upload Zone"}
                </Text>
                <Text style={styles.uploadSub}>
                  {pickedFile
                    ? formatFileSize(pickedFile.size)
                    : "Attach PDF or image — Mulkiya, Emirates ID, visa"}
                </Text>
              </View>
            </Pressable>

            <PrimaryButton
              label="Secure Document"
              onPress={handleAddDocument}
              variant="success"
              icon={
                <FontAwesome6
                  name="shield"
                  size={14}
                  color={Theme.colors.textPrimary}
                />
              }
            />
          </View>
        </FadeInView>

        <FadeInView delay={240}>
          <SectionHeader
            title="Vault Items"
            subtitle={`${sortedDocuments.length} secured record${sortedDocuments.length !== 1 ? "s" : ""}`}
          />

          {sortedDocuments.length === 0 ? (
            <View style={styles.emptyVault}>
              <FontAwesome6
                name="folder-open"
                size={36}
                color={Theme.colors.textMuted}
              />
              <Text style={styles.emptyTitle}>Vault is empty</Text>
              <Text style={styles.emptySub}>
                Add your first expiry tracker with an optional PDF or image
                attachment.
              </Text>
            </View>
          ) : (
            sortedDocuments.map((doc, index) => {
              const days = getDaysRemaining(doc.expiryDate);
              const urgency = getUrgency(days);
              const borderColor = URGENCY_BORDER[urgency];

              return (
                <FadeInView key={doc.id} delay={280 + index * 40}>
                  <View
                    style={[
                      styles.docCard,
                      { borderLeftColor: borderColor },
                    ]}
                  >
                    <View style={styles.docTop}>
                      <View style={styles.docIconBox}>
                        <FontAwesome6
                          name={getDocIconName(doc.type)}
                          size={18}
                          color={Theme.colors.primaryGlow}
                        />
                      </View>
                      <View style={styles.docInfo}>
                        <Text style={styles.docTitle}>{doc.title}</Text>
                        <Text style={styles.docType}>
                          {formatDocType(doc.type)}
                        </Text>
                      </View>
                      <StatusPill status={urgency} />
                    </View>

                    <View style={styles.expiryRow}>
                      <View>
                        <Text style={styles.expiryLabel}>Expires</Text>
                        <Text style={styles.expiryDate}>{doc.expiryDate}</Text>
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
                        {doc.fileName
                          ? `${doc.fileName} · ${formatFileSize(doc.fileSize)}`
                          : "No file attached"}
                      </Text>
                    </View>

                    <View style={styles.actions}>
                      <Pressable
                        style={[
                          styles.actionBtn,
                          !doc.fileUri && styles.actionDisabled,
                        ]}
                        onPress={() => handleViewDocument(doc)}
                      >
                        <FontAwesome6
                          name="eye"
                          size={12}
                          color={Theme.colors.textSecondary}
                        />
                        <Text style={styles.actionText}>View</Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.actionBtn,
                          !doc.fileUri && styles.actionDisabled,
                        ]}
                        onPress={() => handleShareDocument(doc)}
                      >
                        <FontAwesome6
                          name="share-nodes"
                          size={12}
                          color={Theme.colors.textSecondary}
                        />
                        <Text style={styles.actionText}>Share</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.actionBtn, styles.deleteBtn]}
                        onPress={() => handleDeleteDocument(doc)}
                      >
                        <FontAwesome6
                          name="trash"
                          size={12}
                          color={Theme.colors.danger}
                        />
                        <Text style={[styles.actionText, styles.deleteText]}>
                          Delete
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </FadeInView>
              );
            })
          )}
        </FadeInView>
      </ScrollView>

      <Modal
        visible={!!previewDoc}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewDoc(null)}
      >
        <View style={styles.previewOverlay}>
          <View style={styles.previewHeader}>
            <View style={styles.previewHeaderText}>
              <Text style={styles.previewTitle}>{previewDoc?.title}</Text>
              <Text style={styles.previewSub}>{previewDoc?.fileName}</Text>
            </View>
            <PrimaryButton
              label="Close"
              onPress={() => setPreviewDoc(null)}
              variant="ghost"
              style={styles.previewClose}
            />
          </View>
          {previewDoc?.fileUri && (
            <Image
              source={{ uri: previewDoc.fileUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Theme.spacing.xl,
    paddingBottom: 120,
  },
  heroCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xxl,
    padding: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.lg,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Theme.spacing.lg,
  },
  kpiRow: {
    flexDirection: "row",
    gap: Theme.spacing.sm,
  },
  formCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xxl,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.lg,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: Theme.spacing.sm,
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Theme.colors.successMuted,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: Theme.radius.full,
    borderWidth: 1,
    borderColor: Theme.colors.success,
  },
  secureBadgeText: {
    color: Theme.colors.success,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Theme.colors.surface,
    color: Theme.colors.textPrimary,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    fontSize: 15,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  dateLabel: {
    ...Theme.typography.label,
    color: Theme.colors.textMuted,
    marginBottom: 4,
  },
  dateValue: {
    color: Theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  uploadZone: {
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderStyle: "dashed",
  },
  uploadIcon: {
    width: 44,
    height: 44,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadText: {
    flex: 1,
  },
  uploadTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  uploadSub: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },
  emptyVault: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xxl,
    padding: Theme.spacing.xxxl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderStyle: "dashed",
  },
  emptyTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    marginTop: Theme.spacing.md,
  },
  emptySub: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    marginTop: Theme.spacing.sm,
    lineHeight: 19,
  },
  docCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderLeftWidth: 3,
  },
  docTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.md,
  },
  docIconBox: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.elevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  docType: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  expiryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginTop: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  expiryLabel: {
    ...Theme.typography.label,
    color: Theme.colors.textMuted,
  },
  expiryDate: {
    color: Theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  daysBlock: {
    alignItems: "flex-end",
  },
  daysValue: {
    color: Theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
  },
  daysLabel: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: "600",
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.md,
  },
  fileText: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    flex: 1,
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
    backgroundColor: Theme.colors.elevated,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  actionDisabled: {
    opacity: 0.35,
  },
  actionText: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  deleteBtn: {
    borderColor: Theme.colors.dangerMuted,
    backgroundColor: Theme.colors.dangerMuted,
  },
  deleteText: {
    color: Theme.colors.danger,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(9, 9, 11, 0.97)",
    paddingTop: 54,
    paddingHorizontal: Theme.spacing.lg,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Theme.spacing.lg,
    gap: Theme.spacing.md,
  },
  previewHeaderText: {
    flex: 1,
  },
  previewTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  previewSub: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  previewClose: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
  },
  previewImage: {
    flex: 1,
    width: "100%",
    borderRadius: Theme.radius.lg,
  },
});
