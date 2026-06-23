import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

import { Theme } from "@/constants/Theme";
import { VehicleProfile } from "@/src/context/AppContext";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SegmentedChips } from "@/components/ui/SegmentedChips";
import { EMIRATES_LIST, formatEmirate } from "@/components/ui/utils";

type Props = {
  visible: boolean;
  mode: "add" | "edit";
  vehicle?: VehicleProfile | null;
  onClose: () => void;
  onSave: (payload: Omit<VehicleProfile, "id">) => Promise<void>;
};

export function VehicleEditModal({
  visible,
  mode,
  vehicle,
  onClose,
  onSave,
}: Props) {
  const [label, setLabel] = useState("");
  const [selectedEmirate, setSelectedEmirate] =
    useState<VehicleProfile["emirate"]>("Dubai");
  const [plateCode, setPlateCode] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [pickedVehicleImage, setPickedVehicleImage] = useState<{
    imageUri?: string;
    imageName?: string;
  } | null>(null);

  const emirateOptions = useMemo(
    () =>
      EMIRATES_LIST.map((emirate) => ({
        value: emirate,
        label: formatEmirate(emirate),
      })),
    [],
  );

  useEffect(() => {
    if (!visible) return;

    if (mode === "edit" && vehicle) {
      setLabel(vehicle.label);
      setSelectedEmirate(vehicle.emirate);
      setPlateCode(vehicle.plateCode);
      setPlateNumber(vehicle.plateNumber);
      setPickedVehicleImage({
        imageUri: vehicle.imageUri,
        imageName: vehicle.imageName,
      });
    } else {
      setLabel("");
      setSelectedEmirate("Dubai");
      setPlateCode("");
      setPlateNumber("");
      setPickedVehicleImage(null);
    }
  }, [visible, mode, vehicle]);

  const handlePickVehicleImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];

    setPickedVehicleImage({
      imageUri: asset.uri,
      imageName: asset.fileName ?? `vehicle-${Date.now()}.jpg`,
    });
  };

  const handleSave = async () => {
    if (!label.trim() || !plateCode.trim() || !plateNumber.trim()) {
      Alert.alert("Missing Info", "Please fill all vehicle details.");
      return;
    }

    await onSave({
      label: label.trim(),
      emirate: selectedEmirate,
      plateCode: plateCode.trim().toUpperCase(),
      plateNumber: plateNumber.trim(),
      imageUri: pickedVehicleImage?.imageUri,
      imageName: pickedVehicleImage?.imageName,
    });

    onClose();
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

          <View style={styles.formHeader}>
            <View style={styles.modalHeaderText}>
              <Text style={styles.modalTitle}>
                {mode === "edit" ? "Edit Vehicle" : "Add Vehicle"}
              </Text>
              <Text style={styles.modalSubtitle}>
                Save plate details for fast UAE parking.
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

          <ScrollView showsVerticalScrollIndicator={false}>
            <TextInput
              style={styles.input}
              placeholder="Vehicle label, e.g. Nissan"
              placeholderTextColor={Theme.colors.textMuted}
              value={label}
              onChangeText={setLabel}
            />

            <Text style={styles.fieldLabel}>Plate Emirate</Text>
            <SegmentedChips
              options={emirateOptions}
              selected={selectedEmirate}
              onSelect={(value) =>
                setSelectedEmirate(value as VehicleProfile["emirate"])
              }
              horizontal
            />

            <View style={styles.plateRow}>
              <TextInput
                style={[styles.input, styles.plateCodeInput]}
                placeholder="Code"
                placeholderTextColor={Theme.colors.textMuted}
                value={plateCode}
                onChangeText={setPlateCode}
                autoCapitalize="characters"
              />

              <TextInput
                style={[styles.input, styles.plateNumberInput]}
                placeholder="Plate number"
                placeholderTextColor={Theme.colors.textMuted}
                value={plateNumber}
                onChangeText={setPlateNumber}
                keyboardType="number-pad"
              />
            </View>

            <Pressable
              style={styles.vehicleImagePicker}
              onPress={handlePickVehicleImage}
            >
              {pickedVehicleImage?.imageUri ? (
                <Image
                  source={{ uri: pickedVehicleImage.imageUri }}
                  style={styles.vehicleImagePreview}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.vehicleImagePlaceholder}>
                  <FontAwesome6
                    name="image"
                    size={20}
                    color={Theme.colors.primaryGlow}
                  />
                </View>
              )}

              <View style={styles.vehicleImageTextWrap}>
                <Text style={styles.vehicleImageTitle}>
                  {pickedVehicleImage?.imageName
                    ? "Vehicle Image Selected"
                    : "Add Vehicle Image"}
                </Text>
                <Text style={styles.vehicleImageSub} numberOfLines={1}>
                  {pickedVehicleImage?.imageName ||
                    "Optional, useful for quick recognition"}
                </Text>
              </View>
            </Pressable>

            <PrimaryButton
              label={mode === "edit" ? "Update Vehicle" : "Save Vehicle"}
              onPress={handleSave}
              variant="success"
              icon={
                <FontAwesome6
                  name="shield"
                  size={14}
                  color={Theme.colors.textPrimary}
                />
              }
            />
          </ScrollView>
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
