import * as Linking from "expo-linking";
import * as Location from "expo-location";
import React, { useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useApp } from "../../src/context/AppContext";
import {
  generateParkingSMS,
  identifyEmirateFromRegion,
} from "@/src/context/utils/parkingFormatter";
import { Theme } from "@/constants/Theme";
import { FadeInView } from "@/components/ui/FadeInView";
import { PremiumVehicleCard } from "@/components/ui/PremiumVehicleCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ScreenContainer, ScreenHeader, SectionHeader } from "@/components/ui/ScreenLayout";
import { formatEmirate } from "@/components/ui/utils";

const DURATION_OPTIONS = [
  { value: 1, label: "1h" },
  { value: 2, label: "2h" },
  { value: 3, label: "3h" },
  { value: 4, label: "4h" },
];

export default function ParkingScreen() {
  const { vehicles, activeTicket, startParkingSession } = useApp();

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [zoneCode, setZoneCode] = useState<string>("");
  const [duration, setDuration] = useState<number>(1);
  const [isPremiumAbuDhabi, setIsPremiumAbuDhabi] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [detectedEmirate, setDetectedEmirate] = useState<string | null>(null);

  const activeVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  const currentParkingLocation =
    (detectedEmirate as ReturnType<typeof identifyEmirateFromRegion>) ||
    activeVehicle?.emirate;

  const smsPreview = useMemo(() => {
    if (!activeVehicle || !currentParkingLocation) return null;

    const needsZone = ["Dubai", "RasAlKhaimah", "UmmAlQuwain", "Fujairah"].includes(
      activeVehicle.emirate,
    );
    if (needsZone && !zoneCode.trim()) return null;

    try {
      return generateParkingSMS({
        plateEmirate: activeVehicle.emirate,
        parkingEmirate: currentParkingLocation,
        plateCode: activeVehicle.plateCode,
        plateNumber: activeVehicle.plateNumber,
        zoneCode: zoneCode,
        durationInHours: duration,
        isPremiumAbuDhabi: isPremiumAbuDhabi,
      });
    } catch {
      return null;
    }
  }, [
    activeVehicle,
    currentParkingLocation,
    zoneCode,
    duration,
    isPremiumAbuDhabi,
  ]);

  const handleAutoDetectEmirate = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "ZoneGard needs location access to safely match regional parking codes.",
        );
        setIsLocating(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const place = reverseGeocode[0];
        const targetEmirate = identifyEmirateFromRegion(
          place.region || place.city,
        );

        if (targetEmirate) {
          setDetectedEmirate(targetEmirate);
          Alert.alert(
            "Location Locked",
            `Detected current zone position: ${targetEmirate}`,
          );

          const matchingCar = vehicles.find((v) => v.emirate === targetEmirate);
          if (matchingCar) {
            setSelectedVehicleId(matchingCar.id);
          }
        } else {
          Alert.alert(
            "Boundary Check",
            `Located inside alternative jurisdiction: ${place.region || place.city}`,
          );
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        "GPS Timeout",
        "Failed to retrieve native hardware location signals.",
      );
    } finally {
      setIsLocating(false);
    }
  };

  const handleTriggerSMS = async () => {
    if (!selectedVehicleId || !activeVehicle) {
      Alert.alert(
        "Selection Missing",
        "Please select a secured vehicle plate from the horizontal layout slider.",
      );
      return;
    }

    const needsZone = [
      "Dubai",
      "RasAlKhaimah",
      "UmmAlQuwain",
      "Fujairah",
    ].includes(activeVehicle.emirate);
    if (needsZone && !zoneCode.trim()) {
      Alert.alert(
        "Zone Required",
        `${activeVehicle.emirate} municipal databases require an accurate parking zone locator code.`,
      );
      return;
    }

    const parkingLocation =
      (detectedEmirate as ReturnType<typeof identifyEmirateFromRegion>) ||
      activeVehicle.emirate;

    try {
      const { recipient, body } = generateParkingSMS({
        plateEmirate: activeVehicle.emirate,
        parkingEmirate: parkingLocation,
        plateCode: activeVehicle.plateCode,
        plateNumber: activeVehicle.plateNumber,
        zoneCode: zoneCode,
        durationInHours: duration,
        isPremiumAbuDhabi: isPremiumAbuDhabi,
      });

      const smsUrl = `sms:${recipient}?body=${encodeURIComponent(body)}`;
      const canOpen = await Linking.canOpenURL(smsUrl);

      if (canOpen) {
        await Linking.openURL(smsUrl);

        const durationInMilliseconds = duration * 60 * 60 * 1000;
        const expiryTime = Date.now() + durationInMilliseconds;

        await startParkingSession({
          vehicleLabel: activeVehicle.label,
          plateDetails: `${activeVehicle.plateCode} ${activeVehicle.plateNumber}`,
          parkingEmirate: parkingLocation,
          expiryTimestamp: expiryTime,
        });
      } else {
        Alert.alert(
          "Device Direct Error",
          `System failed to deploy communications channel to target: ${recipient}`,
        );
      }
    } catch (err) {
      console.error(err);
      Alert.alert(
        "Formatting Execution Failure",
        "An error occurred while compiling your ticket configuration profile.",
      );
    }
  };

  const needsZoneInput =
    activeVehicle &&
    !["Sharjah", "Ajman"].includes(activeVehicle.emirate);

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <FadeInView delay={0}>
          <ScreenHeader
            kicker="Smart UAE Parking"
            title="Parking Assistant"
            subtitle="SMS parking across all seven emirates"
          />
        </FadeInView>

        <FadeInView delay={80}>
          <View style={[styles.scanCard, isLocating && styles.scanCardActive]}>
            <View style={styles.scanIconWrap}>
              <FontAwesome6
                name="location-crosshairs"
                size={22}
                color={isLocating ? Theme.colors.primaryGlow : Theme.colors.primary}
              />
              {isLocating && <View style={styles.scanPulse} />}
            </View>
            <View style={styles.scanText}>
              <Text style={styles.scanTitle}>
                {isLocating ? "Scanning UAE Grid..." : "Emirate Detection"}
              </Text>
              <Text style={styles.scanSub}>
                {detectedEmirate
                  ? `Locked: ${formatEmirate(detectedEmirate)}`
                  : "Use GPS to auto-detect your parking emirate"}
              </Text>
            </View>
            <PrimaryButton
              label={isLocating ? "..." : "Scan"}
              onPress={handleAutoDetectEmirate}
              disabled={isLocating}
              variant="ghost"
              style={styles.scanButton}
            />
          </View>
        </FadeInView>

        <FadeInView delay={160}>
          <SectionHeader
            title="Select Vehicle"
            subtitle="Choose your active profile"
          />
          {vehicles.length === 0 ? (
            <View style={styles.warningCard}>
              <FontAwesome6
                name="circle-exclamation"
                size={20}
                color={Theme.colors.warning}
              />
              <Text style={styles.warningText}>
                No vehicles in vault. Register one on the Dashboard first.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.vehicleSlider}
            >
              {vehicles.map((car) => (
                <PremiumVehicleCard
                  key={car.id}
                  label={car.label}
                  emirate={car.emirate}
                  plateCode={car.plateCode}
                  plateNumber={car.plateNumber}
                  compact
                  selected={car.id === selectedVehicleId}
                  onPress={() => {
                    setSelectedVehicleId(car.id);
                    setIsPremiumAbuDhabi(false);
                  }}
                />
              ))}
            </ScrollView>
          )}
        </FadeInView>

        {activeVehicle && (
          <>
            <FadeInView delay={240}>
              <View style={styles.zoneCard}>
                <SectionHeader
                  title="Parking Zone"
                  subtitle={
                    needsZoneInput
                      ? "Required for this emirate"
                      : "Zone not required"
                  }
                />
                {needsZoneInput ? (
                  <TextInput
                    style={styles.zoneInput}
                    placeholder="Zone code (e.g. 332C or 101)"
                    placeholderTextColor={Theme.colors.textMuted}
                    value={zoneCode}
                    onChangeText={setZoneCode}
                    autoCapitalize="characters"
                  />
                ) : (
                  <View style={styles.infoBox}>
                    <FontAwesome6
                      name="circle-info"
                      size={14}
                      color={Theme.colors.primaryGlow}
                    />
                    <Text style={styles.infoText}>
                      {activeVehicle.emirate} uses flat-rate messaging. No zone
                      code needed.
                    </Text>
                  </View>
                )}
              </View>
            </FadeInView>

            {activeVehicle.emirate === "AbuDhabi" && (
              <FadeInView delay={300}>
                <View style={styles.premiumToggle}>
                  <View>
                    <Text style={styles.premiumLabel}>Premium Curb Zone</Text>
                    <Text style={styles.premiumSub}>
                      White & Turquoise parking
                    </Text>
                  </View>
                  <PrimaryButton
                    label={isPremiumAbuDhabi ? "ON" : "OFF"}
                    onPress={() => setIsPremiumAbuDhabi(!isPremiumAbuDhabi)}
                    variant={isPremiumAbuDhabi ? "primary" : "ghost"}
                    style={styles.toggleBtn}
                  />
                </View>
              </FadeInView>
            )}

            <FadeInView delay={360}>
              <View style={styles.durationCard}>
                <SectionHeader title="Duration" subtitle="Ticket length in hours" />
                <View style={styles.durationRow}>
                  {DURATION_OPTIONS.map((opt) => (
                    <PrimaryButton
                      key={opt.value}
                      label={opt.label}
                      onPress={() => setDuration(opt.value)}
                      variant={duration === opt.value ? "primary" : "ghost"}
                      style={styles.durationBtn}
                    />
                  ))}
                </View>
              </View>
            </FadeInView>

            {smsPreview && (
              <FadeInView delay={420}>
                <View style={styles.previewCard}>
                  <SectionHeader title="SMS Preview" subtitle="Ready to send" />
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>To</Text>
                    <Text style={styles.previewValue}>{smsPreview.recipient}</Text>
                  </View>
                  <View style={styles.previewBody}>
                    <Text style={styles.previewBodyText}>{smsPreview.body}</Text>
                  </View>
                </View>
              </FadeInView>
            )}

            <FadeInView delay={480}>
              <PrimaryButton
                label="Generate & Send SMS Ticket"
                onPress={handleTriggerSMS}
                icon={
                  <FontAwesome6
                    name="paper-plane"
                    size={14}
                    color={Theme.colors.textPrimary}
                  />
                }
              />
              {activeTicket && (
                <Text style={styles.activeNote}>
                  Active session running — sending will start a new timer.
                </Text>
              )}
            </FadeInView>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Theme.spacing.xl,
    paddingBottom: 120,
  },
  scanCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.xl,
    gap: Theme.spacing.md,
  },
  scanCardActive: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.elevated,
    ...Theme.shadow.glow,
  },
  scanIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  scanPulse: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Theme.colors.primaryGlow,
    opacity: 0.5,
  },
  scanText: {
    flex: 1,
  },
  scanTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  scanSub: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  scanButton: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.md,
    backgroundColor: Theme.colors.warningMuted,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.warning,
    marginBottom: Theme.spacing.lg,
  },
  warningText: {
    flex: 1,
    color: Theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  vehicleSlider: {
    paddingBottom: Theme.spacing.lg,
  },
  zoneCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    marginBottom: Theme.spacing.lg,
    ...Theme.shadow.glow,
  },
  zoneInput: {
    backgroundColor: Theme.colors.surface,
    color: Theme.colors.textPrimary,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.lg,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 2,
    textAlign: "center",
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.sm,
    backgroundColor: Theme.colors.primaryMuted,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
  },
  infoText: {
    flex: 1,
    color: Theme.colors.primaryGlow,
    fontSize: 13,
    lineHeight: 18,
  },
  premiumToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.lg,
  },
  premiumLabel: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  premiumSub: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  toggleBtn: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
    minWidth: 64,
  },
  durationCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.lg,
  },
  durationRow: {
    flexDirection: "row",
    gap: Theme.spacing.sm,
  },
  durationBtn: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
  },
  previewCard: {
    backgroundColor: Theme.colors.elevated,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.lg,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  previewLabel: {
    ...Theme.typography.label,
    color: Theme.colors.textMuted,
  },
  previewValue: {
    color: Theme.colors.primaryGlow,
    fontSize: 16,
    fontWeight: "800",
  },
  previewBody: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  previewBodyText: {
    color: Theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
    fontFamily: "SpaceMono",
  },
  activeNote: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    textAlign: "center",
    marginTop: Theme.spacing.md,
  },
});
