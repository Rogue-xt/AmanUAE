import React from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { DocumentRecord } from "@/src/context/AppContext";
import { Theme } from "@/constants/Theme";

type Props = {
  document: DocumentRecord | null;
  onClose: () => void;
};

export function DocumentPreviewModal({ document, onClose }: Props) {
  return (
    <Modal
      visible={!!document}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{document?.title}</Text>
            <Text style={styles.sub}>{document?.fileName}</Text>
          </View>

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>

        {document?.fileUri && (
          <Image
            source={{ uri: document.fileUri }}
            style={styles.image}
            resizeMode="contain"
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
    paddingTop: 54,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    color: Theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  sub: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  closeButton: {
    backgroundColor: Theme.colors.surface,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: Theme.radius.full,
  },
  closeText: {
    color: Theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "900",
  },
  image: {
    flex: 1,
    width: "100%",
    borderRadius: 18,
  },
});
