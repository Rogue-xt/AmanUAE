import {
  getParkingRule,
  ParkingEmirate,
} from "@/src/config/parkingRules";

export interface ParkingPayload {
  plateEmirate: ParkingEmirate;
  parkingEmirate: ParkingEmirate;
  plateCode: string;
  plateNumber: string;
  zoneCode?: string;
  durationInHours: number;
  isPremiumAbuDhabi?: boolean;
}
const EMIRATE_PREFIX: Record<ParkingEmirate, string> = {
  Dubai: "DXB",
  AbuDhabi: "AUH",
  Sharjah: "SHJ",
  Ajman: "AJM",
  RasAlKhaimah: "RAK",
  UmmAlQuwain: "UAQ",
  Fujairah: "FUJ",
};

export function generateParkingSMS(payload: ParkingPayload): {
  recipient: string;
  body: string;
} {
  const {
    plateEmirate,
    parkingEmirate,
    plateCode,
    plateNumber,
    zoneCode,
    durationInHours,
    isPremiumAbuDhabi,
  } = payload;

  const cleanPlateCode = plateCode.trim().toUpperCase();
  const cleanPlateNumber = plateNumber.trim();
  const cleanZone = zoneCode ? zoneCode.trim().toUpperCase() : "";
  const prefix = EMIRATE_PREFIX[plateEmirate];
  const parkingRule = getParkingRule(parkingEmirate);

  if (!parkingRule.smsSupported) {
    throw new Error(`${parkingEmirate} does not support SMS parking.`);
  }

  switch (parkingEmirate) {
    case "Dubai": {
      if (!cleanZone) {
        throw new Error("Dubai parking requires a zone code.");
      }

      const hours = Math.max(
        parkingRule.formatterMinDurationHours,
        Math.min(parkingRule.formatterMaxDurationHours, durationInHours),
      );

      if (plateEmirate === "Dubai") {
        return {
          recipient: parkingRule.recipient,
          body: `${cleanPlateCode}${cleanPlateNumber} ${cleanZone} ${hours}`,
        };
      }

      return {
        recipient: parkingRule.recipient,
        body: `${prefix}${cleanPlateCode} ${cleanPlateNumber} ${cleanZone} ${hours}`,
      };
    }

    case "AbuDhabi": {
      const typeMarker = isPremiumAbuDhabi ? "P" : "S";
      const maxHours = isPremiumAbuDhabi
        ? parkingRule.premiumFormatterMaxDurationHours ??
          parkingRule.formatterMaxDurationHours
        : parkingRule.formatterMaxDurationHours;
      const hours = Math.max(
        parkingRule.formatterMinDurationHours,
        Math.min(maxHours, durationInHours),
      );

      return {
        recipient: parkingRule.recipient,
        body: `${prefix}${cleanPlateCode} ${cleanPlateNumber} ${typeMarker} ${hours}`,
      };
    }

    case "Sharjah": {
      const hours = Math.max(
        parkingRule.formatterMinDurationHours,
        Math.min(parkingRule.formatterMaxDurationHours, durationInHours),
      );

      return {
        recipient: parkingRule.recipient,
        body: `${prefix} ${cleanPlateNumber} ${hours}`,
      };
    }

    case "Ajman": {
      return {
        recipient: parkingRule.recipient,
        body: `${prefix} ${cleanPlateCode} ${cleanPlateNumber}`,
      };
    }

    default: {
      throw new Error("Unsupported parking emirate.");
    }
  }
}
/**
 * Maps a reverse-geocoded city or region name string from phone hardware to our supported Emirates list.
 */
export function isKhorfakkanRegion(
  ...locationNames: Array<string | null | undefined>
): boolean {
  return locationNames.some((locationName) => {
    if (!locationName) return false;

    const normalizedName = locationName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z]/g, "");

    return [
      "khorfakkan",
      "khorfakan",
      "khawrfakkan",
      "khawrfakan",
    ].some((variant) => normalizedName.includes(variant));
  });
}

export function identifyEmirateFromRegion(regionName: string | null): 'Dubai' | 'AbuDhabi' | 'Sharjah' | 'Ajman' | 'RasAlKhaimah' | 'UmmAlQuwain' | 'Fujairah' | null {
  if (!regionName) return null;
  
  const lowerRegion = regionName.toLowerCase();

  if (lowerRegion.includes('dubai')) return 'Dubai';
  if (lowerRegion.includes('abu dhabi') || lowerRegion.includes('al ain') || lowerRegion.includes('al dhafra')) return 'AbuDhabi';
  if (lowerRegion.includes('sharjah')) return 'Sharjah';
  if (lowerRegion.includes('ajman')) return 'Ajman';
  if (lowerRegion.includes('ras al') || lowerRegion.includes('khaimah') || lowerRegion.includes('rak')) return 'RasAlKhaimah';
  if (lowerRegion.includes('umm al') || lowerRegion.includes('quwain') || lowerRegion.includes('uaq')) return 'UmmAlQuwain';
  if (lowerRegion.includes('fujairah') || lowerRegion.includes('dibba')) return 'Fujairah';

  return null;
}
