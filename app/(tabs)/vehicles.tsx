import React, {  useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useRouter } from "expo-router";
import { Theme } from "@/constants/Theme";
import { useApp, VehicleProfile } from "@/src/context/AppContext";
import { FadeInView } from "@/components/ui/FadeInView";
import { KPICard } from "@/components/ui/KPICard";
import { PremiumVehicleCard } from "@/components/ui/PremiumVehicleCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import {
  ScreenContainer,
  ScreenHeader,
  SectionHeader,
} from "@/components/ui/ScreenLayout";

import { getDaysRemaining } from "@/components/ui/utils";
import { VehicleEditModal } from "@/components/vehicles/VehicleEditModal";

export default function VehiclesScreen() {
  const router = useRouter();
  const { vehicles, documents, addVehicle, updateVehicle, deleteVehicle } =
    useApp();
const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [vehicleMode, setVehicleMode] = useState<"add" | "edit">("add");

  const [editingVehicle, setEditingVehicle] = useState<VehicleProfile | null>(
    null,
  );

  const handleSaveVehicle = async (payload: Omit<VehicleProfile, "id">) => {
    if (vehicleMode === "edit" && editingVehicle) {
      await updateVehicle(editingVehicle.id, payload);
    } else {
      await addVehicle(payload);
    }

    setEditingVehicle(null);
    setVehicleMode("add");
    setIsAddVehicleOpen(false);
  };

const openAddVehicle = () => {
  setVehicleMode("add");
  setEditingVehicle(null);
  setIsAddVehicleOpen(true);
};

const openEditVehicle = (vehicle: VehicleProfile) => {
  setVehicleMode("edit");
  setEditingVehicle(vehicle);
  setIsAddVehicleOpen(true);
};
const handleDeleteVehicle = (vehicle: VehicleProfile) => {
  Alert.alert(
    "Delete Vehicle",
    `Are you sure you want to delete "${vehicle.label}"?`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteVehicle(vehicle.id);
        },
      },
    ],
  );
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
            // kicker="Vehicle Profiles"
            title="My Vehicles"
            // subtitle="Manage UAE plate profiles and linked compliance documents."
          />
        </FadeInView>

        <FadeInView delay={80}>
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <FontAwesome6
                name="car-side"
                size={24}
                color={Theme.colors.primaryGlow}
              />
            </View>

            <View style={styles.kpiRow}>
              <KPICard label="Vehicles" value={vehicles.length} />
              <KPICard
                label="Linked Docs"
                value={documents.filter((d) => d.vehicleId).length}
              />
              <KPICard
                label="Unlinked"
                value={documents.filter((d) => !d.vehicleId).length}
                accent={Theme.colors.warning}
              />
            </View>
          </View>
        </FadeInView>

        <FadeInView delay={160}>
          <SectionHeader
            title="Saved Vehicles"
            subtitle={`${vehicles.length} vehicle profile${vehicles.length !== 1 ? "s" : ""}`}
          />

          {vehicles.length === 0 ? (
            <View style={styles.emptyCard}>
              <FontAwesome6
                name="car-burst"
                size={36}
                color={Theme.colors.textMuted}
              />
              <Text style={styles.emptyTitle}>No vehicles yet</Text>
              <Text style={styles.emptySub}>
                Add your first vehicle to generate parking SMS faster.
              </Text>

              <PrimaryButton
                label="Add First Vehicle"
                onPress={openAddVehicle}
                icon={
                  <FontAwesome6
                    name="plus"
                    size={14}
                    color={Theme.colors.textPrimary}
                  />
                }
              />
            </View>
          ) : (
            vehicles.map((vehicle, index) => {
              const linkedDocuments = documents
                .filter((doc) => doc.vehicleId === vehicle.id)
                .map((doc) => ({
                  id: doc.id,
                  title: doc.title,
                  type: doc.type,
                  daysRemaining: getDaysRemaining(doc.expiryDate),
                }));

              return (
                <FadeInView key={vehicle.id} delay={200 + index * 50}>
                  <PremiumVehicleCard
                    key={vehicle.id}
                    imageUri={vehicle.imageUri}
                    imageName={vehicle.imageName}
                    label={vehicle.label}
                    emirate={vehicle.emirate}
                    plateCode={vehicle.plateCode}
                    plateNumber={vehicle.plateNumber}
                    linkedDocuments={linkedDocuments}
                    onView={() => router.push(`/vehicle/${vehicle.id}`)}
                    onDelete={() => handleDeleteVehicle(vehicle)}
                    onEdit={() => openEditVehicle(vehicle)}
                  />
                </FadeInView>
              );
            })
          )}
        </FadeInView>
      </ScrollView>

      <VehicleEditModal
        visible={isAddVehicleOpen}
        mode={vehicleMode}
        vehicle={editingVehicle}
        onClose={() => {
          setIsAddVehicleOpen(false);
          setEditingVehicle(null);
          setVehicleMode("add");
        }}
        onSave={handleSaveVehicle}
      />

      {!isAddVehicleOpen && (
        <Pressable style={styles.fab} onPress={openAddVehicle}>
          <FontAwesome6
            name="plus"
            size={18}
            color={Theme.colors.textPrimary}
          />
        </Pressable>
      )}
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

  emptyCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xxl,
    padding: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: "center",
    gap: Theme.spacing.md,
  },

  emptyTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },

  emptySub: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },

  addModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
  },

  addModalCard: {
    maxHeight: "88%",
    backgroundColor: Theme.colors.background,
    borderTopLeftRadius: Theme.radius.xl,
    borderTopRightRadius: Theme.radius.xl,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },

  sheetHandle: {
    width: 50,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#404040",
    alignSelf: "center",
    marginBottom: 20,
  },

  formHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 20,
  },

  modalHeaderText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: Theme.colors.textPrimary,
  },

  modalSubtitle: {
    fontSize: 13,
    marginTop: 4,
    color: Theme.colors.textSecondary,
  },

  closeCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    flexShrink: 0,
  },

  fieldLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: Theme.spacing.sm,
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

  plateRow: {
    flexDirection: "row",
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.md,
  },

  plateCodeInput: {
    flex: 0.35,
  },

  plateNumberInput: {
    flex: 0.65,
  },

  fab: {
    position: "absolute",
    right: 22,
    bottom: 88,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Theme.colors.primary,
    borderWidth: 1,
    borderColor: Theme.colors.primaryGlow,
    shadowColor: Theme.colors.primaryGlow,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    zIndex: 999,
  },
  // vehicle image
  vehicleImagePicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },

  vehicleImagePreview: {
    width: 54,
    height: 54,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.card,
  },

  vehicleImagePlaceholder: {
    width: 54,
    height: 54,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },

  vehicleImageTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  vehicleImageTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "900",
  },

  vehicleImageSub: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
});
