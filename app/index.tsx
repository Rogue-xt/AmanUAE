import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "@/src/context/AuthContext";
import { Theme } from "@/constants/Theme";

export default function RootIndexScreen() {
  const { user, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/auth" />;
  }

 return <Redirect href="/(tabs)/dashboard" />;
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Theme.colors.background,
  },
});
