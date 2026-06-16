import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
} from "react-native";
import { useApp, VehicleProfile } from "../../src/context/AppContext";

// Simple list reference array to render the 7 emirates selector choices
const EMIRATES_LIST: Array<VehicleProfile["emirate"]> = [
  "Dubai",
  "AbuDhabi",
  "Sharjah",
  "Ajman",
  "RasAlKhaimah",
  "UmmAlQuwain",
  "Fujairah",
];

const getDaysRemaining = (expiryDate: string) => {
  const today = new Date();
  const expiry = new Date(`${expiryDate}T00:00:00`);
  today.setHours(0, 0, 0, 0);

  return Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
};

const formatDocType = (type: string) => {
  const map: Record<string, string> = {
    EmiratesID: "Emirates ID",
    Mulkiya: "Mulkiya",
    DrivingLicense: "Driving License",
    Passport: "Passport",
    Visa: "Visa",
    Insurance: "Insurance",
    Ejari: "Ejari",
    Other: "Other",
  };

  return map[type] || type;
};
export default function DashboardScreen() {
  const {
    vehicles,
    documents,
    addVehicle,
    deleteVehicle,
    activeTicket,
    clearParkingSession,
    startParkingSession,
  } = useApp();


  const handleStartTestTimer = async () => {
    await startParkingSession({
      vehicleLabel: "Test Vehicle",
      plateDetails: "A 12345",
      parkingEmirate: "Dubai",
      expiryTimestamp: Date.now() + 2 * 60 * 1000, // 2 minutes
    });
  };

  const urgentDocuments = useMemo(() => {
    return [...documents]
      .map((doc) => ({
        ...doc,
        daysRemaining: getDaysRemaining(doc.expiryDate),
      }))
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 3);
  }, [documents]);

const [now, setNow] = useState(Date.now());
  // Form input control state variables
  const [label, setLabel] = useState("");
  const [selectedEmirate, setSelectedEmirate] =
    useState<VehicleProfile["emirate"]>("Dubai");
  const [plateCode, setPlateCode] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  
  useEffect(() => {
    if (activeTicket && activeTicket.expiryTimestamp <= now) {
      clearParkingSession();
    }
  }, [activeTicket, now]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const ticketInfo = useMemo(() => {
    if (!activeTicket) return null;

    const remainingMs = activeTicket.expiryTimestamp - now;

    if (remainingMs <= 0) {
      return {
        expired: true,
        minutes: 0,
        seconds: 0,
        percent: 0,
        expiresAt: new Date(activeTicket.expiryTimestamp).toLocaleTimeString(
          [],
          {
            hour: "2-digit",
            minute: "2-digit",
          },
        ),
      };
    }

    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return {
      expired: false,
      minutes,
      seconds,
      percent: 100,
      expiresAt: new Date(activeTicket.expiryTimestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  }, [activeTicket, now]);
  // Handle data validation and dispatch to local storage
  const handleAddVehicle = async () => {
    if (!label.trim() || !plateCode.trim() || !plateNumber.trim()) {
      Alert.alert(
        "Missing Info",
        "Please fill out all the fields to secure your profile.",
      );
      return;
    }

    await addVehicle({
      label: label.trim(),
      emirate: selectedEmirate,
      plateCode: plateCode.trim().toUpperCase(),
      plateNumber: plateNumber.trim(),
    });

    // Reset fields for clear subsequent entries
    setLabel("");
    setPlateCode("");
    setPlateNumber("");
    Alert.alert(
      "Profile Secured",
      "Vehicle successfully locked into local storage memory.",
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>ZoneGard Vault</Text>

      <TouchableOpacity
        style={styles.testTimerButton}
        onPress={handleStartTestTimer}
      >
        <Text style={styles.testTimerButtonText}>Start 2 Min Test Timer</Text>
      </TouchableOpacity>

      {activeTicket && ticketInfo && (
        <View
          style={[
            styles.activeTicketCard,
            ticketInfo.expired && styles.activeTicketExpired,
          ]}
        >
          <View>
            <Text style={styles.activeTicketTitle}>
              {ticketInfo.expired ? "Parking Expired" : "Active Parking"}
            </Text>

            <Text style={styles.activeTicketVehicle}>
              {activeTicket.vehicleLabel}
            </Text>

            <Text style={styles.activeTicketDetails}>
              {activeTicket.parkingEmirate} • {activeTicket.plateDetails}
            </Text>

            <Text style={styles.activeTicketExpiry}>
              Expires at {ticketInfo.expiresAt}
            </Text>
          </View>

          <View style={styles.timerBox}>
            <Text style={styles.timerText}>
              {ticketInfo.expired
                ? "00:00"
                : `${String(ticketInfo.minutes).padStart(2, "0")}:${String(
                    ticketInfo.seconds,
                  ).padStart(2, "0")}`}
            </Text>

            <TouchableOpacity
              style={styles.clearTicketButton}
              onPress={clearParkingSession}
            >
              <Text style={styles.clearTicketText}>
                {ticketInfo.expired ? "Clear" : "End"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.dashboardCard}>
        <View style={styles.dashboardCardHeader}>
          <View>
            <Text style={styles.dashboardCardTitle}>Critical Documents</Text>
            <Text style={styles.dashboardCardSub}>
              Nearest expiry records in your vault
            </Text>
          </View>
          <Text style={styles.dashboardBadge}>{documents.length}</Text>
        </View>

        {urgentDocuments.length === 0 ? (
          <Text style={styles.dashboardEmptyText}>
            No documents tracked yet. Add records in the Vault tab.
          </Text>
        ) : (
          urgentDocuments.map((doc) => (
            <View key={doc.id} style={styles.urgentDocRow}>
              <View>
                <Text style={styles.urgentDocTitle}>
                  {doc.title || formatDocType(doc.type)}
                </Text>
                <Text style={styles.urgentDocMeta}>
                  {formatDocType(doc.type)} • {doc.expiryDate}
                </Text>
              </View>

              <Text
                style={[
                  styles.urgentDocDays,
                  doc.daysRemaining <= 30 && styles.urgentDocDanger,
                ]}
              >
                {doc.daysRemaining < 0
                  ? `${Math.abs(doc.daysRemaining)}d overdue`
                  : `${doc.daysRemaining}d left`}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* 1. LIST OF SECURED VEHICLES */}
      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>
          Secured Vehicles ({vehicles.length})
        </Text>
        {vehicles.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No vehicles linked yet. Use the control form below to initialize.
            </Text>
          </View>
        ) : (
          <FlatList
            data={vehicles}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.vehicleCard}>
                <View>
                  <Text style={styles.cardLabel}>{item.label}</Text>
                  <Text style={styles.cardDetails}>
                    {item.emirate} • Code {item.plateCode} • {item.plateNumber}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteVehicle(item.id)}
                >
                  <Text style={styles.deleteButtonText}>Wipe</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>

      {/* 2. ADD NEW PROFILE CONTAINER FORM */}
      <ScrollView
        style={styles.formSection}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Register Vehicle Profile</Text>

        <TextInput
          style={styles.inputField}
          placeholder="Vehicle Nickname (e.g. My Nissan Patrol)"
          placeholderTextColor="#777"
          value={label}
          onChangeText={setLabel}
        />

        {/* Emirate Selection Ribbon */}
        <Text style={styles.inputSubLabel}>
          Select Target Emirate Identity:
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.ribbonContainer}
        >
          {EMIRATES_LIST.map((em) => (
            <TouchableOpacity
              key={em}
              style={[
                styles.ribbonItem,
                selectedEmirate === em && styles.ribbonItemActive,
              ]}
              onPress={() => setSelectedEmirate(em)}
            >
              <Text
                style={[
                  styles.ribbonText,
                  selectedEmirate === em && styles.ribbonTextActive,
                ]}
              >
                {em === "AbuDhabi"
                  ? "Abu Dhabi"
                  : em === "RasAlKhaimah"
                    ? "RAK"
                    : em === "UmmAlQuwain"
                      ? "UAQ"
                      : em}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.rowInputs}>
          <TextInput
            style={[styles.inputField, { flex: 0.3, marginRight: 10 }]}
            placeholder="Code"
            placeholderTextColor="#777"
            value={plateCode}
            onChangeText={setPlateCode}
            autoCapitalize="characters"
          />
          <TextInput
            style={[styles.inputField, { flex: 0.7 }]}
            placeholder="Plate Number"
            placeholderTextColor="#777"
            value={plateNumber}
            keyboardType="numeric"
            onChangeText={setPlateNumber}
          />
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleAddVehicle}
        >
          <Text style={styles.submitButtonText}>Secure Profile Entry</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
    marginBottom: 20,
  },
  listSection: {
    flex: 0.45,
    marginBottom: 15,
  },
  formSection: {
    flex: 0.55,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#8E8E93",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: "#222",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    color: "#555",
    textAlign: "center",
    fontSize: 14,
  },
  vehicleCard: {
    backgroundColor: "#1C1C1E",
    borderRadius: 10,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardLabel: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  cardDetails: {
    color: "#8E8E93",
    fontSize: 13,
    marginTop: 4,
  },
  deleteButton: {
    backgroundColor: "#3A3A3C",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: "#FF453A",
    fontSize: 12,
    fontWeight: "600",
  },
  inputField: {
    backgroundColor: "#1C1C1E",
    color: "#FFF",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  inputSubLabel: {
    color: "#8E8E93",
    fontSize: 13,
    marginBottom: 8,
  },
  ribbonContainer: {
    flexDirection: "row",
    marginBottom: 15,
  },
  ribbonItem: {
    backgroundColor: "#1C1C1E",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 8,
    height: 36,
  },
  ribbonItemActive: {
    backgroundColor: "#0A84FF",
  },
  ribbonText: {
    color: "#8E8E93",
    fontSize: 13,
    fontWeight: "600",
  },
  ribbonTextActive: {
    color: "#FFF",
  },
  rowInputs: {
    flexDirection: "row",
    marginBottom: 15,
  },
  submitButton: {
    backgroundColor: "#30D158",
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginBottom: 30,
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  activeTicketCard: {
    backgroundColor: "#102418",
    borderColor: "#30D158",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activeTicketExpired: {
    backgroundColor: "#2A1111",
    borderColor: "#FF453A",
  },
  activeTicketTitle: {
    color: "#30D158",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  activeTicketVehicle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
  },
  activeTicketDetails: {
    color: "#A1A1AA",
    fontSize: 13,
    marginTop: 4,
  },
  activeTicketExpiry: {
    color: "#8E8E93",
    fontSize: 12,
    marginTop: 6,
  },
  timerBox: {
    alignItems: "center",
  },
  timerText: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "900",
  },
  clearTicketButton: {
    backgroundColor: "#1C1C1E",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginTop: 8,
  },
  clearTicketText: {
    color: "#FF453A",
    fontSize: 12,
    fontWeight: "800",
  },
  testTimerButton: {
    backgroundColor: "#0A84FF",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  testTimerButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "800",
  },
  // styles for docs in dash
  dashboardCard: {
    backgroundColor: "#111827",
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  dashboardCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dashboardCardTitle: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "900",
  },
  dashboardCardSub: {
    color: "#8E8E93",
    fontSize: 12,
    marginTop: 3,
  },
  dashboardBadge: {
    color: "#30D158",
    backgroundColor: "#102418",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
    fontWeight: "900",
    fontSize: 12,
  },
  dashboardEmptyText: {
    color: "#71717A",
    fontSize: 13,
    lineHeight: 19,
  },
  urgentDocRow: {
    backgroundColor: "#0A0A0A",
    borderRadius: 14,
    padding: 13,
    marginTop: 9,
    borderWidth: 1,
    borderColor: "#27272A",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  urgentDocTitle: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "900",
  },
  urgentDocMeta: {
    color: "#8E8E93",
    fontSize: 12,
    marginTop: 4,
  },
  urgentDocDays: {
    color: "#FFD60A",
    fontSize: 13,
    fontWeight: "900",
  },
  urgentDocDanger: {
    color: "#FF453A",
  },
});
