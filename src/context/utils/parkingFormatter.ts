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
  const hours = Math.max(1, Math.min(24, durationInHours));

  // Step A: System shortcode is strictly dictated by CURRENT PARKING LOCATION
  let recipient = "7275"; // Default to unified framework
  if (parkingEmirate === "AbuDhabi") recipient = "3009";
  if (parkingEmirate === "Sharjah") recipient = "5566";
  if (parkingEmirate === "Ajman") recipient = "5155";

  // Step B: Define how each local municipality network expects foreign or local plates
  switch (parkingEmirate) {
    case "Dubai":
      // Dubai format changes if the plate is external or native
      if (plateEmirate === "Dubai") {
        return {
          recipient,
          body: `${cleanPlateCode}${cleanPlateNumber} ${cleanZone} ${hours}`,
        };
      } else {
        // Syntax for foreign plates in Dubai: [EmirateCode拼写] [PlateCode] [PlateNumber] [Zone] [Duration]
        const emirateCodesMap: Record<string, string> = {
          AbuDhabi: "AUH",
          Sharjah: "SHJ",
          Ajman: "AJM",
          RasAlKhaimah: "RAK",
          UmmAlQuwain: "UAQ",
          Fujairah: "FUJ",
        };
        return {
          recipient,
          body: `${emirateCodesMap[plateEmirate]} ${cleanPlateCode} ${cleanPlateNumber} ${cleanZone} ${hours}`,
        };
      }

    case "AbuDhabi":
      const typeMarker = isPremiumAbuDhabi ? "P" : "S";
      // Abu Dhabi requires a localized regional abbreviation prefix system
      const auhPrefixes: Record<string, string> = {
        Dubai: "DXB",
        AbuDhabi: "AUH",
        Sharjah: "SHJ",
        Ajman: "AJM",
        RasAlKhaimah: "RAK",
        UmmAlQuwain: "UAQ",
        Fujairah: "FUJ",
      };
      return {
        recipient,
        body: `${auhPrefixes[plateEmirate]}${cleanPlateCode} ${cleanPlateNumber} ${typeMarker} ${hours}`,
      };

    case "Sharjah":
      // Sharjah expects the plate source name as a prefix descriptor block
      const shjPrefixes: Record<string, string> = {
        Dubai: "DXB",
        AbuDhabi: "AUH",
        Sharjah: "SHJ",
        Ajman: "AJM",
        RasAlKhaimah: "RAK",
        UmmAlQuwain: "UAQ",
        Fujairah: "FUJ",
      };
      return {
        recipient,
        body: `${shjPrefixes[plateEmirate]} ${cleanPlateCode} ${cleanPlateNumber} ${hours}`,
      };

    case "Ajman":
      // Ajman system accepts foreign registrations with a spacing code block
      const ajmPrefixes: Record<string, string> = {
        Dubai: "DXB",
        AbuDhabi: "AUH",
        Sharjah: "SHJ",
        Ajman: "AJM",
        RasAlKhaimah: "RAK",
        UmmAlQuwain: "UAQ",
        Fujairah: "FUJ",
      };
      return {
        recipient,
        body: `${ajmPrefixes[plateEmirate]} ${cleanPlateCode} ${cleanPlateNumber} ${hours}`,
      };

    // Northern Emirates (RAK, UAQ, FUJ) route completely through the universal 7275 portal
    default:
      const northernPrefixes: Record<string, string> = {
        Dubai: "DXB",
        AbuDhabi: "AUH",
        Sharjah: "SHJ",
        Ajman: "AJM",
        RasAlKhaimah: "RAK",
        UmmAlQuwain: "UAQ",
        Fujairah: "FUJ",
      };
      return {
        recipient,
        body: `${northernPrefixes[plateEmirate]} ${cleanPlateCode} ${cleanPlateNumber} ${cleanZone} ${hours}`,
      };
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
