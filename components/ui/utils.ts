import { DocumentRecord } from "@/src/context/AppContext";

export const EMIRATES_LIST = [
  "Dubai",
  "AbuDhabi",
  "Sharjah",
  "Ajman",
  "RasAlKhaimah",
  "UmmAlQuwain",
  "Fujairah",
] as const;

export type Emirate = (typeof EMIRATES_LIST)[number];

export const formatEmirate = (emirate: string) => {
  const map: Record<string, string> = {
    AbuDhabi: "Abu Dhabi",
    RasAlKhaimah: "RAK",
    UmmAlQuwain: "UAQ",
    Fujairah: "Fujairah",
    Dubai: "Dubai",
    Sharjah: "Sharjah",
    Ajman: "Ajman",
  };
  return map[emirate] || emirate;
};

export const formatDocType = (type: string) => {
  const map: Record<string, string> = {
    EmiratesID: "Emirates ID",
    Mulkiya: "Mulkiya",
    DrivingLicense: "Driving License",
    Passport: "Passport",
    Visa: "Visa",
    Insurance: "Insurance",
    Ejari: "Ejari",
    Other: "Other",
  };
  return map[type] || type;
};

export const getDaysRemaining = (expiryDate: string) => {
  const today = new Date();
  const expiry = new Date(`${expiryDate}T00:00:00`);
  today.setHours(0, 0, 0, 0);
  return Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
};

export type UrgencyLevel = "Expired" | "Critical" | "Warning" | "Safe";

export const getUrgency = (days: number): UrgencyLevel => {
  if (days < 0) return "Expired";
  if (days <= 30) return "Critical";
  if (days <= 90) return "Warning";
  return "Safe";
};

export const formatFileSize = (size?: number) => {
  if (!size) return "Unknown size";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

export const computeComplianceScore = (
  documents: DocumentRecord[],
  hasActiveParking: boolean,
) => {
  if (documents.length === 0 && !hasActiveParking) return 100;

  let score = 100;
  documents.forEach((doc) => {
    const days = getDaysRemaining(doc.expiryDate);
    const urgency = getUrgency(days);
    if (urgency === "Expired") score -= 18;
    else if (urgency === "Critical") score -= 10;
    else if (urgency === "Warning") score -= 4;
  });

  if (hasActiveParking) score += 5;

  return Math.max(0, Math.min(100, score));
};

export const getDocIconName = (
  type: DocumentRecord["type"],
): "id-card" | "car" | "passport" | "file-lines" | "shield" | "house" | "file" => {
  const map: Record<DocumentRecord["type"], "id-card" | "car" | "passport" | "file-lines" | "shield" | "house" | "file"> = {
    EmiratesID: "id-card",
    Mulkiya: "car",
    DrivingLicense: "id-card",
    Passport: "passport",
    Visa: "file-lines",
    Insurance: "shield",
    Ejari: "house",
    Other: "file",
  };
  return map[type];
};
