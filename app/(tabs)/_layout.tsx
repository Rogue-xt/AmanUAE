import React from "react";
import { Platform, StyleSheet, Pressable } from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Theme } from "@/constants/Theme";
import { Tabs, router } from "expo-router";

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
        headerStyle: {
          backgroundColor: Theme.colors.primary,
        },

        headerTintColor: Theme.colors.textPrimary,

        headerTitleStyle: {
          color: Theme.colors.textPrimary,
          fontWeight: "700",
          fontSize: 18,
        },

        headerShadowVisible: false,
        headerRight: () => (
          <Pressable
            onPress={() => router.push("/settings")}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: "rgba(255,255,255,0.35)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <FontAwesome6
              name="user"
              size={16}
              color={Theme.colors.textPrimary}
            />
          </Pressable>
        ),

        sceneStyle: {
          backgroundColor: Theme.colors.background,
        },
        tabBarStyle: styles.tabBar,

        tabBarActiveTintColor: Theme.colors.textPrimary,
        tabBarInactiveTintColor: Theme.colors.textMuted,
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
          title: "Parking Assistant",
          tabBarLabel: "Parking",
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
