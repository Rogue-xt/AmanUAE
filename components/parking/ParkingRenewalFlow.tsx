import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AppState,
  AppStateStatus,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Theme } from "@/constants/Theme";
import { ZoneGardDialog } from "@/components/ui/ZoneGardDialog";
import { ParkingSession, useApp } from "@/src/context/AppContext";
import {
  calculateRenewedParkingExpiry,
  isParkingEmirate,
} from "@/src/config/parkingRules";
import { getParkingRenewalRequest } from "@/src/utils/parkingFormatter";

type Step = "details" | "sent" | "authority" | "pending" | "result" | null;

type PendingRenewal = {
  sessionId: string;
  expectedExpiryTimestamp: number;
};

type RenewalAvailability =
  | {
      available: true;
      request: ReturnType<typeof getParkingRenewalRequest>;
      renewedExpiry: number;
    }
  | { available: false; reason: string };

type RenewalContextValue = {
  openRenewal: (session: ParkingSession) => void;
  confirmPendingRenewal: () => void;
  cancelPendingRenewal: () => void;
  pendingSessionId: string | null;
  getAvailability: (session: ParkingSession, now?: number) => RenewalAvailability;
};

const RenewalContext = createContext<RenewalContextValue | undefined>(
  undefined,
);

export function getParkingRenewalAvailability(
  session: ParkingSession,
  now = Date.now(),
): RenewalAvailability {
  if (session.status !== "active" || session.expiryTimestamp <= now) {
    return { available: false, reason: "This parking session has expired." };
  }

  if (!isParkingEmirate(session.parkingEmirate)) {
    return {
      available: false,
      reason: "Renewal is not available for this parking area.",
    };
  }

  try {
    const request = getParkingRenewalRequest(session.parkingEmirate);
    const renewedExpiry = calculateRenewedParkingExpiry({
      parkingEmirate: session.parkingEmirate,
      parkingType: session.parkingType,
      startedAt: session.startedAt,
      expiryTimestamp: session.expiryTimestamp,
    });

    return { available: true, request, renewedExpiry };
  } catch (error) {
    console.warn("Parking renewal unavailable:", error);

    if (session.parkingEmirate === "AbuDhabi" && !session.parkingType) {
      return {
        available: false,
        reason:
          "This saved session does not record whether the Abu Dhabi bay is Standard or Premium.",
      };
    }

    return {
      available: false,
      reason: "This parking session has reached its maximum allowed duration.",
    };
  }
}

export function ParkingRenewalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { parkingSessions, renewParkingSession } = useApp();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [pendingRenewal, setPendingRenewal] =
    useState<PendingRenewal | null>(null);
  const [step, setStep] = useState<Step>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState({
    title: "",
    message: "",
    success: false,
  });
  const pendingRef = useRef<PendingRenewal | null>(null);
  const currentAppState = useRef<AppStateStatus>(AppState.currentState);
  const didLeaveForSms = useRef(false);
  const didShowReturnPrompt = useRef(false);

  const selectedSession = useMemo(
    () => parkingSessions.find((session) => session.id === selectedSessionId),
    [parkingSessions, selectedSessionId],
  );
  const availability = selectedSession
    ? getParkingRenewalAvailability(selectedSession)
    : null;

  const clearPending = () => {
    pendingRef.current = null;
    setPendingRenewal(null);
    setSelectedSessionId(null);
    setStep(null);
    didLeaveForSms.current = false;
    didShowReturnPrompt.current = false;
  };

  const showResult = (title: string, message: string, success = false) => {
    setResult({ title, message, success });
    setStep("result");
  };

  const openRenewal = (session: ParkingSession) => {
    if (pendingRef.current) {
      if (pendingRef.current.sessionId === session.id) {
        setSelectedSessionId(session.id);
        setStep("pending");
      } else {
        showResult(
          "Renewal already pending",
          "Finish or cancel the current renewal before starting another one.",
        );
      }
      return;
    }

    const nextAvailability = getParkingRenewalAvailability(session);
    setSelectedSessionId(session.id);

    if (!nextAvailability.available) {
      showResult("Renewal unavailable", nextAvailability.reason);
      return;
    }

    setStep("details");
  };

  const openSms = async () => {
    if (!selectedSession || !availability?.available) return;

    const smsUrl = `sms:${availability.request.recipient}?body=${encodeURIComponent(
      availability.request.body,
    )}`;

    try {
      const canOpen = await Linking.canOpenURL(smsUrl);

      if (!canOpen) {
        showResult(
          "SMS unavailable",
          "ZoneGard could not open the SMS app on this device.",
        );
        return;
      }

      const pending = {
        sessionId: selectedSession.id,
        expectedExpiryTimestamp: selectedSession.expiryTimestamp,
      };
      pendingRef.current = pending;
      setPendingRenewal(pending);
      didLeaveForSms.current = false;
      didShowReturnPrompt.current = false;
      setStep(null);
      await Linking.openURL(smsUrl);
    } catch (error) {
      console.error("Failed to open renewal SMS:", error);
      clearPending();
      setSelectedSessionId(selectedSession.id);
      showResult(
        "SMS unavailable",
        "ZoneGard could not open the renewal SMS composer.",
      );
    }
  };

  const confirmRenewal = async () => {
    const pending = pendingRef.current;
    if (!pending || isSubmitting) return;

    setIsSubmitting(true);
    const renewalResult = await renewParkingSession(pending);
    setIsSubmitting(false);

    if (!renewalResult.renewed) {
      console.warn("Parking renewal was not applied:", renewalResult.reason);
      showResult(
        "Renewal not applied",
        renewalResult.reason?.includes("maximum")
          ? "This parking session has reached its maximum allowed duration."
          : "The session changed or expired before the renewal could be saved.",
      );
      return;
    }

    pendingRef.current = null;
    setPendingRenewal(null);
    showResult(
      "Parking renewed",
      renewalResult.notificationWarning
        ? "The timer was extended by one hour, but local parking notifications could not be fully refreshed."
        : "The existing parking timer was extended by one hour.",
      true,
    );
  };

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasAway =
        currentAppState.current === "inactive" ||
        currentAppState.current === "background";

      if (
        pendingRef.current &&
        (nextState === "inactive" || nextState === "background")
      ) {
        didLeaveForSms.current = true;
      }

      if (
        pendingRef.current &&
        nextState === "active" &&
        wasAway &&
        didLeaveForSms.current &&
        !didShowReturnPrompt.current
      ) {
        didShowReturnPrompt.current = true;
        setStep("sent");
      }

      currentAppState.current = nextState;
    });

    return () => subscription.remove();
  }, []);

  const contextValue = useMemo<RenewalContextValue>(
    () => ({
      openRenewal,
      confirmPendingRenewal: () => setStep("authority"),
      cancelPendingRenewal: clearPending,
      pendingSessionId: pendingRenewal?.sessionId ?? null,
      getAvailability: getParkingRenewalAvailability,
    }),
    [pendingRenewal],
  );

  const request = availability?.available ? availability.request : null;

  return (
    <RenewalContext.Provider value={contextValue}>
      {children}

      <ZoneGardDialog
        visible={step === "details" && !!selectedSession && !!request}
        title="Renew Parking"
        icon="rotate"
        onClose={() => setStep(null)}
        primaryAction={{ label: "Open Renewal SMS", onPress: openSms }}
        secondaryAction={{ label: "Cancel", onPress: () => setStep(null) }}
      >
        {selectedSession && request ? (
          <View style={styles.detailPanel}>
            <Text style={styles.sessionName}>
              {selectedSession.parkingEmirate} Parking
            </Text>
            <Detail label="Current expiry" value={formatTime(selectedSession.expiryTimestamp)} />
            <Detail label="Extension" value={`+${request.extensionHours} hour`} />
            <Detail label="SMS recipient" value={request.recipient} />
            <Detail label="Message" value={request.body} />
          </View>
        ) : null}
      </ZoneGardDialog>

      <ZoneGardDialog
        visible={step === "sent"}
        title="SMS Sent?"
        icon="paper-plane"
        message="Did you send the parking renewal SMS? Your ZoneGard timer has not been extended yet."
        onClose={clearPending}
        primaryAction={{
          label: "Yes, I Sent It",
          onPress: () => setStep("authority"),
        }}
        secondaryAction={{ label: "No, Cancel", onPress: clearPending }}
      />

      <ZoneGardDialog
        visible={step === "authority"}
        title="Renewal Confirmation"
        icon="message-circle-check"
        message="Did you receive confirmation from the parking authority that your parking was extended? Only confirm after receiving the authority's successful renewal message."
        onClose={() => setStep("pending")}
        closeDisabled={isSubmitting}
        primaryAction={{
          label: isSubmitting ? "Confirming..." : "Yes, Renewal Confirmed",
          onPress: confirmRenewal,
          variant: "success",
          disabled: isSubmitting,
        }}
        secondaryAction={{
          label: "Not Yet",
          onPress: () => setStep("pending"),
          disabled: isSubmitting,
        }}
      />

      <ZoneGardDialog
        visible={step === "pending"}
        title="Renewal Confirmation Pending"
        icon="clock"
        message="Your timer has NOT been extended. Confirm only after the parking authority reports a successful renewal."
        onClose={() => setStep(null)}
        primaryAction={{
          label: "Confirm Renewal",
          onPress: () => setStep("authority"),
        }}
        secondaryAction={{ label: "Keep Waiting", onPress: () => setStep(null) }}
        destructiveAction={{ label: "Cancel Renewal", onPress: clearPending }}
      />

      <ZoneGardDialog
        visible={step === "result"}
        title={result.title}
        icon={result.success ? "circle-check" : "triangle-exclamation"}
        message={result.message}
        onClose={() => {
          setStep(null);
          if (result.success) setSelectedSessionId(null);
        }}
        primaryAction={{
          label: "Done",
          onPress: () => {
            setStep(null);
            if (result.success) setSelectedSessionId(null);
          },
        }}
      />
    </RenewalContext.Provider>
  );
}

export function ParkingRenewalAction({
  session,
  compact = false,
}: {
  session: ParkingSession;
  compact?: boolean;
}) {
  const renewal = useParkingRenewal();
  const availability = renewal.getAvailability(session);
  const isPending = renewal.pendingSessionId === session.id;

  if (!availability.available && !isPending) return null;

  if (isPending) {
    return (
      <View style={styles.pendingCard}>
        <Text style={styles.pendingTitle}>Renewal confirmation pending</Text>
        <Text style={styles.pendingText}>Your timer has NOT been extended.</Text>
        <View style={styles.pendingActions}>
          <Pressable
            style={styles.pendingPrimary}
            onPress={renewal.confirmPendingRenewal}
          >
            <Text style={styles.pendingPrimaryText}>Confirm Renewal</Text>
          </Pressable>
          <Pressable onPress={renewal.cancelPendingRenewal}>
            <Text style={styles.pendingCancelText}>Cancel Renewal</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Renew parking for ${session.vehicleLabel}`}
      style={[styles.renewButton, compact && styles.renewButtonCompact]}
      onPress={() => renewal.openRenewal(session)}
    >
      <FontAwesome6 name="rotate" size={13} color={Theme.colors.textPrimary} />
      <Text style={styles.renewButtonText}>Renew Parking</Text>
    </Pressable>
  );
}

function useParkingRenewal() {
  const context = useContext(RenewalContext);
  if (!context) {
    throw new Error("Parking renewal must be used inside ParkingRenewalProvider.");
  }
  return context;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("en-AE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const styles = StyleSheet.create({
  detailPanel: {
    gap: Theme.spacing.md,
  },
  sessionName: {
    color: Theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: Theme.spacing.xs,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Theme.spacing.lg,
    paddingBottom: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.borderSubtle,
  },
  detailLabel: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  detailValue: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "900",
  },
  renewButton: {
    minHeight: 44,
    marginTop: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Theme.spacing.sm,
  },
  renewButtonCompact: {
    flex: 1,
    marginTop: 0,
  },
  renewButtonText: {
    color: Theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "900",
  },
  pendingCard: {
    marginTop: Theme.spacing.md,
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.warningMuted,
    borderWidth: 1,
    borderColor: Theme.colors.warning,
  },
  pendingTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "900",
  },
  pendingText: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    marginTop: Theme.spacing.xs,
  },
  pendingActions: {
    marginTop: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  pendingPrimary: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.primary,
  },
  pendingPrimaryText: {
    color: Theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: "900",
  },
  pendingCancelText: {
    color: Theme.colors.danger,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
});
