import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { FontAwesome6 } from "@expo/vector-icons";

import { Theme } from "@/constants/Theme";
import { ParkingSession, useApp } from "@/src/context/AppContext";
import { ParkingRenewalAction } from "@/components/parking/ParkingRenewalFlow";
import {
  useZoneGardDialog,
  ZoneGardDialog,
} from "@/components/ui/ZoneGardDialog";

export default function ParkingSessionsScreen() {
  const { parkingSessions, clearParkingHistory, endParkingSession } = useApp();
  const [sessionToEnd, setSessionToEnd] = useState<ParkingSession | null>(null);
  const [isClearHistoryVisible, setIsClearHistoryVisible] = useState(false);
  const { showDialog, dialog } = useZoneGardDialog();

  const groupedSessions = useMemo(() => {
    return {
      active: parkingSessions.filter((s) => s.status === "active"),
      completed: parkingSessions.filter((s) => s.status !== "active"),
    };
  }, [parkingSessions]);

  const handleClearHistory = () => {
    if (groupedSessions.completed.length === 0) return;
    setIsClearHistoryVisible(true);
  };

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      <Stack.Screen
        options={{
          title: "Parking Sessions",
          headerRight: () =>
            groupedSessions.completed.length > 0 ? (
              <Pressable onPress={handleClearHistory} style={styles.clearBtn}>
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            ) : null,
          headerStyle: {
            backgroundColor: Theme.colors.primary,
          },
          headerTintColor: "#000",
          headerTitleStyle: {
            fontWeight: "700",
          },
        }}
      />

      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <FontAwesome6
            name="clock-rotate-left"
            size={22}
            color={Theme.colors.textPrimary}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>My Parking Sessions</Text>
          <Text style={styles.heroSub}>
            {parkingSessions.length > 0
              ? `${parkingSessions.length} saved session${
                  parkingSessions.length === 1 ? "" : "s"
                }`
              : "Your completed parking sessions will appear here."}
          </Text>
        </View>
      </View>

      {parkingSessions.length === 0 ? (
        <View style={styles.emptyCard}>
          <FontAwesome6
            name="square-parking"
            size={28}
            color={Theme.colors.textMuted}
          />
          <Text style={styles.emptyTitle}>No parking sessions yet</Text>
          <Text style={styles.emptySub}>
            Start a parking ticket from the Parking tab. ZoneGard will save it
            here automatically.
          </Text>
        </View>
      ) : (
        <>
          {groupedSessions.active.length > 0 && (
            <>
              <SectionTitle title="Active" />
              {groupedSessions.active.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onEnd={() => setSessionToEnd(session)}
                />
              ))}
            </>
          )}

          {groupedSessions.completed.length > 0 && (
            <>
              <SectionTitle title="History" />
              {groupedSessions.completed.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </>
          )}
        </>
      )}
      </ScrollView>

      <ZoneGardDialog
        visible={!!sessionToEnd}
        title="End Tracking"
        icon="circle-stop"
        message={
          sessionToEnd
            ? `Stop tracking parking for ${sessionToEnd.vehicleLabel}? This does not cancel parking with the authority.`
            : undefined
        }
        onClose={() => setSessionToEnd(null)}
        secondaryAction={{
          label: "Keep Tracking",
          onPress: () => setSessionToEnd(null),
        }}
        destructiveAction={{
          label: "End Tracking",
          onPress: () => {
            if (sessionToEnd) endParkingSession(sessionToEnd.id);
            setSessionToEnd(null);
          },
        }}
      />

      <ZoneGardDialog
        visible={isClearHistoryVisible}
        title="Clear Parking History"
        icon="trash"
        message="This removes completed and expired parking sessions from this device and cloud backup. Active parking tracking is preserved."
        onClose={() => setIsClearHistoryVisible(false)}
        secondaryAction={{
          label: "Cancel",
          onPress: () => setIsClearHistoryVisible(false),
        }}
        destructiveAction={{
          label: "Clear History",
          onPress: async () => {
            setIsClearHistoryVisible(false);
            const result = await clearParkingHistory();
            showDialog({
              title: result.cleared
                ? "Parking History Cleared"
                : "History Not Cleared",
              message: result.cleared
                ? "Completed and expired parking sessions were removed. Active tracking was preserved."
                : result.reason,
              icon: result.cleared ? "circle-check" : "circle-exclamation",
              primaryAction: { label: "Done", onPress: () => {} },
            });
          },
        }}
      />
      {dialog}
    </>
  );
}



function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function SessionCard({
  session,
  onEnd,
}: {
  session: ParkingSession;
  onEnd?: () => void;
}) {
  const start = formatTime(session.startedAt);
  const end = formatTime(session.endedAt ?? session.expiryTimestamp);

  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionTop}>
        <View style={styles.carIcon}>
          <FontAwesome6
            name="car-side"
            size={17}
            color={Theme.colors.textPrimary}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.vehicleName}>{session.vehicleLabel}</Text>
          <Text style={styles.plateText}>{session.plateDetails}</Text>
        </View>

        <StatusPill status={session.status} />
      </View>

      <View style={styles.divider} />

      <View style={styles.metaRow}>
        <MetaItem icon="location-dot" label={session.parkingEmirate} />
        <MetaItem
          icon="map-pin"
          label={session.zoneCode ? `Zone ${session.zoneCode}` : "No zone"}
        />
      </View>

      <View style={styles.metaRow}>
        <MetaItem icon="calendar-day" label={formatDate(session.startedAt)} />
        <MetaItem icon="clock" label={`${start} → ${end}`} />
      </View>

      <View style={styles.durationPill}>
        <FontAwesome6
          name="hourglass-half"
          size={12}
          color={Theme.colors.textSecondary}
        />
        <Text style={styles.durationText}>
          {session.durationHours
            ? `${session.durationHours} hour${
                session.durationHours === 1 ? "" : "s"
              }`
            : getDurationLabel(session.startedAt, session.expiryTimestamp)}
        </Text>
      </View>
      {session.status === "active" && <ParkingRenewalAction session={session} />}
      {session.status === "active" && onEnd && (
        <Pressable style={styles.endSessionButton} onPress={onEnd}>
          <FontAwesome6
            name="circle-stop"
            size={13}
            color={Theme.colors.danger}
          />

          <Text style={styles.endSessionText}>End Tracking</Text>
        </Pressable>
      )}
    </View>
  );
}

function MetaItem({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof FontAwesome6>["name"];
  label: string;
}) {
  return (
    <View style={styles.metaItem}>
      <FontAwesome6 name={icon} size={12} color={Theme.colors.textMuted} />
      <Text style={styles.metaText}>{label}</Text>
    </View>
  );
}

function StatusPill({
  status,
}: {
  status: "active" | "completed" | "expired";
}) {
  const config = {
    active: {
      label: "Active",
      bg: "#DCFCE7",
      text: "#166534",
    },
    completed: {
      label: "Completed",
      bg: "#E0F2FE",
      text: "#075985",
    },
    expired: {
      label: "Expired",
      bg: "#FEE2E2",
      text: "#991B1B",
    },
  }[status];

  return (
    <View style={[styles.statusPill, { backgroundColor: config.bg }]}>
      <Text style={[styles.statusText, { color: config.text }]}>
        {config.label}
      </Text>
    </View>
  );
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("en-AE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDurationLabel(startedAt: number, expiryTimestamp: number) {
  const diffMs = Math.max(expiryTimestamp - startedAt, 0);
  const hours = Math.round(diffMs / (1000 * 60 * 60));

  if (hours <= 0) return "Less than 1 hour";
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  clearBtn: {
    marginRight: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#FEE2E2",
  },
  clearText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "900",
  },
  heroCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    marginBottom: 20,
    ...Theme.shadow.card,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: Theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 21,
    fontWeight: "900",
  },
  heroSub: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  emptyCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: "center",
  },
  emptyTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 16,
  },
  emptySub: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },
  sectionTitle: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 6,
  },
  sessionCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 12,
    ...Theme.shadow.card,
  },
  sessionTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  carIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: Theme.colors.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleName: {
    color: Theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
  },
  plateText: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "900",
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginVertical: 14,
  },
  metaRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  metaItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minWidth: 0,
  },
  metaText: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
  },
  durationPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: Theme.colors.elevated,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginTop: 2,
  },
  durationText: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },

  //End session button
  endSessionButton: {
    marginTop: 14,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.colors.danger,
    backgroundColor: Theme.colors.dangerMuted,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  endSessionText: {
    color: Theme.colors.danger,
    fontSize: 12,
    fontWeight: "900",
  },
});
