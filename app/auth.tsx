import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect } from "expo-router";

import { useAuth } from "@/src/context/AuthContext";
import { Theme } from "@/constants/Theme";

export default function AuthScreen() {
  const { user, login, signup } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing details", "Enter email and password.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }

    try {
      setIsSubmitting(true);

      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (error: any) {
      Alert.alert("Authentication failed", getAuthErrorMessage(error?.code));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>ZG</Text>
        </View>

        <Text style={styles.title}>
          {mode === "login" ? "Welcome back" : "Create account"}
        </Text>

        <Text style={styles.subtitle}>
          Secure your vehicles, documents, and parking history with ZoneGard.
        </Text>

        <View style={styles.form}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor={Theme.colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={Theme.colors.textMuted}
            secureTextEntry
            style={styles.input}
          />

          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && !isSubmitting && styles.pressed,
              isSubmitting && styles.disabledButton,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {mode === "login" ? "Login" : "Create Account"}
              </Text>
            )}
          </Pressable>
        </View>

        <Pressable
          onPress={() => setMode(mode === "login" ? "signup" : "login")}
          style={styles.switchButton}
        >
          <Text style={styles.switchText}>
            {mode === "login"
              ? "New here? Create an account"
              : "Already have an account? Login"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function getAuthErrorMessage(code?: string) {
  switch (code) {
    case "auth/email-already-in-use":
      return "This email is already registered. Login instead.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/network-request-failed":
      return "Network error. Check your internet connection.";
    default:
      return "Something went wrong. Try again.";
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#000",
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: Theme.colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: Theme.colors.textSecondary,
    marginBottom: 28,
  },
  form: {
    gap: 14,
  },
  input: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.surface,
    paddingHorizontal: 16,
    color: Theme.colors.textPrimary,
    fontSize: 15,
  },
  primaryButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: Theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#000",
  },
  disabledButton: {
    opacity: 0.65,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  switchButton: {
    marginTop: 22,
    alignItems: "center",
  },
  switchText: {
    color: Theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
});
