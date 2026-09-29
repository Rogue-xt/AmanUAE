import * as Linking from "expo-linking";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  AppStateStatus,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useApp } from "../../src/context/AppContext";
import { router } from "expo-router";
import { Theme } from "@/constants/Theme";
import { FadeInView } from "@/components/ui/FadeInView";
import { PremiumVehicleCard } from "@/components/ui/PremiumVehicleCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import {
  ScreenContainer,
  ScreenHeader,
  SectionHeader,
} from "@/components/ui/ScreenLayout";
import { formatEmirate } from "@/components/ui/utils";
import { generateParkingSMS, identifyEmirateFromRegion } from "@/src/utils/parkingFormatter";

const DURATION_OPTIONS = [
  { value: 1, label: "1h" },
  { value: 2, label: "2h" },
  { value: 3, label: "3h" },
  { value: 4, label: "4h" },
];
const SHARJAH_DURATION_OPTIONS = [
  { value: 1, label: "1h" },
  { value: 2, label: "2h" },
  { value: 3, label: "3h" },
  { value: 5, label: "5h" },
];
const PARKING_EMIRATES = [
  "Dubai",
  "AbuDhabi",
  "Sharjah",
  "Ajman",
  "RasAlKhaimah",
  "UmmAlQuwain",
  "Fujairah",
] as const;

const ZONE_REQUIRED_EMIRATES = [
  "Dubai",
  "RasAlKhaimah",
  "UmmAlQuwain",
  "Fujairah",
];

const PARKING_RULES = {
  Dubai: {
    supportsSms: true,
    supportsTime: true,
    requiresZone: true,
    requiresDuration: true,
    requiresBayType: false,
    shortcode: "7275",
  },
  Sharjah: {
    supportsSms: true,
    supportsTime: true,
    requiresZone: false,
    requiresDuration: true,
    requiresBayType: false,
    shortcode: "5566",
  },
  Ajman: {
    supportsSms: true,
    supportsTime: false,
    requiresZone: false,
    requiresDuration: false,
    requiresBayType: false,
    shortcode: "5155",
  },
  RasAlKhaimah: {
    supportsSms: false,
    supportsTime: false,
    requiresZone: false,
    requiresDuration: false,
    requiresBayType: false,
    shortcode: null,
  },
  AbuDhabi: {
    supportsSms: true,
    supportsTime: true,
    requiresZone: false,
    requiresDuration: true,
    requiresBayType: true,
    shortcode: "3009",
  },
  UmmAlQuwain: {
    supportsSms: false,
    supportsTime: false,
    requiresZone: false,
    requiresDuration: false,
    requiresBayType: false,
    shortcode: null,
  },
  Fujairah: {
    supportsSms: false,
    supportsTime: false,
    requiresZone: false,
    requiresDuration: false,
    requiresBayType: false,
    shortcode: null,
  },
} as const;
const requiresZoneCode = (emirate?: string) => {
  return !!emirate && ZONE_REQUIRED_EMIRATES.includes(emirate);
};

type PendingParkingRequest = {
  vehicleId: string;
  vehicleLabel: string;
  plateDetails: string;
  parkingEmirate: (typeof PARKING_EMIRATES)[number];
  zoneCode: string;
  durationHours: number;
};

export default function ParkingScreen() {
const { vehicles, startParkingSession, parkingSessions,endParkingSession } =
  useApp();

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [selectedParkingEmirate, setSelectedParkingEmirate] =
    useState<(typeof PARKING_EMIRATES)[number]>("Dubai");

  const [isPremiumAbuDhabi, setIsPremiumAbuDhabi] = useState<boolean>(false);
  const [zoneCode, setZoneCode] = useState<string>("");
  const [duration, setDuration] = useState<number>(1);

  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [detectedEmirate, setDetectedEmirate] = useState<string | null>(null);
  const [pendingParkingRequest, setPendingParkingRequest] =
    useState<PendingParkingRequest | null>(null);
  const [confirmationStep, setConfirmationStep] = useState<
    "sent" | "authority"
  >("sent");
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const pendingParkingRequestRef = useRef<PendingParkingRequest | null>(null);
  const currentAppState = useRef<AppStateStatus>(AppState.currentState);
  const didLeaveForSms = useRef(false);
  const didShowReturnPrompt = useRef(false);

  const activeVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const activeParkingSessions = useMemo(
    () =>
      parkingSessions.filter(
        (session) =>
          session.status === "active" && session.expiryTimestamp > Date.now(),
      ),
    [parkingSessions],
  );

  const currentParkingLocation = selectedParkingEmirate;
  const parkingRule = PARKING_RULES[currentParkingLocation];

  const needsZoneInput = parkingRule.requiresZone;
  const needsDurationInput = parkingRule.requiresDuration;
  const needsBayTypeInput = parkingRule.requiresBayType;
  const smsSupported = parkingRule.supportsSms;
  const timeSupported = parkingRule.supportsTime;
  const durationOptions =
    currentParkingLocation === "Sharjah"
      ? SHARJAH_DURATION_OPTIONS
      : DURATION_OPTIONS;

  useEffect(() => {
    if (!durationOptions.some((option) => option.value === duration)) {
      setDuration(1);
    }
  }, [duration, durationOptions]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasAway =
        currentAppState.current === "inactive" ||
        currentAppState.current === "background";

      if (
        pendingParkingRequestRef.current &&
        (nextState === "inactive" || nextState === "background")
      ) {
        didLeaveForSms.current = true;
      }

      if (
        pendingParkingRequestRef.current &&
        nextState === "active" &&
        wasAway &&
        didLeaveForSms.current &&
        !didShowReturnPrompt.current
      ) {
        didShowReturnPrompt.current = true;
        setConfirmationStep("sent");
        setIsConfirmationVisible(true);
      }

      currentAppState.current = nextState;
    });

    return () => subscription.remove();
  }, []);

const smsPreview = useMemo(() => {
  if (!activeVehicle) return null;

  try {
    return generateParkingSMS({
      plateEmirate: activeVehicle.emirate,
      parkingEmirate: currentParkingLocation,
      plateCode: activeVehicle.plateCode,
      plateNumber: activeVehicle.plateNumber,
      zoneCode: zoneCode.trim(),
      durationInHours: duration,
      isPremiumAbuDhabi,
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
          setSelectedParkingEmirate(
            targetEmirate as (typeof PARKING_EMIRATES)[number],
          );
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
    if (pendingParkingRequest) {
      Alert.alert(
        "Parking confirmation pending",
        "Finish or cancel the current SMS confirmation before opening another parking SMS.",
      );
      return;
    }

    if (!selectedVehicleId || !activeVehicle) {
      Alert.alert(
        "Selection Missing",
        "Please select a secured vehicle plate from the horizontal layout slider.",
      );
      return;
    }
    const existingVehicleSession = activeParkingSessions.find(
      (session) => session.vehicleId === activeVehicle.id,
    );

    if (existingVehicleSession) {
      Alert.alert(
        "Parking already active",
        `An active parking session is already running for ${activeVehicle.label}. Please end the current session before starting a new one to prevent double-booking.`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "End Parking",
            style: "destructive",
            onPress: () => endParkingSession(existingVehicleSession.id),
          },
        ],
      );

      return;
    }

  const parkingLocation = currentParkingLocation;
  const parkingRule = PARKING_RULES[parkingLocation];

  if (!parkingRule.supportsSms) {
    Alert.alert(
      "SMS Parking Not Supported",
      `${formatEmirate(parkingLocation)} does not currently support SMS parking through ZoneGard. Use the local parking app, kiosk, or meter.`,
    );
    return;
  }

  if (parkingRule.requiresZone && !zoneCode.trim()) {
    Alert.alert(
      "Zone Required",
      `${formatEmirate(parkingLocation)} parking requires an accurate zone code.`,
    );
    return;
  }

  try {
    const { recipient, body } = generateParkingSMS({
      plateEmirate: activeVehicle.emirate,
      parkingEmirate: parkingLocation,
      plateCode: activeVehicle.plateCode,
      plateNumber: activeVehicle.plateNumber,
      zoneCode: zoneCode.trim(),
      durationInHours: duration,
      isPremiumAbuDhabi,
    });

    const smsUrl = `sms:${recipient}?body=${encodeURIComponent(body)}`;
    const canOpen = await Linking.canOpenURL(smsUrl);

    if (canOpen) {
      const pendingRequest: PendingParkingRequest = {
        vehicleId: activeVehicle.id,
        vehicleLabel: activeVehicle.label,
        plateDetails: `${activeVehicle.plateCode} ${activeVehicle.plateNumber}`,
        parkingEmirate: parkingLocation,
        zoneCode: zoneCode.trim(),
        durationHours: parkingRule.requiresDuration ? duration : 1,
      };

      didLeaveForSms.current = false;
      didShowReturnPrompt.current = false;
      setConfirmationStep("sent");
      pendingParkingRequestRef.current = pendingRequest;
      setPendingParkingRequest(pendingRequest);

      try {
        await Linking.openURL(smsUrl);
      } catch (error) {
        pendingParkingRequestRef.current = null;
        setPendingParkingRequest(null);
        throw error;
      }
    } else {
      Alert.alert(
        "Device Direct Error",
        `System failed to open SMS channel to: ${recipient}`,
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

  const discardPendingRequest = () => {
    setIsConfirmationVisible(false);
    pendingParkingRequestRef.current = null;
    setPendingParkingRequest(null);
    setConfirmationStep("sent");
    didLeaveForSms.current = false;
    didShowReturnPrompt.current = false;
  };

  const confirmParking = async () => {
    if (!pendingParkingRequest || isStartingSession) return;

    const duplicateSession = parkingSessions.find(
      (session) =>
        session.status === "active" &&
        session.expiryTimestamp > Date.now() &&
        session.vehicleId === pendingParkingRequest.vehicleId,
    );

    if (duplicateSession) {
      Alert.alert(
        "Parking already active",
        "An active session now exists for this vehicle. The pending request was not added.",
      );
      discardPendingRequest();
      return;
    }

    setIsStartingSession(true);
    const confirmationTime = Date.now();
    const expiryTimestamp =
      confirmationTime + pendingParkingRequest.durationHours * 60 * 60 * 1000;

    await startParkingSession({
      ...pendingParkingRequest,
      startedAt: confirmationTime,
      expiryTimestamp,
    });

    setIsStartingSession(false);
    discardPendingRequest();
    Alert.alert(
      "Parking confirmed",
      "Tracking started from the time you confirmed the parking authority response.",
    );
  };

  // const needsZoneInput = requiresZoneCode(currentParkingLocation);

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* <FadeInView delay={0}>
          <ScreenHeader
            kicker="Smart UAE Parking"
            title="Parking Assistant"
            subtitle="SMS parking across all seven emirates"
          />
        </FadeInView> */}

        <FadeInView delay={80}>
          <View style={[styles.scanCard, isLocating && styles.scanCardActive]}>
            <View style={styles.scanIconWrap}>
              <FontAwesome6
                name="location-crosshairs"
                size={22}
                color={
                  isLocating ? Theme.colors.primaryGlow : Theme.colors.primary
                }
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
          <FadeInView delay={120}>
            <TouchableOpacity
              style={styles.sessionsCard}
              onPress={() => router.push("/parking-sessions")}
            >
              <View style={styles.sessionsIcon}>
                <FontAwesome6
                  name="clock-rotate-left"
                  size={18}
                  color={Theme.colors.textPrimary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.sessionsTitle}>Parking Sessions</Text>
                <Text style={styles.sessionsSub}>
                  {activeParkingSessions.length > 0
                    ? `${activeParkingSessions.length} active • ${parkingSessions.length} total`
                    : parkingSessions.length > 0
                      ? `${parkingSessions.length} saved sessions`
                      : "Review previous parking activity"}
                </Text>
              </View>

              <FontAwesome6
                name="chevron-right"
                size={14}
                color={Theme.colors.textMuted}
              />
            </TouchableOpacity>
          </FadeInView>
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
                  imageUri={car.imageUrl || car.imageUri}
                  imageName={car.imageName}
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

        {/* select emirate */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Parking Emirate</Text>
          <Text style={styles.sectionSubtitle}>
            Select where the car is parked. This controls SMS format and zone
            rules.
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {PARKING_EMIRATES.map((emirate) => {
              const active = selectedParkingEmirate === emirate;

              return (
                <TouchableOpacity
                  key={emirate}
                  style={[
                    styles.emirateChip,
                    active && styles.emirateChipActive,
                  ]}
                  onPress={() => setSelectedParkingEmirate(emirate)}
                >
                  <Text
                    style={[
                      styles.emirateChipText,
                      active && styles.emirateChipTextActive,
                    ]}
                  >
                    {formatEmirate(emirate)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {activeVehicle && (
          <>
            <FadeInView delay={240}>
              {needsZoneInput && (
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
                        {currentParkingLocation
                          ? formatEmirate(currentParkingLocation)
                          : "This emirate"}{" "}
                        uses flat-rate messaging.
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </FadeInView>

            {needsBayTypeInput && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Abu Dhabi Bay Type</Text>
                <Text style={styles.sectionSubtitle}>
                  Select the curbside parking type before generating the SMS.
                </Text>

                <View style={styles.bayTypeGrid}>
                  <TouchableOpacity
                    style={[
                      styles.bayTypeCard,
                      !isPremiumAbuDhabi && styles.bayTypeCardActive,
                    ]}
                    onPress={() => setIsPremiumAbuDhabi(false)}
                  >
                    <Text style={styles.bayTypeCode}>S</Text>
                    <Text style={styles.bayTypeTitle}>Standard</Text>
                    <Text style={styles.bayTypeMeta}>AED 2/hr • Max 24h</Text>
                    <Text style={styles.bayTypePaint}>Turquoise + Black</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.bayTypeCard,
                      isPremiumAbuDhabi && styles.bayTypeCardActive,
                    ]}
                    onPress={() => setIsPremiumAbuDhabi(true)}
                  >
                    <Text style={styles.bayTypeCode}>P</Text>
                    <Text style={styles.bayTypeTitle}>Premium</Text>
                    <Text style={styles.bayTypeMeta}>AED 3/hr • Max 4h</Text>
                    <Text style={styles.bayTypePaint}>Turquoise + White</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <FadeInView delay={360}>
              {smsSupported && (
                <View style={styles.durationCard}>
                  <SectionHeader
                    title="Duration"
                    subtitle="Ticket length in hours"
                  />
                  {timeSupported ? (
                    <View style={styles.durationRow}>
                      {DURATION_OPTIONS.map((opt) => (
                        <Pressable
                          key={opt.value}
                          onPress={() => setDuration(opt.value)}
                          style={[
                            styles.durationBtn,
                            duration === opt.value && styles.durationBtnActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.durationBtnText,
                              duration === opt.value &&
                                styles.durationBtnTextActive,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.sectionSubtitleWarning}>
                      Ajman SMS parking is restricted to 1-hour bookings.
                    </Text>
                  )}
                </View>
              )}
            </FadeInView>

            {smsPreview && (
              <FadeInView delay={420}>
                <View style={styles.previewCard}>
                  <SectionHeader title="SMS Preview" subtitle="Ready to open" />
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>To</Text>
                    <Text style={styles.previewValue}>
                      {smsPreview.recipient}
                    </Text>
                  </View>
                  <View style={styles.previewBody}>
                    <Text style={styles.previewBodyText}>
                      {smsPreview.body}
                    </Text>
                  </View>
                </View>
              </FadeInView>
            )}
            {!smsSupported && (
              <View style={styles.unsupportedCard}>
                <Text style={styles.unsupportedTitle}>
                  SMS Parking Not Supported
                </Text>
                <Text style={styles.unsupportedText}>
                  {formatEmirate(currentParkingLocation)} does not currently
                  support SMS parking through ZoneGard. Use the local smart
                  parking app, kiosk, or on-street meter.
                </Text>
              </View>
            )}

            <FadeInView delay={480}>
              {pendingParkingRequest && (
                <View style={styles.pendingCard}>
                  <View style={styles.pendingHeader}>
                    <FontAwesome6
                      name="message"
                      size={16}
                      color={Theme.colors.warning}
                    />
                    <Text style={styles.pendingTitle}>
                      Parking confirmation pending
                    </Text>
                  </View>
                  <Text style={styles.pendingText}>
                    No timer is running yet. Confirm the SMS status after you
                    receive the parking authority response.
                  </Text>
                  <View style={styles.pendingActions}>
                    <PrimaryButton
                      label="Cancel Request"
                      onPress={discardPendingRequest}
                      variant="ghost"
                      style={styles.pendingAction}
                    />
                    <PrimaryButton
                      label="Check Confirmation"
                      onPress={() => {
                        setConfirmationStep(
                          confirmationStep === "authority"
                            ? "authority"
                            : "sent",
                        );
                        setIsConfirmationVisible(true);
                      }}
                      style={styles.pendingAction}
                    />
                  </View>
                </View>
              )}
              <PrimaryButton
                label="Open Parking SMS"
                onPress={handleTriggerSMS}
                disabled={!!pendingParkingRequest}
                icon={
                  <FontAwesome6
                    name="paper-plane"
                    size={14}
                    color={Theme.colors.textPrimary}
                  />
                }
              />
              {activeParkingSessions.length > 0 && (
                <Text style={styles.activeNote}>
                  {activeParkingSessions.length} active parking session
                  {activeParkingSessions.length === 1 ? "" : "s"} running.
                  A new timer starts only after you confirm the authority
                  response.
                </Text>
              )}
            </FadeInView>
          </>
        )}
      </ScrollView>

      <Modal
        visible={isConfirmationVisible && !!pendingParkingRequest}
        transparent
        animationType="fade"
        onRequestClose={() => setIsConfirmationVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmationCard}>
            <View style={styles.confirmationIcon}>
              <FontAwesome6
                name={confirmationStep === "sent" ? "paper-plane" : "check"}
                size={20}
                color={Theme.colors.primaryGlow}
              />
            </View>
            <Text style={styles.confirmationTitle}>
              {confirmationStep === "sent"
                ? "Did you send the parking SMS?"
                : "Did you receive a parking confirmation SMS?"}
            </Text>
            <Text style={styles.confirmationText}>
              {confirmationStep === "sent"
                ? "Opening the SMS composer does not send the message or purchase parking."
                : "ZoneGard should only start tracking after the parking authority confirms the transaction. ZoneGard does not verify this response itself."}
            </Text>
            <View style={styles.confirmationActions}>
              {confirmationStep === "sent" ? (
                <>
                  <PrimaryButton
                    label="No / Cancel"
                    onPress={discardPendingRequest}
                    variant="ghost"
                    style={styles.confirmationAction}
                  />
                  <PrimaryButton
                    label="Yes, I sent it"
                    onPress={() => setConfirmationStep("authority")}
                    style={styles.confirmationAction}
                  />
                </>
              ) : (
                <>
                  <PrimaryButton
                    label="Not Yet"
                    onPress={() => setIsConfirmationVisible(false)}
                    variant="ghost"
                    style={styles.confirmationAction}
                  />
                  <PrimaryButton
                    label={
                      isStartingSession ? "Starting..." : "Yes, Parking Confirmed"
                    }
                    onPress={confirmParking}
                    disabled={isStartingSession}
                    variant="success"
                    style={styles.confirmationAction}
                  />
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
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
  // durationBtn: {
  //   flex: 1,
  //   paddingVertical: Theme.spacing.md,
  // },
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
  pendingCard: {
    backgroundColor: Theme.colors.warningMuted,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.warning,
    marginBottom: Theme.spacing.lg,
  },
  pendingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
  pendingTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "900",
  },
  pendingText: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: Theme.spacing.md,
  },
  pendingActions: {
    flexDirection: "row",
    gap: Theme.spacing.sm,
  },
  pendingAction: {
    flex: 1,
    paddingHorizontal: Theme.spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: Theme.spacing.xl,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
  },
  confirmationCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  confirmationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Theme.colors.primaryMuted,
    marginBottom: Theme.spacing.lg,
  },
  confirmationTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: Theme.spacing.sm,
  },
  confirmationText: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: Theme.spacing.xl,
  },
  confirmationActions: {
    flexDirection: "row",
    gap: Theme.spacing.sm,
  },
  confirmationAction: {
    flex: 1,
    paddingHorizontal: Theme.spacing.sm,
  },

  // emirate selection
  sectionCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.md,
    ...Theme.shadow.card,
  },

  sectionTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },

  sectionSubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: Theme.spacing.md,
  },
 sectionSubtitleWarning: {
    color: "orange",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: Theme.spacing.md,
  },
  emirateChip: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Theme.radius.full,
    marginRight: 8,
  },

  emirateChipActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primaryGlow,
    ...Theme.shadow.glow,
  },

  emirateChipText: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "800",
  },

  emirateChipTextActive: {
    color: Theme.colors.textPrimary,
  },
  // new style after refractor.

  bayTypeGrid: {
    flexDirection: "row",
    gap: Theme.spacing.sm,
  },
  bayTypeCard: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  bayTypeCardActive: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primaryMuted,
  },
  bayTypeCode: {
    color: Theme.colors.primaryGlow,
    fontSize: 24,
    fontWeight: "900",
  },
  bayTypeTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 6,
  },
  bayTypeMeta: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  bayTypePaint: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 6,
  },
  unsupportedCard: {
    backgroundColor: Theme.colors.warningMuted,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.warning,
    marginBottom: Theme.spacing.md,
  },
  unsupportedTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 6,
  },
  unsupportedText: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  generateButtonDisabled: {
    opacity: 0.45,
  },
  // new style
  sessionsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.md,
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.xl,
    ...Theme.shadow.card,
  },
  sessionsIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: Theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionsTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "900",
  },
  sessionsSub: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  //custom hr button
  durationBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },

  durationBtnActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },

  durationBtnText: {
    color: Theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: "900",
  },

  durationBtnTextActive: {
    color: "#000000",
  },
});
