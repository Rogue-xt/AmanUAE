export const Theme = {
  colors: {
    background: "#F6F6F3",
    surface: "#FFFFFF",
    card: "#FFFFFF",
    elevated: "#F1F1ED",
    border: "#E3E3DA",
    borderSubtle: "#EEEEEA",

    primary: "#FFD60A",
    primaryGlow: "#FFB703",
    primaryMuted: "rgba(255, 214, 10, 0.18)",

    success: "#16A34A",
    successMuted: "rgba(22, 163, 74, 0.12)",
    warning: "#F59E0B",
    warningMuted: "rgba(245, 158, 11, 0.12)",
    danger: "#DC2626",
    dangerMuted: "rgba(220, 38, 38, 0.12)",

    textPrimary: "#0A0A0A",
    textSecondary: "#4B5563",
    textMuted: "#6B7280",
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 999,
  },

  typography: {
    hero: { fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.5 },
    title: { fontSize: 20, fontWeight: "700" as const },
    subtitle: { fontSize: 15, fontWeight: "600" as const },
    body: { fontSize: 14, fontWeight: "500" as const },
    caption: { fontSize: 12, fontWeight: "600" as const },
    label: {
      fontSize: 11,
      fontWeight: "700" as const,
      letterSpacing: 0.8,
      textTransform: "uppercase" as const,
    },
    mono: { fontSize: 32, fontWeight: "800" as const, letterSpacing: 1 },
  },

  shadow: {
    glow: {
      shadowColor: "#3B82F6",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 8,
    },
    card: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
  },
} as const;

export type VehicleType = "sedan" | "suv" | "truck" | "van";
