export interface ParkingPayload {
  plateEmirate:
    | "Dubai"
    | "AbuDhabi"
    | "Sharjah"
    | "Ajman"
    | "RasAlKhaimah"
    | "UmmAlQuwain"
    | "Fujairah";
  parkingEmirate:
    | "Dubai"
    | "AbuDhabi"
    | "Sharjah"
    | "Ajman"
    | "RasAlKhaimah"
    | "UmmAlQuwain"
    | "Fujairah";
  plateCode: string;
  plateNumber: string;
  zoneCode?: string;
  durationInHours: number;
  isPremiumAbuDhabi?: boolean;
}
const EMIRATE_PREFIX: Record<ParkingPayload["plateEmirate"], string> = {
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

  switch (parkingEmirate) {
    case "Dubai": {
      if (!cleanZone) {
        throw new Error("Dubai parking requires a zone code.");
      }

      const hours = Math.max(1, Math.min(24, durationInHours));

      if (plateEmirate === "Dubai") {
        return {
          recipient: "7275",
          body: `${cleanPlateCode}${cleanPlateNumber} ${cleanZone} ${hours}`,
        };
      }

      return {
        recipient: "7275",
        body: `${prefix}${cleanPlateCode} ${cleanPlateNumber} ${cleanZone} ${hours}`,
      };
    }

    case "AbuDhabi": {
      const typeMarker = isPremiumAbuDhabi ? "P" : "S";
      const maxHours = isPremiumAbuDhabi ? 4 : 24;
      const hours = Math.max(1, Math.min(maxHours, durationInHours));

      return {
        recipient: "3009",
        body: `${prefix}${cleanPlateCode} ${cleanPlateNumber} ${typeMarker} ${hours}`,
      };
    }

    case "Sharjah": {
      const hours = Math.max(1, Math.min(24, durationInHours));

      return {
        recipient: "5566",
        body: `${prefix} ${cleanPlateNumber} ${hours}`,
      };
    }

    case "Ajman": {
      return {
        recipient: "5155",
        body: `${prefix} ${cleanPlateCode} ${cleanPlateNumber}`,
      };
    }

    // case "RasAlKhaimah": {
    //   const hours = Math.max(1, Math.min(24, durationInHours));

    //   return {
    //     recipient: "RAK_CODE_HERE",
    //     body: `${prefix} ${cleanPlateCode} ${cleanPlateNumber} ${hours}`,
    //   };
    // }
    case "RasAlKhaimah":
    case "UmmAlQuwain":
    case "Fujairah": {
      throw new Error(`${parkingEmirate} does not support SMS parking.`);
    }

    default: {
      throw new Error("Unsupported parking emirate.");
    }
  }
}
/**
 * Maps a reverse-geocoded city or region name string from phone hardware to our supported Emirates list.
 */
export function identifyEmirateFromRegion(regionName: string | null): 'Dubai' | 'AbuDhabi' | 'Sharjah' | 'Ajman' | 'RasAlKhaimah' | 'UmmAlQuwain' | 'Fujairah' | null {
  if (!regionName) return null;
  
  const lowerRegion = regionName.toLowerCase();

  if (lowerRegion.includes('dubai')) return 'Dubai';
  if (lowerRegion.includes('abu dhabi') || lowerRegion.includes('al ain') || lowerRegion.includes('al dhafra')) return 'AbuDhabi';
  if (lowerRegion.includes('sharjah') || lowerRegion.includes('khor fakkan')) return 'Sharjah';
  if (lowerRegion.includes('ajman')) return 'Ajman';
  if (lowerRegion.includes('ras al') || lowerRegion.includes('khaimah') || lowerRegion.includes('rak')) return 'RasAlKhaimah';
  if (lowerRegion.includes('umm al') || lowerRegion.includes('quwain') || lowerRegion.includes('uaq')) return 'UmmAlQuwain';
  if (lowerRegion.includes('fujairah') || lowerRegion.includes('dibba')) return 'Fujairah';

  return null;
}
