export const PARKING_EMIRATES = [
  "Dubai",
  "AbuDhabi",
  "Sharjah",
  "Ajman",
  "RasAlKhaimah",
  "UmmAlQuwain",
  "Fujairah",
] as const;

export type ParkingEmirate = (typeof PARKING_EMIRATES)[number];
export type AbuDhabiParkingType = "standard" | "premium";

type SupportedRenewalRule = {
  supported: true;
  recipient: string;
  command: string;
  extensionHours: number;
  maximumStayHours: Record<AbuDhabiParkingType, number> | null;
};

type UnsupportedRenewalRule = {
  supported: false;
};

type SupportedParkingRule = {
  smsSupported: true;
  recipient: string;
  uiDurations: readonly number[];
  durationMode: "selectable" | "fixed";
  fixedDurationHours: number | null;
  requiresZone: boolean;
  requiresParkingType: boolean;
  formatterMinDurationHours: number;
  formatterMaxDurationHours: number;
  premiumFormatterMaxDurationHours: number | null;
  renewal: SupportedRenewalRule;
};

type UnsupportedParkingRule = {
  smsSupported: false;
  recipient: null;
  uiDurations: readonly [];
  durationMode: "unsupported";
  fixedDurationHours: null;
  requiresZone: false;
  requiresParkingType: false;
  formatterMinDurationHours: null;
  formatterMaxDurationHours: null;
  premiumFormatterMaxDurationHours: null;
  renewal: UnsupportedRenewalRule;
};

export type ParkingRule = SupportedParkingRule | UnsupportedParkingRule;

export const PARKING_RULES = {
  Dubai: {
    smsSupported: true,
    recipient: "7275",
    uiDurations: [1, 2, 3, 4],
    durationMode: "selectable",
    fixedDurationHours: null,
    requiresZone: true,
    requiresParkingType: false,
    formatterMinDurationHours: 1,
    formatterMaxDurationHours: 24,
    premiumFormatterMaxDurationHours: null,
    renewal: {
      supported: true,
      recipient: "7275",
      command: "Y",
      extensionHours: 1,
      maximumStayHours: null,
    },
  },
  AbuDhabi: {
    smsSupported: true,
    recipient: "3009",
    uiDurations: Array.from({ length: 24 }, (_, index) => index + 1),
    durationMode: "selectable",
    fixedDurationHours: null,
    requiresZone: false,
    requiresParkingType: true,
    formatterMinDurationHours: 1,
    formatterMaxDurationHours: 24,
    premiumFormatterMaxDurationHours: 4,
    renewal: {
      supported: true,
      recipient: "3009",
      command: "E",
      extensionHours: 1,
      maximumStayHours: {
        standard: 24,
        premium: 4,
      },
    },
  },
  Sharjah: {
    smsSupported: true,
    recipient: "5566",
    uiDurations: [1, 2, 3, 5],
    durationMode: "selectable",
    fixedDurationHours: null,
    requiresZone: false,
    requiresParkingType: false,
    formatterMinDurationHours: 1,
    formatterMaxDurationHours: 24,
    premiumFormatterMaxDurationHours: null,
    renewal: {
      supported: true,
      recipient: "5566",
      command: "Y",
      extensionHours: 1,
      maximumStayHours: null,
    },
  },
  Ajman: {
    smsSupported: true,
    recipient: "5155",
    uiDurations: [1],
    durationMode: "fixed",
    fixedDurationHours: 1,
    requiresZone: false,
    requiresParkingType: false,
    formatterMinDurationHours: 1,
    formatterMaxDurationHours: 1,
    premiumFormatterMaxDurationHours: null,
    renewal: {
      supported: true,
      recipient: "5155",
      command: "Y",
      extensionHours: 1,
      maximumStayHours: null,
    },
  },
  RasAlKhaimah: {
    smsSupported: false,
    recipient: null,
    uiDurations: [],
    durationMode: "unsupported",
    fixedDurationHours: null,
    requiresZone: false,
    requiresParkingType: false,
    formatterMinDurationHours: null,
    formatterMaxDurationHours: null,
    premiumFormatterMaxDurationHours: null,
    renewal: { supported: false },
  },
  UmmAlQuwain: {
    smsSupported: false,
    recipient: null,
    uiDurations: [],
    durationMode: "unsupported",
    fixedDurationHours: null,
    requiresZone: false,
    requiresParkingType: false,
    formatterMinDurationHours: null,
    formatterMaxDurationHours: null,
    premiumFormatterMaxDurationHours: null,
    renewal: { supported: false },
  },
  Fujairah: {
    smsSupported: false,
    recipient: null,
    uiDurations: [],
    durationMode: "unsupported",
    fixedDurationHours: null,
    requiresZone: false,
    requiresParkingType: false,
    formatterMinDurationHours: null,
    formatterMaxDurationHours: null,
    premiumFormatterMaxDurationHours: null,
    renewal: { supported: false },
  },
} as const satisfies Record<ParkingEmirate, ParkingRule>;

export const SPECIAL_PARKING_AREA_RULES = {
  Khorfakkan: {
    smsSupported: false,
    ordinarySharjahSmsBlocked: true,
    renewal: { supported: false },
  },
} as const;

export function getParkingRule(emirate: ParkingEmirate): ParkingRule {
  return PARKING_RULES[emirate];
}

export function isParkingEmirate(value: string): value is ParkingEmirate {
  return PARKING_EMIRATES.some((emirate) => emirate === value);
}

export function getParkingRenewalRule(
  parkingArea: ParkingEmirate | "Khorfakkan",
): SupportedRenewalRule | UnsupportedRenewalRule {
  return parkingArea === "Khorfakkan"
    ? SPECIAL_PARKING_AREA_RULES.Khorfakkan.renewal
    : PARKING_RULES[parkingArea].renewal;
}

export function calculateRenewedParkingExpiry(params: {
  parkingEmirate: ParkingEmirate;
  parkingType?: AbuDhabiParkingType;
  startedAt: number;
  expiryTimestamp: number;
}): number {
  const renewal = getParkingRenewalRule(params.parkingEmirate);

  if (!renewal.supported) {
    throw new Error("Parking renewal is not supported for this emirate.");
  }

  const renewedExpiry =
    params.expiryTimestamp + renewal.extensionHours * 60 * 60 * 1000;

  if (renewal.maximumStayHours) {
    if (!params.parkingType) {
      throw new Error(
        "This legacy Abu Dhabi session does not record its parking type and cannot be renewed safely.",
      );
    }

    const maximumExpiry =
      params.startedAt +
      renewal.maximumStayHours[params.parkingType] * 60 * 60 * 1000;

    if (renewedExpiry > maximumExpiry) {
      throw new Error(
        `This renewal would exceed the ${renewal.maximumStayHours[params.parkingType]}-hour Abu Dhabi ${params.parkingType} maximum stay.`,
      );
    }
  }

  return renewedExpiry;
}

export function getParkingUiDurations(
  emirate: ParkingEmirate,
  isPremiumAbuDhabi = false,
): readonly number[] {
  const rule = PARKING_RULES[emirate];

  if (
    emirate === "AbuDhabi" &&
    isPremiumAbuDhabi &&
    rule.premiumFormatterMaxDurationHours !== null
  ) {
    return rule.uiDurations.filter(
      (duration) => duration <= rule.premiumFormatterMaxDurationHours,
    );
  }

  return rule.uiDurations;
}

export function clampParkingUiDuration(
  emirate: ParkingEmirate,
  selectedDurationHours: number,
  isPremiumAbuDhabi = false,
): number {
  const durations = getParkingUiDurations(emirate, isPremiumAbuDhabi);

  if (durations.length === 0) {
    return 1;
  }

  if (durations.includes(selectedDurationHours)) {
    return selectedDurationHours;
  }

  const minimum = durations[0];
  const maximum = durations[durations.length - 1];

  if (selectedDurationHours > maximum) {
    return maximum;
  }

  return minimum;
}

export function getParkingSessionDurationHours(
  emirate: ParkingEmirate,
  selectedDurationHours: number,
): number {
  return PARKING_RULES[emirate].fixedDurationHours ?? selectedDurationHours;
}
