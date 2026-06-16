export const Theme = {
  colors: {
    background: "#09090B",
    surface: "#121317",
    card: "#15161A",
    elevated: "#1C1E24",
    border: "#2A2D35",
    borderSubtle: "#1E2028",

    primary: "#3B82F6",
    primaryGlow: "#60A5FA",
    primaryMuted: "rgba(59, 130, 246, 0.15)",

    success: "#22C55E",
    successMuted: "rgba(34, 197, 94, 0.12)",
    warning: "#F59E0B",
    warningMuted: "rgba(245, 158, 11, 0.12)",
    danger: "#EF4444",
    dangerMuted: "rgba(239, 68, 68, 0.12)",

    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
    textMuted: "#64748B",
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
