import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect, router } from "expo-router";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

import { useAuth } from "@/src/context/AuthContext";
import { Theme } from "@/constants/Theme";

export default function SignupScreen() {
  const { user, signup } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) return <Redirect href="/(tabs)/dashboard" />;

  const handleSignup = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail || !password || !confirm) {
      Alert.alert("Missing details", "Complete all fields.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      Alert.alert("Password mismatch", "Both passwords must match.");
      return;
    }

    try {
      setIsSubmitting(true);
      await signup(cleanEmail, password);
    } catch (error: any) {
      Alert.alert("Signup failed", getAuthErrorMessage(error?.code));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome6
            name="arrow-left"
            size={14}
            color={Theme.colors.textPrimary}
          />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.kicker}>Create protected access</Text>
          <Text style={styles.title}>Start with ZoneGard</Text>
          <Text style={styles.subtitle}>
            Your vehicles, document expiry dates, and parking history stay
            linked to your secure account.
          </Text>

          <View style={styles.inputWrap}>
            <FontAwesome6
              name="envelope"
              size={14}
              color={Theme.colors.textMuted}
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={Theme.colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
          </View>

          <View style={styles.inputWrap}>
            <FontAwesome6
              name="lock"
              size={14}
              color={Theme.colors.textMuted}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={Theme.colors.textMuted}
              secureTextEntry={!showPassword}
              style={styles.input}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)}>
              <FontAwesome6
                name={showPassword ? "eye-slash" : "eye"}
                size={15}
                color={Theme.colors.textSecondary}
              />
            </Pressable>
          </View>

          <View style={styles.inputWrap}>
            <FontAwesome6
              name="shield-halved"
              size={14}
              color={Theme.colors.textMuted}
            />
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Confirm password"
              placeholderTextColor={Theme.colors.textMuted}
              secureTextEntry={!showPassword}
              style={styles.input}
            />
          </View>

          <Pressable
            onPress={handleSignup}
            disabled={isSubmitting}
            style={[
              styles.primaryButton,
              isSubmitting && styles.disabledButton,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>Create Account</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.loginButton}
            onPress={() => router.replace("/auth")}
          >
            <Text style={styles.loginText}>Already have an account? Login</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getAuthErrorMessage(code?: string) {
  switch (code) {
    case "auth/email-already-in-use":
      return "This email is already registered. Login instead.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/network-request-failed":
      return "Network error. Check your internet connection.";
    default:
      return "Something went wrong. Try again.";
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Theme.colors.primary,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 56,
    paddingBottom: 32,
    justifyContent: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
  },
  backText: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: 32,
    padding: 22,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadow.card,
  },
  kicker: {
    color: Theme.colors.primaryGlow,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  title: {
    color: Theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 22,
  },
  inputWrap: {
    height: 56,
    borderRadius: 18,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 13,
  },
  input: {
    flex: 1,
    color: Theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  primaryButton: {
    height: 56,
    borderRadius: 18,
    backgroundColor: Theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.65,
  },
  loginButton: {
    alignItems: "center",
    marginTop: 20,
  },
  loginText: {
    color: Theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: "800",
  },
});
