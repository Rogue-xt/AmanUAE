import React, { useEffect, useState } from "react";
import {
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

  useEffect(() => {
    if (!document) return;

    setTitle(document.title);
    setExpiryDate(document.expiryDate);
    setPickedFile(null);
  }, [document]);

  const handleSave = async () => {
    if (!document) return;

  await onSave(document.id, {
    title: title.trim(),
    expiryDate: expiryDate.trim(),
    ...(pickedFile ?? {}),
  });
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
      const destination = `${FileSystem.documentDirectory}${Date.now()}-${fileName}`;

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
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {mode === "renew" ? "Renew Document" : "Edit Document"}
          </Text>

          <Text style={styles.label}>Document Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Document Title"
            placeholderTextColor={Theme.colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Expiry Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Theme.colors.textMuted}
            value={expiryDate}
            onChangeText={setExpiryDate}
          />
          <Pressable style={styles.fileReplaceBtn} onPress={handleReplaceFile}>
            <Text style={styles.fileReplaceText}>
              {pickedFile?.fileName
                ? `Selected: ${pickedFile.fileName}`
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
});
