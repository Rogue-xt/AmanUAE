import React from 'react';

import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { FontAwesome, FontAwesome6 } from '@expo/vector-icons';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="dashboard" color={color} />
          ),
          headerRight: () => (
            // <Link href="/modal" asChild>
            <Pressable>
              {({ pressed }) => (
                <FontAwesome
                  name="dashboard"
                  size={25}
                  color={Colors[colorScheme ?? "light"].text}
                  style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                />
              )}
            </Pressable>
            // </Link>
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: "Parking",
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="square-parking" size={24} color="white" />
          ),
        }}
      />

      <Tabs.Screen
        name="two"
        options={{
          title: "Vault",
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="folder-open" size={24} color="white" />
          ),
        }}
      />
    </Tabs>
  );
}
