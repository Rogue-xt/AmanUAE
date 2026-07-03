import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
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

const BRAND_YELLOW = "#FFD400";
const BLACK = "#050505";
const WHITE = "#FFFFFF";
const MUTED = "#6B7280";

export default function AuthScreen() {
  const { user, login, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 550,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (user) return <Redirect href="/(tabs)/dashboard" />;

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleSubmitting(true);
      await loginWithGoogle();
    } catch (error: any) {
      Alert.alert(
        "Google login failed",
        error?.message || "Could not sign in with Google.",
      );
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleLogin = async () => {
    const cleanEmail = email.trim();

    if (!cleanEmail || !password.trim()) {
      Alert.alert("Missing details", "Enter your email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      await login(cleanEmail, password);
    } catch (error: any) {
      Alert.alert("Login failed", getAuthErrorMessage(error?.code));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      // keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.hero,
            {
              opacity: fade,
              transform: [{ translateY: slide }],
            },
          ]}
        >
          <Image
            source={require("../assets/images/ZoneGard-Login.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* <Text style={styles.heroTitle}>Drive smart. Stay protected.</Text> */}
          <Text style={styles.heroSub}>
            UAE parking, vehicle documents, and renewal reminders in one secure
            companion.
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.panel,
            {
              opacity: fade,
              transform: [{ translateY: slide }],
            },
          ]}
        >
          <Text style={styles.title}>Login</Text>
          {/* <Text style={styles.subtitle}>Access your ZoneGard vault.</Text> */}

          <View style={styles.inputWrap}>
            <FontAwesome6 name="envelope" size={14} color={MUTED} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={MUTED}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
          </View>

          <View style={styles.inputWrap}>
            <FontAwesome6 name="lock" size={14} color={MUTED} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={MUTED}
              secureTextEntry={!showPassword}
              style={styles.input}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)}>
              <FontAwesome6
                name={showPassword ? "eye-slash" : "eye"}
                size={15}
                color={BLACK}
              />
            </Pressable>
          </View>

          <Pressable
            style={styles.forgotButton}
            onPress={() => router.push("/forgot-password")}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>

          <Pressable
            onPress={handleLogin}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && !isSubmitting && styles.pressed,
              isSubmitting && styles.disabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={BRAND_YELLOW} />
            ) : (
              <Text style={styles.primaryText}>Login Securely</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={isGoogleSubmitting}
          >
            {isGoogleSubmitting ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <FontAwesome6 name="google" size={15} color="#d1ae2f" />
                <Text style={styles.googleText}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={styles.signupButton}
            onPress={() => router.push("/signup")}
          >
            <Text style={styles.signupText}>
              New to ZoneGard?{" "}
              <Text style={styles.signupStrong}>Create account</Text>
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getAuthErrorMessage(code?: string) {
  switch (code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/network-request-failed":
      return "Network error. Check your internet connection.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    default:
      return "Something went wrong. Try again.";
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BRAND_YELLOW,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 12,
    // paddingTop: 56,
    // paddingBottom: 2,
    justifyContent: "center",
  },
  hero: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 0,
  },
  logo: {
    width: 220,
    height: 220,
  },
  heroTitle: {
    color: BLACK,
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 0,
  },
  heroSub: {
    color: "#1F2937",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 330,
  },
  panel: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    // borderBottomLeftRadius: 36,
    // borderBottomRightRadius: 36,
    padding: 24,
    paddingTop: 10,
    shadowColor: BLACK,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -8 },
    elevation: 18,
  },
  title: {
    color: BLACK,
    fontSize: 30,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 5,
    marginBottom: 22,
  },
  inputWrap: {
    height: 56,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 13,
  },
  input: {
    flex: 1,
    color: BLACK,
    fontSize: 15,
    fontWeight: "800",
  },
  forgotButton: {
    alignSelf: "flex-end",
    marginBottom: 16,
  },
  forgotText: {
    color: BLACK,
    fontSize: 13,
    fontWeight: "900",
  },
  primaryButton: {
    height: 56,
    borderRadius: 18,
    backgroundColor: BLACK,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    color: BRAND_YELLOW,
    fontSize: 15,
    fontWeight: "900",
  },
  googleButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: BRAND_YELLOW,
    borderWidth: 1,
    borderColor: BLACK,
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleText: {
    color: BLACK,
    fontSize: 14,
    fontWeight: "900",
  },
  signupButton: {
    alignItems: "center",
    marginTop: 20,
  },
  signupText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "800",
  },
  signupStrong: {
    color: BLACK,
    fontWeight: "900",
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
