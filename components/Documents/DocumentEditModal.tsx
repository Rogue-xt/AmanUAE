import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { DocumentRecord } from "@/src/context/AppContext";
import { Theme } from "@/constants/Theme";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

type Props = {
  visible: boolean;
  document: DocumentRecord | null;
  mode?: "edit" | "renew";
  onClose: () => void;
  onSave: (
    id: string,
    payload: Partial<Omit<DocumentRecord, "id" | "createdAt">>,
  ) => Promise<void>;
};

export function DocumentEditModal({
  visible,
  document,
  mode = "edit",
  onClose,
  onSave,
}: Props) {
  const [title, setTitle] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [pickedFile, setPickedFile] = useState<{
    fileName?: string;
    fileUri?: string;
    mimeType?: string;
    fileSize?: number;
  } | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

useEffect(() => {
  if (!document) return;

  setTitle(document.title);
  setExpiryDate(document.expiryDate);
  setPickedFile(null);

  const existingDate = new Date(document.expiryDate);
  if (!Number.isNaN(existingDate.getTime())) {
    setSelectedDate(existingDate);
  }
}, [document]);


const formatDate = (date: Date) => {
  return date.toISOString().split("T")[0];
};

const handleDateChange = (_event: unknown, date?: Date) => {
  if (Platform.OS !== "ios") {
    setShowDatePicker(false);
  }

  if (!date) return;

  setSelectedDate(date);
  setExpiryDate(formatDate(date));
};
  //handle save
const handleSave = async () => {
  if (!document) return;

  const payload: Partial<Omit<DocumentRecord, "id" | "createdAt">> = {
    expiryDate: expiryDate.trim(),
    ...(pickedFile ?? {}),
  };

  if (mode === "edit") {
    payload.title = title.trim();
  }

  await onSave(document.id, payload);
  onClose();
};


  const handleReplaceFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const asset = result.assets[0];

      const fileName = asset.name;
      // const destination = `${FileSystem.documentDirectory}${Date.now()}-${fileName}`;
const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
const destination = `${FileSystem.documentDirectory}${Date.now()}-${safeFileName}`;
      await FileSystem.copyAsync({
        from: asset.uri,
        to: destination,
      });

      setPickedFile({
        fileName,
        fileUri: destination,
        mimeType: asset.mimeType,
        fileSize: asset.size,
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
      >
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>
              {mode === "renew" ? "Renew Document" : "Edit Document"}
            </Text>

            {mode === "edit" && (
              <>
                <Text style={styles.label}>Document Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Document Title"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={title}
                  onChangeText={setTitle}
                />
              </>
            )}
            <Text style={styles.label}>
              {mode === "renew" ? "New Expiry Date" : "Expiry Date"}
            </Text>
            <Pressable
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <View>
                <Text style={styles.dateMiniLabel}>Selected Date</Text>
                <Text style={styles.dateValue}>
                  {expiryDate || "Select expiry date"}
                </Text>
              </View>
            </Pressable>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
              />
            )}

            <Pressable
              style={styles.fileReplaceBtn}
              onPress={handleReplaceFile}
            >
              <Text style={styles.fileReplaceText}>
                {pickedFile?.fileName
                  ? `Selected: ${pickedFile.fileName}`
                  : mode === "renew"
                    ? "Attach Renewed File"
                    : document?.fileName
                      ? `Current: ${document.fileName} — Tap to replace`
                      : "Attach / Replace File"}
              </Text>
            </Pressable>
            <View style={styles.actions}>
              <Pressable style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>

              <Pressable style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveText}>
                  {mode === "renew" ? "Renew" : "Save"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderTopLeftRadius: Theme.radius.xl,
    borderTopRightRadius: Theme.radius.xl,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  title: {
    color: Theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: Theme.spacing.lg,
  },
  label: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
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
  actions: {
    flexDirection: "row",
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.lg,
    paddingVertical: Theme.spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.lg,
    paddingVertical: Theme.spacing.md,
    alignItems: "center",
  },
  cancelText: {
    color: Theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: "900",
  },
  saveText: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "900",
  },
  fileReplaceBtn: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.lg,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },

  fileReplaceText: {
    color: Theme.colors.primaryGlow,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },

  //DATE PICKER
  dateButton: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },

  dateMiniLabel: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 4,
  },

  dateValue: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
});
