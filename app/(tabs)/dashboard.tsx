import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useRouter } from "expo-router";

import { useApp } from "../../src/context/AppContext";
import { Theme } from "@/constants/Theme";
import { FadeInView } from "@/components/ui/FadeInView";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ScreenContainer, SectionHeader } from "@/components/ui/ScreenLayout";
import {
  computeComplianceScore,
  formatDocType,
  getDaysRemaining,
  getGreeting,
  getUrgency,
} from "@/components/ui/utils";
import { Image } from "expo-image";

export default function DashboardScreen() {
  const {
    vehicles,
    documents,
    activeTicket,
    clearParkingSession,
    parkingSessions,
  } = useApp();

  const router = useRouter();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeTicket && activeTicket.expiryTimestamp <= now) {
      clearParkingSession();
    }
  }, [activeTicket, now, clearParkingSession]);

  const ticketInfo = useMemo(() => {
    if (!activeTicket) return null;

    const remainingMs = activeTicket.expiryTimestamp - now;
    const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      expired: remainingMs <= 0,
      hours,
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
      .slice(0, 4);
  }, [documents]);

  const alertCount = useMemo(() => {
    return documents.filter((doc) => {
      const days = getDaysRemaining(doc.expiryDate);
      return getUrgency(days) !== "Safe";
    }).length;
  }, [documents]);

  const expiredCount = useMemo(() => {
    return documents.filter((doc) => getDaysRemaining(doc.expiryDate) < 0)
      .length;
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

  const timerText = ticketInfo
    ? ticketInfo.hours > 0
      ? `${String(ticketInfo.hours).padStart(2, "0")}:${String(ticketInfo.minutes).padStart(2, "0")}:${String(ticketInfo.seconds).padStart(2, "0")}`
      : `${String(ticketInfo.minutes).padStart(2, "0")}:${String(ticketInfo.seconds).padStart(2, "0")}`
    : "--:--";

  const lastSession = parkingSessions[0];

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.brandRow}>
          <View style={styles.logoWrapper}>
            <Image
              source={require("@/assets/images/ZoneGard-Logo.png")}
              style={styles.logoImage}
              contentFit="cover"
            />
          </View>

          <View style={styles.brandText}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.brandSub}>
              Smart parking & document companion
            </Text>
          </View>

          <Pressable
            style={styles.headerIconButton}
            onPress={() => router.push("/settings")}
          >
            <FontAwesome6
              name="gear"
              size={16}
              color={Theme.colors.textPrimary}
            />
          </Pressable>
        </View>
        <FadeInView delay={80}>
          <View style={styles.metricsGrid}>
            <MetricCard
              icon="car-side"
              label="Vehicles"
              value={vehicles.length}
            />
            <MetricCard
              icon="file-shield"
              label="Documents"
              value={documents.length}
            />
            <MetricCard
              icon="bell"
              label="Alerts"
              value={alertCount}
              tone={
                alertCount > 0 ? Theme.colors.warning : Theme.colors.textMuted
              }
            />
            <MetricCard
              icon="circle-xmark"
              label="Expired"
              value={expiredCount}
              tone={
                expiredCount > 0 ? Theme.colors.danger : Theme.colors.textMuted
              }
            />
          </View>
        </FadeInView>

        <FadeInView delay={140}>
          {activeTicket && ticketInfo ? (
            <View
              style={[
                styles.parkingHero,
                ticketInfo.expired && styles.parkingHeroExpired,
              ]}
            >
              <View style={styles.parkingTopRow}>
                <View style={styles.parkingIconBox}>
                  <FontAwesome6
                    name="square-parking"
                    size={23}
                    color={
                      ticketInfo.expired
                        ? Theme.colors.danger
                        : Theme.colors.primaryGlow
                    }
                  />
                </View>

                <View style={styles.parkingTitleBlock}>
                  <Text
                    style={[
                      styles.parkingKicker,
                      ticketInfo.expired && { color: Theme.colors.danger },
                    ]}
                  >
                    {ticketInfo.expired ? "Parking expired" : "Active parking"}
                  </Text>
                  <Text style={styles.parkingVehicle}>
                    {activeTicket.vehicleLabel}
                  </Text>
                  <Text style={styles.parkingMeta}>
                    {activeTicket.parkingEmirate} • {activeTicket.plateDetails}
                  </Text>
                </View>
              </View>

              <View style={styles.timerBox}>
                <Text style={styles.timerLabel}>Time remaining</Text>
                <Text
                  style={[
                    styles.timerText,
                    ticketInfo.expired && { color: Theme.colors.danger },
                  ]}
                >
                  {ticketInfo.expired ? "00:00" : timerText}
                </Text>
                <Text style={styles.timerSub}>
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
            <View style={styles.emptyParkingHero}>
              <View style={styles.emptyParkingLeft}>
                <View style={styles.emptyParkingIcon}>
                  <FontAwesome6
                    name="square-parking"
                    size={24}
                    color={Theme.colors.primaryGlow}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.emptyParkingTitle}>
                    No active parking
                  </Text>
                  <Text style={styles.emptyParkingSub}>
                    Generate a ticket and ZoneGard will track the countdown.
                  </Text>
                </View>
              </View>

              <Pressable
                style={styles.startParkingButton}
                onPress={() => router.push("/(tabs)/parking")}
              >
                <Text style={styles.startParkingText}>Start</Text>
              </Pressable>
            </View>
          )}
        </FadeInView>

        <FadeInView delay={200}>
          <View style={styles.quickActionsRow}>
            <QuickAction
              icon="square-parking"
              label="Parking"
              onPress={() => router.push("/(tabs)/parking")}
            />
            <QuickAction
              icon="folder-open"
              label="Vault"
              onPress={() => router.push("/(tabs)/vault")}
            />
            <QuickAction
              icon="car-side"
              label="Vehicles"
              onPress={() => router.push("/(tabs)/vehicles")}
            />
          </View>
        </FadeInView>

        <FadeInView delay={260}>
          <View style={styles.sectionCard}>
            <SectionHeader
              title="Critical Documents"
              subtitle="Nearest expiry in your vault"
              badge={documents.length}
            />

            {urgentDocuments.length === 0 ? (
              <View style={styles.emptyDocsBox}>
                <FontAwesome6
                  name="file-circle-plus"
                  size={24}
                  color={Theme.colors.textMuted}
                />
                <Text style={styles.emptyDocsTitle}>No documents tracked</Text>
                <Text style={styles.emptyDocsSub}>
                  Add Emirates ID, Mulkiya, insurance, visa, or passport records
                  in Vault.
                </Text>
              </View>
            ) : (
              urgentDocuments.map((doc) => {
                const isExpired = doc.daysRemaining < 0;
                const isCritical = doc.daysRemaining <= 30;

                return (
                  <Pressable
                    key={doc.id}
                    style={styles.docRow}
                    onPress={() => router.push("/(tabs)/vault")}
                  >
                    <View
                      style={[
                        styles.docIcon,
                        isCritical && styles.docIconWarning,
                      ]}
                    >
                      <FontAwesome6
                        name="file-lines"
                        size={14}
                        color={
                          isCritical
                            ? Theme.colors.warning
                            : Theme.colors.primaryGlow
                        }
                      />
                    </View>

                    <View style={styles.docInfo}>
                      <Text style={styles.docTitle} numberOfLines={1}>
                        {doc.title || formatDocType(doc.type)}
                      </Text>
                      <Text style={styles.docMeta} numberOfLines={1}>
                        {formatDocType(doc.type)} • {doc.expiryDate}
                      </Text>
                    </View>

                    <View style={styles.daysPill}>
                      <Text
                        style={[
                          styles.docDays,
                          isCritical && styles.docDaysDanger,
                        ]}
                      >
                        {isExpired
                          ? `${Math.abs(doc.daysRemaining)}d overdue`
                          : `${doc.daysRemaining}d`}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </FadeInView>

        <FadeInView delay={320}>
          <View style={styles.recentCard}>
            <View style={styles.recentLeft}>
              <Text style={styles.recentTitle}>Recent Parking</Text>
              <Text style={styles.recentSub}>
                {lastSession
                  ? `${lastSession.vehicleLabel} • ${lastSession.parkingEmirate}`
                  : "No parking history yet"}
              </Text>
            </View>

            <Pressable
              style={styles.recentButton}
              onPress={() => router.push("/parking-sessions")}
            >
              <FontAwesome6
                name="arrow-right"
                size={13}
                color={Theme.colors.textPrimary}
              />
            </Pressable>
          </View>
        </FadeInView>
      </ScrollView>
    </ScreenContainer>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone = Theme.colors.primaryGlow,
}: {
  icon: React.ComponentProps<typeof FontAwesome6>["name"];
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <View style={styles.metricCard}>
      <FontAwesome6 name={icon} size={14} color={tone} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof FontAwesome6>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickIcon}>
        <FontAwesome6 name={icon} size={15} color={Theme.colors.textPrimary} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.md,
    paddingBottom: 120,
  },
  headerCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xxl,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.md,
    ...Theme.shadow.card,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.md,
    marginBottom:20
  },
  logoBox: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: Theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: Theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  brandText: {
    flex: 1,
  },
  greeting: {
    color: Theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "900",
  },
  brandSub: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  scoreRow: {
    marginTop: Theme.spacing.lg,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  scoreLabel: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  scoreValue: {
    fontSize: 42,
    fontWeight: "900",
    marginTop: 2,
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.full,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 7,
  },
  scoreBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  metricCard: {
    width: "48.6%",
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.md,
    minHeight: 92,
    justifyContent: "space-between",
  },
  metricValue: {
    color: Theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 8,
  },
  metricLabel: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  parkingHero: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xxl,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    marginBottom: Theme.spacing.md,
    ...Theme.shadow.glow,
  },
  parkingHeroExpired: {
    borderColor: Theme.colors.danger,
    ...Theme.shadow.card,
  },
  parkingTopRow: {
    flexDirection: "row",
    gap: Theme.spacing.md,
    alignItems: "center",
  },
  parkingIconBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: Theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  parkingTitleBlock: {
    flex: 1,
  },
  parkingKicker: {
    color: Theme.colors.success,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  parkingVehicle: {
    color: Theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 3,
  },
  parkingMeta: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  timerBox: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.xl,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    padding: Theme.spacing.lg,
    alignItems: "center",
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  timerLabel: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  timerText: {
    color: Theme.colors.textPrimary,
    fontSize: 42,
    fontWeight: "900",
    marginTop: 4,
  },
  timerSub: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  endButton: {
    marginTop: Theme.spacing.xs,
  },
  emptyParkingHero: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xxl,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Theme.spacing.md,
  },
  emptyParkingLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Theme.spacing.md,
  },
  emptyParkingIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: Theme.colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyParkingTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
  },
  emptyParkingSub: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  startParkingButton: {
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.full,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  startParkingText: {
    color: Theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: "900",
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  quickAction: {
    flex: 1,
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.md,
    alignItems: "center",
    gap: 8,
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: Theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "900",
  },
  sectionCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.md,
  },
  emptyDocsBox: {
    alignItems: "center",
    paddingVertical: Theme.spacing.xl,
    gap: 8,
  },
  emptyDocsTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "900",
  },
  emptyDocsSub: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
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
    width: 34,
    height: 34,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Theme.spacing.md,
  },
  docIconWarning: {
    backgroundColor: Theme.colors.warningMuted,
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  docMeta: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
  },
  daysPill: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.full,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  docDays: {
    color: Theme.colors.warning,
    fontSize: 11,
    fontWeight: "900",
  },
  docDaysDanger: {
    color: Theme.colors.danger,
  },
  recentCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recentLeft: {
    flex: 1,
  },
  recentTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "900",
  },
  recentSub: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  recentButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: Theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  //new
  logoWrapper: {
    width: 62,
    height: 62,
    borderRadius: 18,
    // backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 5,
  },

  logoImage: {
    width: "100%",
    height: "100%",
    borderRadius:10
  },
});
