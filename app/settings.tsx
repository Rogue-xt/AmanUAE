import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import { Stack, router } from "expo-router";

import { Theme } from "@/constants/Theme";
import { useAuth } from "@/src/context/AuthContext";
import { useApp } from "@/src/context/AppContext";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { vehicles, documents } = useApp();

  const handleLogout = () => {
    Alert.alert("Logout", "Do you want to logout from ZoneGard?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/auth");
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: "Profile" }} />

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <FontAwesome6 name="user-shield" size={24} color="#000" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>ZoneGard Account</Text>
          <Text style={styles.email}>{user?.email || "No email"}</Text>
          <View style={styles.connectedPill}>
            <FontAwesome6 name="cloud" size={11} color="#166534" />
            <Text style={styles.connectedText}>Firebase Connected</Text>
          </View>
        </View>
      </View>

      <View style={styles.grid}>
        <StatCard
          icon="car-side"
          label="Vehicles"
          value={vehicles.length.toString()}
          onPress={() => router.push("/(tabs)/vehicles")}
        />

        <StatCard
          icon="file-shield"
          label="Documents"
          value={documents.length.toString()}
          onPress={() => router.push("/(tabs)/vault")}
        />
      </View>

      <SectionTitle title="App Controls" />

      <MenuItem
        icon="bell"
        title="Notifications"
        subtitle="Parking and document reminders"
        disabled
      />

      <MenuItem
        icon="cloud-arrow-up"
        title="Cloud Backup"
        subtitle="Firestore sync will be added next"
        disabled
      />

      <MenuItem
        icon="palette"
        title="Preferences"
        subtitle="Theme, language, date format"
        disabled
      />

      <SectionTitle title="Security" />

      <MenuItem
        icon="fingerprint"
        title="Biometric Lock"
        subtitle="Coming later"
        disabled
      />

      <MenuItem
        icon="shield-halved"
        title="Privacy & Security"
        subtitle="Account and data protection"
        disabled
      />

      <SectionTitle title="About" />

      <MenuItem
        icon="circle-info"
        title="About ZoneGard"
        subtitle="Version 1.0.0"
        disabled
      />

      <Pressable onPress={handleLogout} style={styles.logoutButton}>
        <FontAwesome6 name="right-from-bracket" size={16} color="#B91C1C" />
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function StatCard({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ComponentProps<typeof FontAwesome6>["name"];
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.statCard}>
      <FontAwesome6 name={icon} size={18} color={Theme.colors.textPrimary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

function MenuItem({
  icon,
  title,
  subtitle,
  disabled,
}: {
  icon: React.ComponentProps<typeof FontAwesome6>["name"];
  title: string;
  subtitle: string;
  disabled?: boolean;
}) {
  return (
    <Pressable disabled={disabled} style={styles.menuItem}>
      <View style={styles.menuIcon}>
        <FontAwesome6 name={icon} size={16} color={Theme.colors.textPrimary} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>

      {disabled ? (
        <Text style={styles.soonText}>Soon</Text>
      ) : (
        <FontAwesome6
          name="chevron-right"
          size={13}
          color={Theme.colors.textMuted}
        />
      )}
    </Pressable>
  );
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
  profileCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    marginBottom: 18,
    ...Theme.shadow.card,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: Theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: Theme.colors.textPrimary,
  },
  email: {
    marginTop: 4,
    fontSize: 13,
    color: Theme.colors.textSecondary,
  },
  connectedPill: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  connectedText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#166534",
  },
  grid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 22,
  },
  statCard: {
    flex: 1,
    backgroundColor: Theme.colors.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  statValue: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: "900",
    color: Theme.colors.textPrimary,
  },
  statLabel: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    color: Theme.colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: Theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 8,
  },
  menuItem: {
    minHeight: 74,
    backgroundColor: Theme.colors.card,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 10,
  },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: Theme.colors.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: Theme.colors.textPrimary,
  },
  menuSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: Theme.colors.textSecondary,
  },
  soonText: {
    fontSize: 11,
    fontWeight: "900",
    color: Theme.colors.textMuted,
  },
  logoutButton: {
    height: 56,
    borderRadius: 20,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 12,
  },
  logoutText: {
    color: "#B91C1C",
    fontSize: 15,
    fontWeight: "900",
  },
});
