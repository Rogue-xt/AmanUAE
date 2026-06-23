import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useApp, VehicleProfile } from "../../src/context/AppContext";
import { Theme } from "@/constants/Theme";
import { FadeInView } from "@/components/ui/FadeInView";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ScreenContainer, SectionHeader } from "@/components/ui/ScreenLayout";
import { useRouter } from "expo-router";
import {
  EMIRATES_LIST,
  computeComplianceScore,
  formatDocType,
  formatEmirate,
  getDaysRemaining,
  getGreeting,
  getUrgency,
} from "@/components/ui/utils";

export default function DashboardScreen() {
  const {
    vehicles,
    documents,
    addVehicle,
    deleteVehicle,
    activeTicket,
    clearParkingSession,
  } = useApp();
  const router = useRouter();
  const [now, setNow] = useState(Date.now());
  const [label, setLabel] = useState("");
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
        expiresAt: new Date(activeTicket.expiryTimestamp).toLocaleTimeString(
          [],
          { hour: "2-digit", minute: "2-digit" },
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
      expiresAt: new Date(activeTicket.expiryTimestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  }, [activeTicket, now]);

  const urgentDocuments = useMemo(() => {
    return [...documents]
      .map((doc) => ({
        ...doc,
        daysRemaining: getDaysRemaining(doc.expiryDate),
      }))
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 3);
  }, [documents]);

  const alertCount = useMemo(() => {
    return documents.filter((doc) => {
      const days = getDaysRemaining(doc.expiryDate);
      return getUrgency(days) !== "Safe";
    }).length;
  }, [documents]);

  const complianceScore = useMemo(
    () =>
      computeComplianceScore(
        documents,
        !!activeTicket && !!ticketInfo && !ticketInfo.expired,
      ),
    [documents, activeTicket, ticketInfo],
  );

  const complianceColor =
    complianceScore >= 80
      ? Theme.colors.success
      : complianceScore >= 50
        ? Theme.colors.warning
        : Theme.colors.danger;

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <FadeInView delay={0}>
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>ZG</Text>
            </View>
            <View style={styles.brandText}>
              <Text style={styles.brandName}>ZoneGard</Text>
              <Text style={styles.brandTagline}>
                UAE Parking & Document Shield
              </Text>
            </View>
          </View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
        </FadeInView>

        <FadeInView delay={80}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <FontAwesome6
                name="car-side"
                size={14}
                color={Theme.colors.primaryGlow}
              />
              <Text style={styles.summaryValue}>{vehicles.length}</Text>
              <Text style={styles.summaryLabel}>Vehicles</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <FontAwesome6
                name="file-shield"
                size={14}
                color={Theme.colors.primaryGlow}
              />
              <Text style={styles.summaryValue}>{documents.length}</Text>
              <Text style={styles.summaryLabel}>Documents</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <FontAwesome6
                name="bell"
                size={14}
                color={
                  alertCount > 0 ? Theme.colors.warning : Theme.colors.textMuted
                }
              />
              <Text
                style={[
                  styles.summaryValue,
                  alertCount > 0 && { color: Theme.colors.warning },
                ]}
              >
                {alertCount}
              </Text>
              <Text style={styles.summaryLabel}>Alerts</Text>
            </View>
          </View>
        </FadeInView>

        <FadeInView delay={160}>
          {activeTicket && ticketInfo ? (
            <View
              style={[
                styles.heroCard,
                ticketInfo.expired && styles.heroCardExpired,
              ]}
            >
              <View style={styles.heroTop}>
                <View>
                  <Text
                    style={[
                      styles.heroKicker,
                      ticketInfo.expired && { color: Theme.colors.danger },
                    ]}
                  >
                    {ticketInfo.expired ? "Session Expired" : "Active Parking"}
                  </Text>
                  <Text style={styles.heroVehicle}>
                    {activeTicket.vehicleLabel}
                  </Text>
                  <Text style={styles.heroMeta}>
                    {activeTicket.parkingEmirate} · {activeTicket.plateDetails}
                  </Text>
                </View>
                <View style={styles.complianceRing}>
                  <Text
                    style={[styles.complianceValue, { color: complianceColor }]}
                  >
                    {complianceScore}%
                  </Text>
                  <Text style={styles.complianceLabel}>Score</Text>
                </View>
              </View>

              <View style={styles.timerSection}>
                <Text style={styles.timerLabel}>Time Remaining</Text>
                <Text style={styles.timerDisplay}>
                  {ticketInfo.expired
                    ? "00:00"
                    : `${String(ticketInfo.minutes).padStart(2, "0")}:${String(ticketInfo.seconds).padStart(2, "0")}`}
                </Text>
                <Text style={styles.expiryText}>
                  Expires at {ticketInfo.expiresAt}
                </Text>
              </View>

              <PrimaryButton
                label={ticketInfo.expired ? "Clear Session" : "End Session"}
                onPress={clearParkingSession}
                variant="ghost"
                style={styles.endButton}
              />
            </View>
          ) : (
            <View style={styles.heroCardEmpty}>
              <View style={styles.emptyHeroIcon}>
                <FontAwesome6
                  name="square-parking"
                  size={28}
                  color={Theme.colors.primaryGlow}
                />
              </View>
              <Text style={styles.emptyHeroTitle}>No Active Parking</Text>
            </View>
          )}
        </FadeInView>

        <FadeInView delay={320}>
          <View style={styles.sectionCard}>
            <SectionHeader
              title="Critical Documents"
              subtitle="Nearest expiry in your vault"
              badge={documents.length}
            />
            {urgentDocuments.length === 0 ? (
              <Text style={styles.emptyText}>
                No documents tracked yet. Add records in the Vault tab.
              </Text>
            ) : (
              urgentDocuments.map((doc) => (
                <View key={doc.id} style={styles.docRow}>
                  <View style={styles.docIcon}>
                    <FontAwesome6
                      name="file-lines"
                      size={14}
                      color={Theme.colors.primaryGlow}
                    />
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docTitle}>
                      {doc.title || formatDocType(doc.type)}
                    </Text>
                    <Text style={styles.docMeta}>
                      {formatDocType(doc.type)} · {doc.expiryDate}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.docDays,
                      doc.daysRemaining <= 30 && styles.docDaysDanger,
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
        </FadeInView>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Theme.spacing.xl,
    paddingBottom: 120,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  logoBox: {
    width: 52,
    height: 52,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.colors.elevated,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Theme.shadow.glow,
  },
  logoText: {
    color: Theme.colors.primaryGlow,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },
  brandText: {
    flex: 1,
  },
  brandName: {
    color: Theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  brandTagline: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  greeting: {
    color: Theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: Theme.spacing.xl,
  },
  summaryRow: {
    flexDirection: "row",
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Theme.colors.border,
    marginHorizontal: Theme.spacing.sm,
  },
  summaryValue: {
    color: Theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  summaryLabel: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  heroCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xxl,
    padding: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    marginBottom: Theme.spacing.lg,
    ...Theme.shadow.glow,
  },
  heroCardExpired: {
    borderColor: Theme.colors.danger,
    ...Theme.shadow.card,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Theme.spacing.lg,
  },
  heroKicker: {
    ...Theme.typography.label,
    color: Theme.colors.success,
    marginBottom: Theme.spacing.xs,
  },
  heroVehicle: {
    color: Theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  heroMeta: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  complianceRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Theme.colors.surface,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  complianceValue: {
    fontSize: 16,
    fontWeight: "900",
  },
  complianceLabel: {
    color: Theme.colors.textMuted,
    fontSize: 8,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  timerSection: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    alignItems: "center",
    marginBottom: Theme.spacing.md,
  },
  timerLabel: {
    ...Theme.typography.label,
    color: Theme.colors.textMuted,
    marginBottom: Theme.spacing.xs,
  },
  timerDisplay: {
    ...Theme.typography.mono,
    color: Theme.colors.textPrimary,
  },
  expiryText: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    marginTop: Theme.spacing.xs,
  },
  endButton: {
    marginTop: Theme.spacing.sm,
  },
  heroCardEmpty: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xxl,
    padding: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    marginBottom: Theme.spacing.lg,
  },
  emptyHeroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Theme.spacing.md,
  },
  emptyHeroTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
  },
  emptyHeroSub: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    marginTop: Theme.spacing.sm,
    lineHeight: 19,
  },

  kpiRow: {
    flexDirection: "row",
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.lg,
  },
  sectionCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.lg,
  },
  emptyText: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  docIcon: {
    width: 32,
    height: 32,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Theme.spacing.md,
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  docMeta: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  docDays: {
    color: Theme.colors.warning,
    fontSize: 12,
    fontWeight: "800",
  },
  docDaysDanger: {
    color: Theme.colors.danger,
  },
});
