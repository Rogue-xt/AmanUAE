import React from "react";
import { Platform, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { useClientOnlyValue } from "@/components/useClientOnlyValue";
import { Theme } from "@/constants/Theme";

function TabIcon({
  name,
  color,
  focused,
}: {
  name: React.ComponentProps<typeof FontAwesome6>["name"];
  color: string;
  focused: boolean;
}) {
  return (
    <FontAwesome6
      name={name}
      size={focused ? 22 : 20}
      color={color}
      style={{ marginBottom: -2 }}
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: useClientOnlyValue(false, true),
        tabBarActiveTintColor: Theme.colors.primaryGlow,
        tabBarInactiveTintColor: Theme.colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: Theme.colors.background },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="gauge-high" color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="parking"
        options={{
          title: "Parking",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="square-parking" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: "My Vehicles",
          tabBarLabel: "Vehicles",
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="car-side" size={20} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="vault"
        options={{
          title: "Document Vault",
          tabBarLabel: "Vault",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="shield-halved" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 28 : 0,
    left: 16,
    right: 16,
    height: 84,
    backgroundColor: Theme.colors.elevated,
    borderRadius: 40,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingBottom: 18,
    paddingTop: 8,
    ...Theme.shadow.card,
    elevation: 12,
  },
  tabItem: {
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginTop: 2,
  },
});
