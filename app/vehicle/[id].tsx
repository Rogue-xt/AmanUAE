import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useApp } from "@/src/context/AppContext";
import { Theme } from "@/constants/Theme";
import { formatEmirate } from "@/components/ui/utils";
import { DocumentCard } from "@/components/Documents/DocumentCard";
import { Alert } from "react-native";
import * as Sharing from "expo-sharing";
import { DocumentRecord } from "@/src/context/AppContext";
import { DocumentPreviewModal } from "@/components/Documents/DocumentPreviewModal";
import { DocumentEditModal } from "@/components/Documents/DocumentEditModal";
import { Image } from "expo-image";
import { Stack } from "expo-router";
import { VehicleEditModal } from "@/components/vehicles/VehicleEditModal";
import { DocumentVehicleLinkModal } from "@/components/Documents/DocumentVehicleLinkModal";
const getDaysRemaining = (expiryDate: string) => {
  const today = new Date();
  const expiry = new Date(`${expiryDate}T00:00:00`);

  today.setHours(0, 0, 0, 0);

  return Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
};



export default function VehicleDetailsScreen() {
  const {
    vehicles,
    documents,
    activeTicket,
    updateDocument,
    deleteDocument,
    updateVehicle,
    deleteVehicle,
  } = useApp();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const vehicle = vehicles.find((item) => item.id === id);
  const [isEditVehicleOpen, setIsEditVehicleOpen] = useState(false);
  const [editLabel, setEditLabel] = useState(vehicle?.label || "");
  const [editEmirate, setEditEmirate] = useState(vehicle?.emirate || "Dubai");
  const [editPlateCode, setEditPlateCode] = useState(vehicle?.plateCode || "");
  const [linkingDocument, setLinkingDocument] = useState<DocumentRecord | null>(
    null,
  );
  const [editPlateNumber, setEditPlateNumber] = useState(
    vehicle?.plateNumber || "",
  );
  const [previewDoc, setPreviewDoc] = React.useState<DocumentRecord | null>(
    null,
  );
  const [editingDocument, setEditingDocument] =
    React.useState<DocumentRecord | null>(null);

  const [documentEditMode, setDocumentEditMode] = React.useState<
    "edit" | "renew"
  >("edit");

  const handleEditDocument = (doc: DocumentRecord) => {
    setDocumentEditMode("edit");
    setEditingDocument(doc);
  };

  const handleRenewDocument = (doc: DocumentRecord) => {
    setDocumentEditMode("renew");
    setEditingDocument(doc);
  };
  const handleSaveDocumentEdit = async (
    id: string,
    payload: Partial<Omit<DocumentRecord, "id" | "createdAt">>,
  ) => {
    await updateDocument(id, payload);
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

  const linkedDocuments = useMemo(() => {
    return documents
      .filter((doc) => doc.vehicleId === id)
      .map((doc) => ({
        ...doc,
        daysRemaining: getDaysRemaining(doc.expiryDate),
      }))
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [documents, id]);

  const handleViewDocument = async (doc: DocumentRecord) => {
    if (!doc.fileUri) {
      Alert.alert("No File", "This document has no attached file.");
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
  };

  const handleShareDocument = async (doc: DocumentRecord) => {
    if (!doc.fileUri) {
      Alert.alert("No File", "This document has no attached file.");
      return;
    }

    const available = await Sharing.isAvailableAsync();

    if (!available) {
      Alert.alert("Sharing Unavailable", "Sharing is not available here.");
      return;
    }

    await Sharing.shareAsync(doc.fileUri);
  };
  const handleSaveVehicleEdit = async () => {
    if (!vehicle) return;

    await updateVehicle(vehicle.id, {
      label: editLabel.trim(),
      emirate: editEmirate,
      plateCode: editPlateCode.trim().toUpperCase(),
      plateNumber: editPlateNumber.trim(),
    });

    setIsEditVehicleOpen(false);
  };
  const handleDeleteVehicle = () => {
    if (!vehicle) return;

    Alert.alert("Delete Vehicle", `Delete "${vehicle.label}" permanently?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteVehicle(vehicle.id);
          router.replace("/(tabs)/vehicles");
        },
      },
    ]);
  };

  if (!vehicle) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorTitle}>Vehicle not found</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          {/* <Text style={styles.backButtonText}>Go Back</Text> */}
        </Pressable>
      </View>
    );
  }

  const isActiveParking =
    activeTicket?.vehicleLabel === vehicle.label ||
    activeTicket?.plateDetails ===
      `${vehicle.plateCode} ${vehicle.plateNumber}`;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: vehicle?.label || "Vehicle Details",
        }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroCard}>
          <View style={styles.carVisual}>
            {vehicle.imageUri ? (
              <Image
                source={{ uri: vehicle.imageUri }}
                style={styles.vehicleHeroImage}
                contentFit="cover"
              />
            ) : (
              <FontAwesome6
                name="car-side"
                size={44}
                color={Theme.colors.primaryGlow}
              />
            )}
          </View>

          <Text style={styles.vehicleName}>{vehicle.label}</Text>

          <View style={styles.plateBadge}>
            <Text style={styles.plateCode}>{vehicle.plateCode}</Text>
            <Text style={styles.plateNumber}>{vehicle.plateNumber}</Text>
          </View>

          <Text style={styles.emirate}>{formatEmirate(vehicle.emirate)}</Text>
          <View style={styles.vehicleActionsRow}>
            <Pressable
              style={styles.editVehicleButton}
              onPress={() => {
                setEditLabel(vehicle.label);
                setEditEmirate(vehicle.emirate);
                setEditPlateCode(vehicle.plateCode);
                setEditPlateNumber(vehicle.plateNumber);
                setIsEditVehicleOpen(true);
              }}
            >
              <FontAwesome6
                name="pen"
                size={13}
                color={Theme.colors.primaryGlow}
              />
              <Text style={styles.editVehicleButtonText}>Edit</Text>
            </Pressable>

            <Pressable
              style={styles.deleteVehicleButton}
              onPress={handleDeleteVehicle}
            >
              <FontAwesome6
                name="trash"
                size={13}
                color={Theme.colors.danger}
              />
              <Text style={styles.deleteVehicleButtonText}>Delete</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{linkedDocuments.length}</Text>
            <Text style={styles.statLabel}>Documents</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {linkedDocuments.filter((doc) => doc.daysRemaining <= 30).length}
            </Text>
            <Text style={styles.statLabel}>Alerts</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{isActiveParking ? "ON" : "—"}</Text>
            <Text style={styles.statLabel}>Parking</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Parking Status</Text>

          {isActiveParking && activeTicket ? (
            <View style={styles.parkingBox}>
              <Text style={styles.parkingTitle}>Active Parking Session</Text>
              <Text style={styles.parkingMeta}>
                {activeTicket.parkingEmirate} • {activeTicket.plateDetails}
              </Text>
              <Text style={styles.parkingExpiry}>
                Expires at{" "}
                {new Date(activeTicket.expiryTimestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>
              No active parking for this vehicle.
            </Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Linked Documents</Text>

          {linkedDocuments.length === 0 ? (
            <Text style={styles.emptyText}>
              No documents linked to this vehicle yet.
            </Text>
          ) : (
            linkedDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onView={handleViewDocument}
                onShare={handleShareDocument}
                onEdit={() => handleEditDocument(doc)}
                onRenew={() => handleRenewDocument(doc)}
                onDelete={handleDeleteDocument}
                onLink={() => setLinkingDocument(doc)}
                linkedVehicleName={vehicle.label}
              />
            ))
          )}
          <DocumentPreviewModal
            document={previewDoc}
            onClose={() => setPreviewDoc(null)}
          />
          <DocumentEditModal
            visible={!!editingDocument}
            document={editingDocument}
            mode={documentEditMode}
            onClose={() => setEditingDocument(null)}
            onSave={handleSaveDocumentEdit}
          />
          <DocumentVehicleLinkModal
            visible={!!linkingDocument}
            document={linkingDocument}
            vehicles={vehicles}
            onClose={() => setLinkingDocument(null)}
            onLink={async (docId, vehicleId) => {
              await updateDocument(docId, {
                vehicleId: vehicleId ?? "",
              });

              setLinkingDocument(null);
            }}
          />
          <VehicleEditModal
            visible={isEditVehicleOpen}
            mode="edit"
            vehicle={vehicle}
            onClose={() => setIsEditVehicleOpen(false)}
            onSave={handleSaveVehicleEdit}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollContent: {
    padding: Theme.spacing.lg,
    paddingTop: 56,
    paddingBottom: 40,
  },
  centerState: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: Theme.spacing.lg,
  },
  errorTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: Theme.spacing.md,
  },
  backButton: {
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButtonText: {
    color: Theme.colors.textPrimary,
    fontWeight: "800",
  },
  headerBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: Theme.spacing.md,
  },
  headerBackText: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  heroCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: "center",
    ...Theme.shadow.glow,
  },
  carVisual: {
    width: "100%",
    height: 140,
    borderRadius: Theme.radius.xl,
    backgroundColor: Theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: Theme.spacing.lg,
  },
  glowOrb: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Theme.colors.primaryMuted,
    opacity: 0.8,
  },
  vehicleName: {
    color: Theme.colors.textPrimary,
    fontSize: 26,
    fontWeight: "900",
  },
  plateBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.lg,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: Theme.spacing.md,
  },
  plateCode: {
    color: Theme.colors.primaryGlow,
    fontSize: 14,
    fontWeight: "900",
  },
  plateNumber: {
    color: Theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "900",
  },
  emirate: {
    color: Theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
    marginTop: Theme.spacing.sm,
  },
  statsRow: {
    flexDirection: "row",
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  statValue: {
    color: Theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "900",
  },
  statLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
    textTransform: "uppercase",
  },
  sectionCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginTop: Theme.spacing.md,
  },
  sectionTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: Theme.spacing.md,
  },
  emptyText: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  parkingBox: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
  },
  parkingTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "900",
  },
  parkingMeta: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 5,
  },
  parkingExpiry: {
    color: Theme.colors.primaryGlow,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 8,
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    marginBottom: Theme.spacing.sm,
  },
  docIcon: {
    width: 36,
    height: 36,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Theme.spacing.md,
  },
  docTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "900",
  },
  docMeta: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  docDays: {
    color: Theme.colors.warning,
    fontSize: 13,
    fontWeight: "900",
  },
  docDanger: {
    color: Theme.colors.danger,
  },
  // image
  vehicleHeroImage: {
    width: "100%",
    height: "100%",
  },

  vehicleActionsRow: {
    flexDirection: "row",
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.lg,
  },

  editVehicleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.primaryGlow,
    borderRadius: Theme.radius.lg,
    paddingVertical: 12,
  },

  editVehicleButtonText: {
    color: Theme.colors.primaryGlow,
    fontSize: 13,
    fontWeight: "800",
  },

  deleteVehicleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Theme.colors.dangerMuted,
    borderWidth: 1,
    borderColor: Theme.colors.danger,
    borderRadius: Theme.radius.lg,
    paddingVertical: 12,
  },

  deleteVehicleButtonText: {
    color: Theme.colors.danger,
    fontSize: 13,
    fontWeight: "800",
  },
});
