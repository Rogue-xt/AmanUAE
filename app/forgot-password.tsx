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
import { router } from "expo-router";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

import { useAuth } from "@/src/context/AuthContext";
import { Theme } from "@/constants/Theme";

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReset = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      Alert.alert("Email required", "Enter your email address.");
      return;
    }

    try {
      setIsSubmitting(true);
      await resetPassword(cleanEmail);
      Alert.alert(
        "Reset link sent",
        "Check your inbox to reset your password.",
        [{ text: "Back to Login", onPress: () => router.replace("/auth") }],
      );
    } catch (error: any) {
      Alert.alert("Reset failed", getAuthErrorMessage(error?.code));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
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
          <View style={styles.iconBox}>
            <FontAwesome6
              name="key"
              size={24}
              color={Theme.colors.primaryGlow}
            />
          </View>

          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.subtitle}>
            Enter your registered email. ZoneGard will send a secure password
            reset link.
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

          <Pressable
            onPress={handleReset}
            disabled={isSubmitting}
            style={[
              styles.primaryButton,
              isSubmitting && styles.disabledButton,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>Send Reset Link</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getAuthErrorMessage(code?: string) {
  switch (code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/user-not-found":
      return "No account found with this email.";
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
    padding: 22,
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
  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: Theme.colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
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
    marginBottom: 16,
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
  },
  primaryText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.65,
  },
});
