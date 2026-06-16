import React, { useMemo, useState } from "react";
import {
  Alert,
  // Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  Image,
  Platform,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { DocumentRecord, useApp } from "../../src/context/AppContext";
import * as FileSystem from "expo-file-system/legacy";


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

const getDaysRemaining = (expiryDate: string) => {
  const today = new Date();
  const expiry = new Date(`${expiryDate}T00:00:00`);
  today.setHours(0, 0, 0, 0);

  return Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
};

const getUrgency = (days: number) => {
  if (days < 0) return "Expired";
  if (days <= 30) return "Critical";
  if (days <= 90) return "Warning";
  return "Safe";
};

const formatFileSize = (size?: number) => {
  if (!size) return "Unknown size";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export default function TabTwoScreen() {
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

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.kicker}>ZoneGard Secure Vault</Text>
          <Text style={styles.headerTitle}>Document Expiry Shield</Text>
          <Text style={styles.headerSubtitle}>
            Store critical UAE documents, track expiry, and retrieve them when
            needed.
          </Text>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{documents.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, styles.redText]}>
                {stats.Critical + stats.Expired}
              </Text>
              <Text style={styles.statLabel}>Urgent</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, styles.yellowText]}>
                {stats.Warning}
              </Text>
              <Text style={styles.statLabel}>Warning</Text>
            </View>
          </View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.sectionTitle}>Add New Document</Text>
            <Text style={styles.secureBadge}>LOCAL ONLY</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.typeRibbon}
          >
            {DOCUMENT_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeChip,
                  selectedType === type && styles.typeChipActive,
                ]}
                onPress={() => setSelectedType(type)}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    selectedType === type && styles.typeChipTextActive,
                  ]}
                >
                  {formatDocType(type)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput
            style={styles.inputField}
            placeholder="Document Title"
            placeholderTextColor="#777"
            value={title}
            onChangeText={setTitle}
          />

          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <View>
              <Text style={styles.datePickerLabel}>Expiry Date</Text>
              <Text style={styles.datePickerValue}>
                {expiryDate || "Select expiry date"}
              </Text>
            </View>
            <Text style={styles.datePickerIcon}>📅</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
            />
          )}

          <TouchableOpacity
            style={styles.attachmentBox}
            onPress={handlePickDocument}
          >
            <Text style={styles.attachmentIcon}>📎</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.attachmentTitle}>
                {pickedFile ? pickedFile.name : "Attach PDF or Image"}
              </Text>
              <Text style={styles.attachmentSub}>
                {pickedFile
                  ? formatFileSize(pickedFile.size)
                  : "Mulkiya, Emirates ID, license, visa, insurance"}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleAddDocument}
          >
            <Text style={styles.submitButtonText}>Secure Document</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Vault Items</Text>

        {sortedDocuments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🗂️</Text>
            <Text style={styles.emptyTitle}>No documents secured yet</Text>
            <Text style={styles.emptyText}>
              Add your first expiry tracker with an optional PDF or image
              attachment.
            </Text>
          </View>
        ) : (
          sortedDocuments.map((doc) => {
            const days = getDaysRemaining(doc.expiryDate);
            const urgency = getUrgency(days);

            return (
              <View
                key={doc.id}
                style={[
                  styles.documentCard,
                  urgency === "Expired" && styles.expiredCard,
                  urgency === "Critical" && styles.criticalCard,
                  urgency === "Warning" && styles.warningCard,
                  urgency === "Safe" && styles.safeCard,
                ]}
              >
                <View style={styles.docTopRow}>
                  <View style={styles.docIconBox}>
                    <Text style={styles.docIcon}>
                      {doc.type === "Mulkiya"
                        ? "🚗"
                        : doc.type === "Passport"
                          ? "🛂"
                          : doc.type === "Visa"
                            ? "🧾"
                            : doc.type === "Insurance"
                              ? "🛡️"
                              : "📄"}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.documentTitle}>{doc.title}</Text>
                    <Text style={styles.documentType}>
                      {formatDocType(doc.type)}
                    </Text>
                  </View>

                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>{urgency}</Text>
                  </View>
                </View>

                <View style={styles.expiryPanel}>
                  <Text style={styles.expiryLabel}>Expires</Text>
                  <Text style={styles.expiryDate}>{doc.expiryDate}</Text>
                  <Text style={styles.daysText}>
                    {days < 0
                      ? `${Math.abs(days)} days overdue`
                      : `${days} days remaining`}
                  </Text>
                </View>

                <View style={styles.fileRow}>
                  <Text style={styles.fileText}>
                    {doc.fileName
                      ? `📎 ${doc.fileName} • ${formatFileSize(doc.fileSize)}`
                      : "No file attached"}
                  </Text>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      !doc.fileUri && styles.disabledAction,
                    ]}
                    onPress={() => handleViewDocument(doc)}
                  >
                    <Text style={styles.actionText}>View</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      !doc.fileUri && styles.disabledAction,
                    ]}
                    onPress={() => handleShareDocument(doc)}
                  >
                    <Text style={styles.actionText}>Share</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteDocument(doc.id)}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
      <Modal
        visible={!!previewDoc}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewDoc(null)}
      >
        <View style={styles.previewOverlay}>
          <View style={styles.previewHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.previewTitle}>{previewDoc?.title}</Text>
              <Text style={styles.previewSub}>{previewDoc?.fileName}</Text>
            </View>

            <TouchableOpacity
              style={styles.previewCloseButton}
              onPress={() => setPreviewDoc(null)}
            >
              <Text style={styles.previewCloseText}>Close</Text>
            </TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050506",
    paddingTop: 54,
    paddingHorizontal: 18,
  },
  heroCard: {
    backgroundColor: "#111827",
    borderRadius: 24,
    padding: 22,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  kicker: {
    color: "#30D158",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  headerSubtitle: {
    color: "#A1A1AA",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#27272A",
  },
  statValue: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "900",
  },
  statLabel: {
    color: "#71717A",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
    textTransform: "uppercase",
  },
  redText: {
    color: "#FF453A",
  },
  yellowText: {
    color: "#FFD60A",
  },
  formCard: {
    backgroundColor: "#121214",
    borderRadius: 22,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#262629",
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: "#A1A1AA",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  secureBadge: {
    color: "#30D158",
    fontSize: 10,
    fontWeight: "900",
    backgroundColor: "#102418",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
  },
  typeRibbon: {
    marginBottom: 14,
  },
  typeChip: {
    backgroundColor: "#1C1C1E",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#2C2C2E",
  },
  typeChipActive: {
    backgroundColor: "#0A84FF",
    borderColor: "#0A84FF",
  },
  typeChipText: {
    color: "#A1A1AA",
    fontSize: 13,
    fontWeight: "800",
  },
  typeChipTextActive: {
    color: "#FFF",
  },
  inputField: {
    backgroundColor: "#050506",
    color: "#FFF",
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#27272A",
  },
  attachmentBox: {
    backgroundColor: "#0A0A0A",
    borderRadius: 16,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#2C2C2E",
    borderStyle: "dashed",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  attachmentIcon: {
    fontSize: 24,
  },
  attachmentTitle: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "900",
  },
  attachmentSub: {
    color: "#71717A",
    fontSize: 12,
    marginTop: 3,
  },
  submitButton: {
    backgroundColor: "#30D158",
    borderRadius: 15,
    padding: 15,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "900",
  },
  emptyCard: {
    backgroundColor: "#121214",
    borderRadius: 22,
    padding: 26,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#262629",
    borderStyle: "dashed",
  },
  emptyIcon: {
    fontSize: 34,
    marginBottom: 8,
  },
  emptyTitle: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "900",
  },
  emptyText: {
    color: "#71717A",
    textAlign: "center",
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
  },
  documentCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  safeCard: {
    backgroundColor: "#0D1F15",
    borderColor: "#30D158",
  },
  warningCard: {
    backgroundColor: "#211B08",
    borderColor: "#FFD60A",
  },
  criticalCard: {
    backgroundColor: "#251408",
    borderColor: "#FF9F0A",
  },
  expiredCard: {
    backgroundColor: "#260D0D",
    borderColor: "#FF453A",
  },
  docTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  docIcon: {
    fontSize: 22,
  },
  documentTitle: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "900",
  },
  documentType: {
    color: "#D4D4D8",
    fontSize: 12,
    marginTop: 3,
    fontWeight: "700",
  },
  statusPill: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPillText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  expiryPanel: {
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
  },
  expiryLabel: {
    color: "#A1A1AA",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  expiryDate: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 3,
  },
  daysText: {
    color: "#F4F4F5",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
  },
  fileRow: {
    marginTop: 12,
  },
  fileText: {
    color: "#E5E7EB",
    fontSize: 12,
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 13,
    paddingVertical: 11,
    alignItems: "center",
  },
  disabledAction: {
    opacity: 0.35,
  },
  actionText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "900",
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#1C1C1E",
    borderRadius: 13,
    paddingVertical: 11,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#FF453A",
    fontSize: 13,
    fontWeight: "900",
  },
  //modal
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
    paddingTop: 54,
    paddingHorizontal: 16,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  previewTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
  },
  previewSub: {
    color: "#8E8E93",
    fontSize: 12,
    marginTop: 3,
  },
  previewCloseButton: {
    backgroundColor: "#1C1C1E",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  previewCloseText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "900",
  },
  previewImage: {
    flex: 1,
    width: "100%",
    borderRadius: 18,
  },

  //date styles
  datePickerButton: {
    backgroundColor: "#050506",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#27272A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  datePickerLabel: {
    color: "#71717A",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  datePickerValue: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
  },
  datePickerIcon: {
    fontSize: 22,
  },
});
