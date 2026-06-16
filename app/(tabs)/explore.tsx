import * as Linking from "expo-linking";
import * as Location from "expo-location";
import React, { useMemo, useState, useEffect } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useApp } from "../../src/context/AppContext";
import { generateParkingSMS, identifyEmirateFromRegion } from "@/src/context/utils/parkingFormatter";

export default function ParkingScreen() {
const {
  vehicles,
  addVehicle,
  deleteVehicle,
  activeTicket,
  clearParkingSession,
  startParkingSession,
} = useApp();
  // Functional state hooks for user configurations
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [zoneCode, setZoneCode] = useState<string>("");
  const [duration, setDuration] = useState<number>(1);
  const [isPremiumAbuDhabi, setIsPremiumAbuDhabi] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [detectedEmirate, setDetectedEmirate] = useState<string | null>(null);

  // Find the details of the active selected vehicle profile
  const activeVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  // 3. Add this GPS scanning function inside your component handler block
  const handleAutoDetectEmirate = async () => {
    setIsLocating(true);
    try {
      // Request permission from the OS system layer
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "ZoneGard needs location access to safely match regional parking codes.",
        );
        setIsLocating(false);
        return;
      }

      // Fetch precise hardware coordinates
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocode coordinates to extract text strings from local map sets
      let reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const place = reverseGeocode[0];
        // Use our utility analyzer to match the region to an emirate
        const targetEmirate = identifyEmirateFromRegion(
          place.region || place.city,
        );

        if (targetEmirate) {
          setDetectedEmirate(targetEmirate);
          Alert.alert(
            "Location Locked",
            `Detected current zone position: ${targetEmirate}`,
          );

          // Match the user's active vehicle selector automatically if they own a car registered to this emirate!
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

    // Validation guard: The big 3 municipal networks require zone tracking strings
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
    // Force a baseline fallback location if the user hasn't pressed auto-detect yet
    const currentParkingLocation =
      (detectedEmirate as any) || activeVehicle.emirate;
    try {
      // 1. Process inputs via our unified 7-emirate utility formula
      const { recipient, body } = generateParkingSMS({
        plateEmirate: activeVehicle.emirate, // e.g., 'Sharjah' (from vault)
        parkingEmirate: currentParkingLocation,
        plateCode: activeVehicle.plateCode,
        plateNumber: activeVehicle.plateNumber,
        zoneCode: zoneCode,
        durationInHours: duration,
        isPremiumAbuDhabi: isPremiumAbuDhabi,
      });

      // 2. Build the platform-specific deep link URL scheme query
      // This routes the compiled data payloads directly into iOS or Android native messaging apps
      const smsUrl = `sms:${recipient}?body=${encodeURIComponent(body)}`;
      const durationInMilliseconds = duration * 60 * 60 * 1000; // Translate user hours into system runtime ms
      const expiryTime = Date.now() + durationInMilliseconds;
     

      const canOpen = await Linking.canOpenURL(smsUrl);
   if (canOpen) {
     await Linking.openURL(smsUrl);

     const durationInMilliseconds = duration * 60 * 60 * 1000;
     const expiryTime = Date.now() + durationInMilliseconds;

     await startParkingSession({
       vehicleLabel: activeVehicle.label,
       plateDetails: `${activeVehicle.plateCode} ${activeVehicle.plateNumber}`,
       parkingEmirate: currentParkingLocation,
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 50 }}
    >
      <Text style={styles.headerTitle}>Parking Guard</Text>
      <TouchableOpacity
        style={[
          styles.locationBanner,
          isLocating && styles.locationBannerProcessing,
        ]}
        onPress={handleAutoDetectEmirate}
        disabled={isLocating}
      >
        <Text style={styles.locationBannerText}>
          {isLocating
            ? "📡 Scanning UAE Satellites..."
            : "📍 Auto-Detect Current Emirate"}
        </Text>
        {detectedEmirate && (
          <Text style={styles.locationSubText}>
            Active Mode: {detectedEmirate}
          </Text>
        )}
      </TouchableOpacity>

      {/* 1. HORIZONTAL CAR SELECTOR SLIDER TRACK */}
      <Text style={styles.sectionTitle}>1. Choose Active Vehicle Profile</Text>
      {vehicles.length === 0 ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            No vehicle records linked inside storage vault. Please visit the
            main profile dashboard to save a vehicle card entry first.
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.carSliderContainer}
        >
          {vehicles.map((car) => {
            const isSelected = car.id === selectedVehicleId;
            return (
              <TouchableOpacity
                key={car.id}
                style={[styles.carCard, isSelected && styles.carCardActive]}
                onPress={() => {
                  setSelectedVehicleId(car.id);
                  // Auto reset contextual settings based on state selection indicators
                  setIsPremiumAbuDhabi(false);
                }}
              >
                <Text style={[styles.carLabel, isSelected && styles.textWhite]}>
                  {car.label}
                </Text>
                <Text style={styles.carSubtext}>{car.emirate}</Text>
                <Text
                  style={[
                    styles.carPlateDetails,
                    isSelected && styles.textWhite,
                  ]}
                >
                  {car.plateCode} • {car.plateNumber}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* 2. DYNAMIC ZONE CONFIGURATION LAYER FIELDS */}
      {activeVehicle && (
        <View style={styles.fadeConfigurationPanel}>
          <Text style={styles.sectionTitle}>
            2. Input Local Parking Context
          </Text>

          {/* Conditional Input UI: Sharjah and Ajman skip text-based zones entirely */}
          {!["Sharjah", "Ajman"].includes(activeVehicle.emirate) ? (
            <TextInput
              style={styles.inputField}
              placeholder="Zone Code (e.g. 332C or 101)"
              placeholderTextColor="#777"
              value={zoneCode}
              onChangeText={setZoneCode}
              autoCapitalize="characters"
            />
          ) : (
            <View style={styles.infoNotification}>
              <Text style={styles.infoText}>
                💡 {activeVehicle.emirate} uses generalized flat rate messaging.
                A zone code is not needed.
              </Text>
            </View>
          )}

          {/* Conditional Input UI: Abu Dhabi native standard vs premium flag controller */}
          {activeVehicle.emirate === "AbuDhabi" && (
            <View style={styles.rowLayoutToggle}>
              <Text style={styles.toggleLabel}>
                Premium Curb Zone (White & Turquoise)?
              </Text>
              <TouchableOpacity
                style={[
                  styles.toggleCheckbox,
                  isPremiumAbuDhabi && styles.toggleCheckboxActive,
                ]}
                onPress={() => setIsPremiumAbuDhabi(!isPremiumAbuDhabi)}
              >
                <Text style={styles.checkboxText}>
                  {isPremiumAbuDhabi ? "YES" : "NO"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 3. HOURLY DURATION SELECTION DOCK */}
          <Text style={styles.sectionSubTitle}>Ticket Duration (Hours)</Text>
          <View style={styles.durationSelectorRow}>
            {[1, 2, 3, 4].map((hr) => (
              <TouchableOpacity
                key={hr}
                style={[
                  styles.durationChip,
                  duration === hr && styles.durationChipActive,
                ]}
                onPress={() => setDuration(hr)}
              >
                <Text
                  style={[
                    styles.durationText,
                    duration === hr && styles.textWhite,
                  ]}
                >
                  {hr}h
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 4. MAIN ACTION BUTTON TRIGGER DISPATCHER */}
          <TouchableOpacity
            style={styles.launchButton}
            onPress={handleTriggerSMS}
          >
            <Text style={styles.launchButtonText}>
              Generate & Send SMS Ticket
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8E8E93",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionSubTitle: {
    color: "#8E8E93",
    fontSize: 13,
    marginBottom: 10,
    marginTop: 5,
  },
  warningBox: {
    backgroundColor: "#1C1C1E",
    borderRadius: 8,
    padding: 15,
    borderLeftWidth: 3,
    borderLeftColor: "#FFD60A",
  },
  warningText: {
    color: "#AEAEB2",
    fontSize: 14,
    lineHeight: 20,
  },
  carSliderContainer: {
    flexDirection: "row",
    marginBottom: 25,
  },
  carCard: {
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    padding: 16,
    width: 150,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#222",
  },
  carCardActive: {
    borderColor: "#0A84FF",
    backgroundColor: "#152E4D",
  },
  carLabel: {
    color: "#AEAEB2",
    fontSize: 15,
    fontWeight: "bold",
  },
  carSubtext: {
    color: "#8E8E93",
    fontSize: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  carPlateDetails: {
    color: "#8E8E93",
    fontSize: 14,
    fontWeight: "600",
  },
  fadeConfigurationPanel: {
    marginTop: 10,
  },
  inputField: {
    backgroundColor: "#1C1C1E",
    color: "#FFF",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  infoNotification: {
    backgroundColor: "#1C1C1E",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    color: "#0A84FF",
    fontSize: 14,
  },
  rowLayoutToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1C1C1E",
    padding: 14,
    borderRadius: 8,
    marginBottom: 20,
  },
  toggleLabel: {
    color: "#FFF",
    fontSize: 14,
  },
  toggleCheckbox: {
    backgroundColor: "#3A3A3C",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  toggleCheckboxActive: {
    backgroundColor: "#FFD60A",
  },
  checkboxText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  durationSelectorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  durationChip: {
    backgroundColor: "#1C1C1E",
    flex: 0.22,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  durationChipActive: {
    backgroundColor: "#0A84FF",
  },
  durationText: {
    color: "#8E8E93",
    fontSize: 15,
    fontWeight: "600",
  },
  launchButton: {
    backgroundColor: "#0A84FF",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  launchButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  textWhite: {
    color: "#FFF",
  },
  locationBanner: {
    backgroundColor: "#1C1C1E",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#3A3A3C",
  },
  locationBannerProcessing: {
    backgroundColor: "#152E4D",
    borderColor: "#0A84FF",
  },
  locationBannerText: {
    color: "#0A84FF",
    fontSize: 15,
    fontWeight: "bold",
  },
  locationSubText: {
    color: "#30D158",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },
});
