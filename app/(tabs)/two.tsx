import React, { useEffect, useMemo, useState } from "react";
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
  TouchableOpacity,
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
import {
  ScreenContainer,
  ScreenHeader,
  SectionHeader,
} from "@/components/ui/ScreenLayout";
import { SegmentedChips } from "@/components/ui/SegmentedChips";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  formatDocType,
  formatFileSize,
  getDaysRemaining,
  getDocIconName,
  getUrgency,
} from "@/components/ui/utils";
import { DocumentCard } from "@/components/Documents/DocumentCard";
import { DocumentEditModal } from "@/components/Documents/DocumentEditModal";

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

const URGENCY_BORDER: Record<ReturnType<typeof getUrgency>, string> = {
  Safe: Theme.colors.success,
  Warning: Theme.colors.warning,
  Critical: Theme.colors.warning,
  Expired: Theme.colors.danger,
};

export default function VaultScreen() {
  const { updateDocument } = useApp();
  const { documents, vehicles, addDocument, deleteDocument } = useApp();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
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

  const [editTitle, setEditTitle] = useState("");
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [documentEditMode, setDocumentEditMode] = useState<"edit" | "renew">(
    "edit",
  );
  
  const [editingDocument, setEditingDocument] = useState<DocumentRecord | null>(
    null,
  );

  const formatDateForStorage = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const handleEditDocument = (doc: DocumentRecord) => {
    setDocumentEditMode("edit");
    setEditingDocument(doc);
    // setEditTitle(doc.title);
    // setEditExpiryDate(doc.expiryDate);
    // setIsEditModalVisible(true);
  };

  const handleRenewDocument = (doc: DocumentRecord) => {
     setDocumentEditMode("edit");
    setEditingDocument(doc);
    // setEditTitle(doc.title);
    // setEditExpiryDate(doc.expiryDate);
    // setIsEditModalVisible(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalVisible(false);
    setEditingDocument(null);
  };

  const handleSaveDocumentEdit = async () => {
    if (!editingDocument) return;

    await updateDocument(editingDocument.id, {
      title: editTitle.trim(),
      expiryDate: editExpiryDate,
    });

    handleCloseEditModal();
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
      vehicleId: selectedVehicleId || undefined,
    });

    setTitle("");
    setExpiryDate("");
    setPickedFile(null);
    setSelectedVehicleId("");

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

  useEffect(() => {
    if (!editingDocument) return;

    setEditTitle(editingDocument.title);
    setEditExpiryDate(editingDocument.expiryDate);
  }, [editingDocument]);
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
              <SectionHeader
                title="Add Document"
                subtitle="Local encrypted storage"
              />
              {/* <View style={styles.secureBadge}>
                <FontAwesome6
                  name="lock"
                  size={10}
                  color={Theme.colors.success}
                />
                <Text style={styles.secureBadgeText}>LOCAL ONLY</Text>
              </View> */}
            </View>
            <Text style={styles.fieldLabel}>Linked Vehicle</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.vehicleLinkRibbon}
            >
              <TouchableOpacity
                style={[
                  styles.vehicleLinkChip,
                  selectedVehicleId === "" && styles.vehicleLinkChipActive,
                ]}
                onPress={() => setSelectedVehicleId("")}
              >
                <Text
                  style={[
                    styles.vehicleLinkText,
                    selectedVehicleId === "" && styles.vehicleLinkTextActive,
                  ]}
                >
                  None
                </Text>
              </TouchableOpacity>

              {vehicles.map((vehicle) => (
                <TouchableOpacity
                  key={vehicle.id}
                  style={[
                    styles.vehicleLinkChip,
                    selectedVehicleId === vehicle.id &&
                      styles.vehicleLinkChipActive,
                  ]}
                  onPress={() => setSelectedVehicleId(vehicle.id)}
                >
                  <Text
                    style={[
                      styles.vehicleLinkText,
                      selectedVehicleId === vehicle.id &&
                        styles.vehicleLinkTextActive,
                    ]}
                  >
                    {vehicle.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

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
            sortedDocuments.map((doc, index) => (
              <FadeInView key={doc.id} delay={280 + index * 40}>
                <DocumentCard
                  document={doc}
                  onView={handleViewDocument}
                  onShare={handleShareDocument}
                  onDelete={handleDeleteDocument}
                  onEdit={handleEditDocument}
                  onRenew={handleRenewDocument}
                />
              </FadeInView>
            ))
          )}
        </FadeInView>
      </ScrollView>

      <DocumentEditModal
        visible={!!editingDocument}
        document={editingDocument}
        mode={documentEditMode}
        onClose={() => setEditingDocument(null)}
        onSave={handleSaveDocumentEdit}
      />
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

  //link vehicle
  fieldLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  vehicleLinkRibbon: {
    marginBottom: 14,
  },
  vehicleLinkChip: {
    backgroundColor: "#15161A",
    borderWidth: 1,
    borderColor: "#2A2D35",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginRight: 8,
  },
  vehicleLinkChipActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#60A5FA",
  },
  vehicleLinkText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
  },
  vehicleLinkTextActive: {
    color: "#F8FAFC",
  },

  // edit modal
  editModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
  },

  editModalCard: {
    backgroundColor: Theme.colors.card,
    borderTopLeftRadius: Theme.radius.xl,
    borderTopRightRadius: Theme.radius.xl,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },

  editModalTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: Theme.spacing.md,
  },

  editInput: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    color: Theme.colors.textPrimary,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    fontSize: 14,
    fontWeight: "700",
  },

  editActions: {
    flexDirection: "row",
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.sm,
  },

  editCancelBtn: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.lg,
    paddingVertical: Theme.spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },

  editSaveBtn: {
    flex: 1,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.lg,
    paddingVertical: Theme.spacing.md,
    alignItems: "center",
  },

  editCancelText: {
    color: Theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: "900",
  },

  editSaveText: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "900",
  },
});
