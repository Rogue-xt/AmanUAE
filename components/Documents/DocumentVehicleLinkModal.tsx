import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

import { Theme } from "@/constants/Theme";
import { DocumentRecord, VehicleProfile } from "@/src/context/AppContext";
import { formatEmirate } from "@/components/ui/utils";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

type Props = {
  visible: boolean;
  document: DocumentRecord | null;
  vehicles: VehicleProfile[];
  onClose: () => void;
  onLink: (documentId: string, vehicleId: string | null) => Promise<void>;
};

export function DocumentVehicleLinkModal({
  visible,
  document,
  vehicles,
  onClose,
  onLink,
}: Props) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!visible) return;
    setSelectedVehicleId(document?.vehicleId || null);
  }, [visible, document]);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  const handleSave = async () => {
    if (!document) return;

    await onLink(document.id, selectedVehicleId);
    onClose();
  };

  const handleUnlink = () => {
    setSelectedVehicleId(null);
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
          <View style={styles.sheetHandle} />

          <View style={styles.header}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Link Vehicle</Text>
              <Text style={styles.subtitle} numberOfLines={2}>
                {document
                  ? `Assign "${document.title}" to a vehicle.`
                  : "Assign this document to a vehicle."}
              </Text>
            </View>

            <Pressable style={styles.closeCircle} onPress={onClose}>
              <FontAwesome6
                name="xmark"
                size={16}
                color={Theme.colors.textPrimary}
              />
            </Pressable>
          </View>

          <View style={styles.currentPanel}>
            <Text style={styles.currentLabel}>Current Link</Text>

            {selectedVehicle ? (
              <View style={styles.currentVehicleRow}>
                <View style={styles.currentIcon}>
                  <FontAwesome6
                    name="car-side"
                    size={14}
                    color={Theme.colors.primaryGlow}
                  />
                </View>

                <View style={styles.currentTextWrap}>
                  <Text style={styles.currentTitle}>
                    {selectedVehicle.label}
                  </Text>
                  <Text style={styles.currentMeta}>
                    {formatEmirate(selectedVehicle.emirate)} •{" "}
                    {selectedVehicle.plateCode} {selectedVehicle.plateNumber}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.noCurrentText}>No vehicle linked</Text>
            )}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {vehicles.length === 0 ? (
              <View style={styles.emptyCard}>
                <FontAwesome6
                  name="car-burst"
                  size={28}
                  color={Theme.colors.textMuted}
                />
                <Text style={styles.emptyTitle}>No vehicles available</Text>
                <Text style={styles.emptySub}>
                  Add a vehicle first, then link this document.
                </Text>
              </View>
            ) : (
              vehicles.map((vehicle) => {
                const isSelected = selectedVehicleId === vehicle.id;

                return (
                  <Pressable
                    key={vehicle.id}
                    style={[
                      styles.vehicleRow,
                      isSelected && styles.vehicleRowActive,
                    ]}
                    onPress={() => setSelectedVehicleId(vehicle.id)}
                  >
                    <View
                      style={[styles.radio, isSelected && styles.radioActive]}
                    >
                      {isSelected && <View style={styles.radioDot} />}
                    </View>

                    <View style={styles.vehicleIcon}>
                      <FontAwesome6
                        name="car-side"
                        size={15}
                        color={
                          isSelected
                            ? Theme.colors.primaryGlow
                            : Theme.colors.textSecondary
                        }
                      />
                    </View>

                    <View style={styles.vehicleTextWrap}>
                      <Text style={styles.vehicleTitle} numberOfLines={1}>
                        {vehicle.label}
                      </Text>
                      <Text style={styles.vehicleMeta} numberOfLines={1}>
                        {formatEmirate(vehicle.emirate)} • {vehicle.plateCode}{" "}
                        {vehicle.plateNumber}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[
                styles.unlinkButton,
                !selectedVehicleId && styles.unlinkButtonDisabled,
              ]}
              disabled={!selectedVehicleId}
              onPress={handleUnlink}
            >
              <FontAwesome6
                name="link-slash"
                size={13}
                color={
                  selectedVehicleId
                    ? Theme.colors.warning
                    : Theme.colors.textMuted
                }
              />
              <Text
                style={[
                  styles.unlinkText,
                  !selectedVehicleId && styles.unlinkTextDisabled,
                ]}
              >
                Unlink
              </Text>
            </Pressable>

            <View style={styles.saveWrap}>
              <PrimaryButton
                label="Save Link"
                onPress={handleSave}
                icon={
                  <FontAwesome6
                    name="link"
                    size={13}
                    color={Theme.colors.textPrimary}
                  />
                }
              />
            </View>
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
    maxHeight: "86%",
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

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: Theme.spacing.lg,
  },

  headerTextWrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },

  title: {
    color: Theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "900",
  },

  subtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
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

  currentPanel: {
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },

  currentLabel: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 8,
  },

  currentVehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  currentIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Theme.colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },

  currentTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  currentTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "900",
  },

  currentMeta: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },

  noCurrentText: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },

  listContent: {
    paddingBottom: Theme.spacing.sm,
  },

  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },

  vehicleRowActive: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.elevated,
  },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  radioActive: {
    borderColor: Theme.colors.primaryGlow,
  },

  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Theme.colors.primaryGlow,
  },

  vehicleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  vehicleTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  vehicleTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "900",
  },

  vehicleMeta: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },

  emptyCard: {
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.xl,
    alignItems: "center",
    gap: Theme.spacing.sm,
  },

  emptyTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "900",
  },

  emptySub: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.sm,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },

  unlinkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.lg,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
  },

  unlinkButtonDisabled: {
    opacity: 0.45,
  },

  unlinkText: {
    color: Theme.colors.warning,
    fontSize: 13,
    fontWeight: "900",
  },

  unlinkTextDisabled: {
    color: Theme.colors.textMuted,
  },

  saveWrap: {
    flex: 1,
  },
});
