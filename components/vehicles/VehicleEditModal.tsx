import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import {
  hasVehiclePlateErrors,
  isDuplicateVehiclePlate,
  isSameVehiclePlate,
  normalizeVehiclePlate,
  validateVehiclePlate,
  VehiclePlateErrors,
} from "@/src/utils/vehiclePlateValidation";

type Props = {
  visible: boolean;
  mode: "add" | "edit";
  vehicle?: VehicleProfile | null;
  existingVehicles: VehicleProfile[];
  onClose: () => void;
  onSave: (payload: Omit<VehicleProfile, "id">) => Promise<void>;
};

export function VehicleEditModal({
  visible,
  mode,
  vehicle,
  existingVehicles,
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
  const [fieldErrors, setFieldErrors] = useState<
    VehiclePlateErrors & { label?: string }
  >({});
  const [pendingPayload, setPendingPayload] = useState<Omit<
    VehicleProfile,
    "id"
  > | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
    setFieldErrors({});
    setPendingPayload(null);
    setIsSaving(false);
  }, [visible, mode, vehicle]);

  const plateCodeLabel =
    selectedEmirate === "Dubai"
      ? "Plate Code"
      : selectedEmirate === "AbuDhabi" || selectedEmirate === "Ajman"
        ? "Plate Category"
        : "Plate Code / Category";

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
    const normalizedPlate = normalizeVehiclePlate(
      selectedEmirate,
      plateCode,
      plateNumber,
    );
    const originalPlate = vehicle
      ? normalizeVehiclePlate(
          vehicle.emirate,
          vehicle.plateCode,
          vehicle.plateNumber,
        )
      : null;
    const plateChanged =
      !originalPlate || !isSameVehiclePlate(normalizedPlate, originalPlate);
    const nextErrors: VehiclePlateErrors & { label?: string } = {};

    if (!label.trim()) {
      nextErrors.label = "Enter a vehicle nickname.";
    }

    if (mode === "add" || plateChanged) {
      Object.assign(nextErrors, validateVehiclePlate(normalizedPlate));
    }

    setFieldErrors(nextErrors);

    if (nextErrors.label || hasVehiclePlateErrors(nextErrors)) {
      return;
    }

    if (
      (mode === "add" || plateChanged) &&
      isDuplicateVehiclePlate(
        existingVehicles,
        normalizedPlate,
        mode === "edit" ? vehicle?.id : undefined,
      )
    ) {
      Alert.alert(
        "Vehicle already saved",
        "This vehicle is already in your garage.",
      );
      return;
    }

    const payload: Omit<VehicleProfile, "id"> = {
      label: label.trim(),
      ...normalizedPlate,
      imageUri: pickedVehicleImage?.imageUri,
      imageName: pickedVehicleImage?.imageName,
    };

    if (mode === "add" || plateChanged) {
      setPendingPayload(payload);
      return;
    }

    setIsSaving(true);
    await onSave(payload);
    setIsSaving(false);
    onClose();
  };

  const handleConfirmedSave = async () => {
    if (!pendingPayload || isSaving) return;

    setIsSaving(true);
    await onSave(pendingPayload);
    setIsSaving(false);
    setPendingPayload(null);
    onClose();
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
        {/* <View style={styles.overlay}> */}
          <View style={styles.card}>
            {pendingPayload ? (
              <View style={styles.confirmationContent}>
                <View style={styles.confirmationIcon}>
                  <FontAwesome6
                    name="car-side"
                    size={22}
                    color={Theme.colors.primaryGlow}
                  />
                </View>
                <Text style={styles.confirmationTitle}>
                  Confirm plate details
                </Text>
                <Text style={styles.confirmationEmirate}>
                  {formatEmirate(pendingPayload.emirate)}
                </Text>
                <View style={styles.confirmationPlate}>
                  <Text
                    style={styles.confirmationPlateIdentity}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {pendingPayload.plateCode} {pendingPayload.plateNumber}
                  </Text>
                </View>
                <Text style={styles.confirmationWarning}>
                  Check that these details exactly match your vehicle plate.
                  Incorrect details may cause a parking payment to be created
                  for the wrong vehicle.
                </Text>
                <View style={styles.confirmationActions}>
                  <PrimaryButton
                    label="Edit"
                    onPress={() => setPendingPayload(null)}
                    variant="ghost"
                    style={styles.confirmationAction}
                  />
                  <PrimaryButton
                    label={isSaving ? "Saving..." : "Confirm & Save"}
                    onPress={handleConfirmedSave}
                    disabled={isSaving}
                    variant="success"
                    style={styles.confirmationAction}
                  />
                </View>
              </View>
            ) : (
              <>
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

            <ScrollView
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TextInput
                style={[styles.input, fieldErrors.label && styles.inputError]}
                placeholder="Vehicle label, e.g. Nissan"
                placeholderTextColor={Theme.colors.textMuted}
                value={label}
                onChangeText={(value) => {
                  setLabel(value);
                  setFieldErrors((errors) => ({ ...errors, label: undefined }));
                }}
              />
              {fieldErrors.label && (
                <Text style={styles.errorText}>{fieldErrors.label}</Text>
              )}

              <Text style={styles.fieldLabel}>Plate Emirate</Text>
              <SegmentedChips
                options={emirateOptions}
                selected={selectedEmirate}
                onSelect={(value) =>
                  setSelectedEmirate(value as VehicleProfile["emirate"])
                }
                horizontal
              />

              <Text style={styles.privatePlateHint}>
                Currently optimized for UAE private vehicle plates.
              </Text>

              <View style={styles.plateRow}>
                <View style={styles.plateCodeInput}>
                  <Text style={styles.fieldLabel}>{plateCodeLabel}</Text>
                  <TextInput
                    style={[
                      styles.input,
                      fieldErrors.plateCode && styles.inputError,
                    ]}
                    placeholder="Code"
                    placeholderTextColor={Theme.colors.textMuted}
                    value={plateCode}
                    onChangeText={(value) => {
                      setPlateCode(value);
                      setFieldErrors((errors) => ({
                        ...errors,
                        plateCode: undefined,
                      }));
                    }}
                    autoCapitalize="characters"
                  />
                  {fieldErrors.plateCode && (
                    <Text style={styles.errorText}>
                      {fieldErrors.plateCode}
                    </Text>
                  )}
                </View>

                <View style={styles.plateNumberInput}>
                  <Text style={styles.fieldLabel}>Plate Number</Text>
                  <TextInput
                    style={[
                      styles.input,
                      fieldErrors.plateNumber && styles.inputError,
                    ]}
                    placeholder="Plate number"
                    placeholderTextColor={Theme.colors.textMuted}
                    value={plateNumber}
                    onChangeText={(value) => {
                      setPlateNumber(value);
                      setFieldErrors((errors) => ({
                        ...errors,
                        plateNumber: undefined,
                      }));
                    }}
                    keyboardType="number-pad"
                  />
                  {fieldErrors.plateNumber && (
                    <Text style={styles.errorText}>
                      {fieldErrors.plateNumber}
                    </Text>
                  )}
                </View>
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
                disabled={isSaving}
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
              </>
            )}
          </View>
        {/* </View> */}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // overlay: {
  //   flex: 1,
  //   backgroundColor: "rgba(0,0,0,0.72)",
  //   justifyContent: "flex-end",
  // },
  // card: {
  //   maxHeight: "88%",
  //   backgroundColor: Theme.colors.background,
  //   borderTopLeftRadius: Theme.radius.xl,
  //   borderTopRightRadius: Theme.radius.xl,
  //   padding: Theme.spacing.lg,
  //   borderWidth: 1,
  //   borderColor: Theme.colors.border,
  // },
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
  inputError: {
    borderColor: Theme.colors.danger,
  },
  errorText: {
    color: Theme.colors.danger,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
    marginTop: -Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  privatePlateHint: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: Theme.spacing.sm,
  },
  plateRow: {
    flexDirection: "row",
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.md,
  },
  plateCodeInput: {
    flex: 0.35,
    minWidth: 0,
  },
  plateNumberInput: {
    flex: 0.65,
    minWidth: 0,
  },
  confirmationContent: {
    paddingVertical: Theme.spacing.lg,
  },
  confirmationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Theme.colors.primaryMuted,
    marginBottom: Theme.spacing.lg,
  },
  confirmationTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: Theme.spacing.lg,
  },
  confirmationEmirate: {
    color: Theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: Theme.spacing.sm,
  },
  confirmationPlate: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.xl,
    marginBottom: Theme.spacing.lg,
  },
  confirmationPlateIdentity: {
    color: Theme.colors.textPrimary,
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
    width: "100%",
  },
  confirmationWarning: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: Theme.spacing.xl,
  },
  confirmationActions: {
    gap: Theme.spacing.sm,
  },
  confirmationAction: {
    width: "100%",
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
  // scroll: {
  //   flexGrow: 1,
  //   justifyContent: "center",
  // },
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

  scroll: {
    flexGrow: 1,
    paddingBottom: 32,
  },
});
