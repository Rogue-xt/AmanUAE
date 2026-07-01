import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/src/context/AuthContext";
import { CloudService } from "@/src/services/cloudService";
// import * as Notifications from "expo-notifications";

// 1. Define the structural blueprints for our data models

export interface VehicleProfile {
  id: string;
  label: string;
  emirate:
    | "Dubai"
    | "AbuDhabi"
    | "Sharjah"
    | "Ajman"
    | "RasAlKhaimah"
    | "UmmAlQuwain"
    | "Fujairah";
  plateCode: string;
  plateNumber: string;
  imageUri?: string;
  imageName?: string;
  imageUrl?: string;
}

export interface DocumentRecord {
  id: string;

  type:
    | "EmiratesID"
    | "Mulkiya"
    | "DrivingLicense"
    | "Ejari"
    | "Passport"
    | "Visa"
    | "Insurance"
    | "Other";

  title: string;

  expiryDate: string;

  fileName?: string;
  fileUri?: string;
  fileUrl?: string;
  mimeType?: string;
  fileSize?: number;
  vehicleId?: string;

  createdAt: number;
}
// 1. Add this interface model right next to your other interface models at the top
export interface ActiveTicket {
  id: string;
  vehicleLabel: string;
  plateDetails: string;
  parkingEmirate: string;
  expiryTimestamp: number; // Unix timestamp in milliseconds when the ticket expires
}

export interface ParkingSession {
  id: string;
  vehicleId?: string;
  vehicleLabel: string;
  plateDetails: string;
  parkingEmirate: string;
  zoneCode?: string;
  durationHours?: number;
  startedAt: number;
  expiryTimestamp: number;
  endedAt?: number;
  status: "active" | "completed" | "expired";
}
export interface StartParkingSessionInput {
  vehicleId?: string;
  vehicleLabel: string;
  plateDetails: string;

  parkingEmirate: string;

  zoneCode?: string;
  durationHours?: number;

  startedAt: number;
  expiryTimestamp: number;
}
// 2. Define exactly what functions and data are available globally
interface AppContextType {
  vehicles: VehicleProfile[];
  documents: DocumentRecord[];
  activeTicket: ActiveTicket | null;
  isLoading: boolean;
  addVehicle: (vehicle: Omit<VehicleProfile, "id">) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  addDocument: (doc: Omit<DocumentRecord, "id" | "createdAt">) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  startParkingSession: (ticket: StartParkingSessionInput) => Promise<void>;
  clearParkingSession: () => Promise<void>;
  parkingSessions: ParkingSession[];
  clearParkingHistory: () => Promise<void>;
  resetAppState: () => void;
  updateVehicle: (
    id: string,
    payload: Partial<Omit<VehicleProfile, "id">>,
  ) => Promise<void>;

  updateDocument: (
    id: string,
    payload: Partial<Omit<DocumentRecord, "id" | "createdAt">>,
  ) => Promise<void>;

  restoreFromCloud: (uid: string) => Promise<void>;
  hasRestored: boolean;
  setHasRestored: React.Dispatch<React.SetStateAction<boolean>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Define storage keys for internal device memory isolation
// const requestNotificationPermission = async () => {
//   const existing = await Notifications.getPermissionsAsync();

//   if (existing.status === "granted") {
//     return true;
//   }

//   const requested = await Notifications.requestPermissionsAsync();
//   return requested.status === "granted";
// };

const getStorageKeys = (uid: string) => ({
  vehicles: `@zonegard_${uid}_vehicles`,
  documents: `@zonegard_${uid}_documents`,
  activeTicket: `@zonegard_${uid}_active_ticket`,
  parkingSessions: `@zonegard_${uid}_parking_sessions`,
});
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleProfile[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTicket, setActiveTicket] = useState<ActiveTicket | null>(null);
  const [parkingSessions, setParkingSessions] = useState<ParkingSession[]>([]);
  const [hasRestored, setHasRestored] = useState(false);

  // 3. Hydration Phase: Load everything from local device memory on app bootup
  // C. Update your initial useEffect hydration block to pull active tickets on bootup

  useEffect(() => {
    const loadStoredData = async () => {
      if (!user?.uid) {
        resetAppState();
        setHasRestored(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setHasRestored(false);
      resetAppState();

      const keys = getStorageKeys(user.uid);

      try {
        const [
          storedVehicles,
          storedDocs,
          storedTicket,
          storedParkingSessions,
        ] = await Promise.all([
          AsyncStorage.getItem(keys.vehicles),
          AsyncStorage.getItem(keys.documents),
          AsyncStorage.getItem(keys.activeTicket),
          AsyncStorage.getItem(keys.parkingSessions),
        ]);

        const hasLocalData =
          storedVehicles || storedDocs || storedTicket || storedParkingSessions;

        if (hasLocalData) {
          if (storedVehicles) setVehicles(JSON.parse(storedVehicles));
          else setVehicles([]);

          if (storedDocs) setDocuments(JSON.parse(storedDocs));
          else setDocuments([]);

          if (storedParkingSessions) {
            const parsedSessions: ParkingSession[] = JSON.parse(
              storedParkingSessions,
            );

            const normalizedSessions = parsedSessions.map((session) =>
              session.status === "active" &&
              session.expiryTimestamp <= Date.now()
                ? {
                    ...session,
                    status: "expired" as const,
                    endedAt: session.expiryTimestamp,
                  }
                : session,
            );

            setParkingSessions(normalizedSessions);

            await AsyncStorage.setItem(
              keys.parkingSessions,
              JSON.stringify(normalizedSessions),
            );
          } else {
            setParkingSessions([]);
          }
          if (storedTicket) {
            const parsedTicket = JSON.parse(storedTicket);

            if (parsedTicket && parsedTicket.expiryTimestamp > Date.now()) {
              setActiveTicket(parsedTicket);
            } else {
              setActiveTicket(null);
              await AsyncStorage.removeItem(keys.activeTicket);
            }
          } else {
            setActiveTicket(null);
          }
          setHasRestored(true);
          return;
        }

        const cloud = await CloudService.restoreUser(user.uid);

        setVehicles(cloud.vehicles);
        setDocuments(cloud.documents);
        setParkingSessions(cloud.parkingSessions);
        setActiveTicket(cloud.activeTicket);

        await AsyncStorage.multiSet([
          [keys.vehicles, JSON.stringify(cloud.vehicles)],
          [keys.documents, JSON.stringify(cloud.documents)],
          [keys.parkingSessions, JSON.stringify(cloud.parkingSessions)],
          [keys.activeTicket, JSON.stringify(cloud.activeTicket)],
        ]);
        setHasRestored(true);
      } catch (error) {
        console.error("Failed to load user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredData();
  }, [user?.uid]);

  // D. Add the worker dispatcher functions to start and clear active countdown values
  const startParkingSession = async (newTicket: StartParkingSessionInput) => {
    try {
      const startedAt = newTicket.startedAt ?? Date.now();

      // const completeTicket: ActiveTicket = {
      //   ...newTicket,
      //   id: Date.now().toString(),
      // };
      const completeTicket: ActiveTicket = {
        id: Date.now().toString(),

        vehicleLabel: newTicket.vehicleLabel,
        plateDetails: newTicket.plateDetails,
        parkingEmirate: newTicket.parkingEmirate,

        expiryTimestamp: newTicket.expiryTimestamp,
      };

      const sessionRecord: ParkingSession = {
        id: completeTicket.id,
        vehicleId: newTicket.vehicleId,
        vehicleLabel: newTicket.vehicleLabel,
        plateDetails: newTicket.plateDetails,
        parkingEmirate: newTicket.parkingEmirate,
        zoneCode: newTicket.zoneCode,
        durationHours: newTicket.durationHours,
        startedAt,
        expiryTimestamp: newTicket.expiryTimestamp,
        status: "active",
      };

      const updatedSessions = [sessionRecord, ...parkingSessions];

      setActiveTicket(completeTicket);
      setParkingSessions(updatedSessions);
      if (!user?.uid) return;
      const keys = getStorageKeys(user.uid);
      await AsyncStorage.multiSet([
        [keys.activeTicket, JSON.stringify(completeTicket)],
        [keys.parkingSessions, JSON.stringify(updatedSessions)],
      ]);
    } catch (error) {
      console.error("Failed to initialize tracking countdown layer:", error);
    }
  };
  const clearParkingSession = async () => {
    //   const notificationId = await AsyncStorage.getItem(
    //     TICKET_NOTIFICATION_KEY,
    //   );

    //   if (notificationId) {
    //     await Notifications.cancelScheduledNotificationAsync(notificationId);
    //     await AsyncStorage.removeItem(TICKET_NOTIFICATION_KEY);
    //   }

    try {
      if (activeTicket) {
        const now = Date.now();

        const updatedSessions = parkingSessions.map((session) =>
          session.id === activeTicket.id
            ? {
                ...session,
                status:
                  session.expiryTimestamp <= now
                    ? ("expired" as const)
                    : ("completed" as const),
                endedAt: now,
              }
            : session,
        );

        setParkingSessions(updatedSessions);
        if (!user?.uid) return;
        const keys = getStorageKeys(user.uid);
        await AsyncStorage.setItem(
          keys.parkingSessions,
          JSON.stringify(updatedSessions),
        );
      }

      setActiveTicket(null);
      if (!user?.uid) return;
      const keys = getStorageKeys(user.uid);
      await AsyncStorage.removeItem(keys.activeTicket);
    } catch (error) {
      console.error("Failed to flush active tracking matrix session:", error);
    }
  };

  const deleteVehicle = async (id: string) => {
    try {
      const updatedVehicles = vehicles.filter((v) => v.id !== id);
      setVehicles(updatedVehicles);
      if (!user?.uid) return;
      const keys = getStorageKeys(user.uid);
      await AsyncStorage.setItem(
        keys.vehicles,
        JSON.stringify(updatedVehicles),
      );
    } catch (error) {
      console.error("Failed to update vehicle log entry deletion:", error);
    }
  };
  // 4. Vehicle Operations with Auto-Save Flushing
  const addVehicle = async (newVehicle: Omit<VehicleProfile, "id">) => {
    try {
      if (!user?.uid) return;

      const vehicleId = Date.now().toString();

      let imageUrl = newVehicle.imageUrl;

      if (newVehicle.imageUri && !newVehicle.imageUri.startsWith("http")) {
        imageUrl = await CloudService.uploadVehicleImage(
          user.uid,
          vehicleId,
          newVehicle.imageUri,
        );
      }

      const vehicleWithId: VehicleProfile = {
        ...newVehicle,
        id: vehicleId,
        imageUrl,
      };

      const updatedVehicles = [...vehicles, vehicleWithId];

      setVehicles(updatedVehicles);

      const keys = getStorageKeys(user.uid);

      await AsyncStorage.setItem(
        keys.vehicles,
        JSON.stringify(updatedVehicles),
      );
    } catch (error) {
      console.error("Failed to save vehicle profile:", error);
    }
  };
  // Update Vehicle
  const updateVehicle = async (
    id: string,
    payload: Partial<Omit<VehicleProfile, "id">>,
  ) => {
    try {
      if (!user?.uid) return;

      let imageUrl = payload.imageUrl;

      if (payload.imageUri && !payload.imageUri.startsWith("http")) {
        imageUrl = await CloudService.uploadVehicleImage(
          user.uid,
          id,
          payload.imageUri,
        );
      }

      const updatedVehicles = vehicles.map((vehicle) =>
        vehicle.id === id
          ? {
              ...vehicle,
              ...payload,
              imageUrl: imageUrl ?? vehicle.imageUrl,
            }
          : vehicle,
      );

      setVehicles(updatedVehicles);

      const keys = getStorageKeys(user.uid);

      await AsyncStorage.setItem(
        keys.vehicles,
        JSON.stringify(updatedVehicles),
      );
    } catch (error) {
      console.error("Failed to update vehicle profile:", error);
    }
  };
  // 5. Document Operations with Auto-Save Flushing
const addDocument = async (
  newDoc: Omit<DocumentRecord, "id" | "createdAt">,
) => {
  try {
    if (!user?.uid) return;

    const documentId = Date.now().toString();
    let fileUrl = newDoc.fileUrl;

    if (newDoc.fileUri && !newDoc.fileUri.startsWith("http")) {
      fileUrl = await CloudService.uploadDocumentFile(
        user.uid,
        documentId,
        newDoc.fileUri,
        newDoc.fileName,
        newDoc.mimeType,
      );
    }

    const docWithId: DocumentRecord = {
      ...newDoc,
      id: documentId,
      fileUrl,
      createdAt: Date.now(),
    };

    const updatedDocs = [...documents, docWithId];

    setDocuments(updatedDocs);

    const keys = getStorageKeys(user.uid);
    await AsyncStorage.setItem(keys.documents, JSON.stringify(updatedDocs));
  } catch (error) {
    console.error("Failed to save document profile entry:", error);
  }
};

  //Delete doc
  const deleteDocument = async (id: string) => {
    try {
      const updatedDocs = documents.filter((d) => d.id !== id);
      setDocuments(updatedDocs);
      if (!user?.uid) return;
      const keys = getStorageKeys(user.uid);
      await AsyncStorage.setItem(keys.documents, JSON.stringify(updatedDocs));
    } catch (error) {
      console.error("Failed to process document profile erasure:", error);
    }
  };

  // update doc.
const updateDocument = async (
  id: string,
  payload: Partial<Omit<DocumentRecord, "id" | "createdAt">>,
) => {
  try {
    if (!user?.uid) return;

    let fileUrl = payload.fileUrl;

    if (payload.fileUri && !payload.fileUri.startsWith("http")) {
      fileUrl = await CloudService.uploadDocumentFile(
        user.uid,
        id,
        payload.fileUri,
        payload.fileName,
        payload.mimeType,
      );
    }

    const updatedDocs = documents.map((doc) =>
      doc.id === id
        ? {
            ...doc,
            ...payload,
            fileUrl: fileUrl ?? doc.fileUrl,
          }
        : doc,
    );

    setDocuments(updatedDocs);

    const keys = getStorageKeys(user.uid);
    await AsyncStorage.setItem(keys.documents, JSON.stringify(updatedDocs));
  } catch (error) {
    console.error("Failed to update document record:", error);
  }
};


  const resetAppState = () => {
    setVehicles([]);
    setDocuments([]);
    setActiveTicket(null);
    setParkingSessions([]);
  };
  const clearParkingHistory = async () => {
    try {
      setParkingSessions([]);
      if (!user?.uid) return;
      const keys = getStorageKeys(user.uid);
      await AsyncStorage.removeItem(keys.parkingSessions);
    } catch (error) {
      console.error("Failed to clear parking history:", error);
    }
  };
  const restoreFromCloud = async (uid: string) => {
    try {
      setIsLoading(true);
      setHasRestored(false);
      resetAppState();

      const keys = getStorageKeys(uid);
      const cloud = await CloudService.restoreUser(uid);

      setVehicles(cloud.vehicles);
      setDocuments(cloud.documents);
      setParkingSessions(cloud.parkingSessions);
      setActiveTicket(cloud.activeTicket);

      await AsyncStorage.multiSet([
        [keys.vehicles, JSON.stringify(cloud.vehicles)],
        [keys.documents, JSON.stringify(cloud.documents)],
        [keys.parkingSessions, JSON.stringify(cloud.parkingSessions)],
        [keys.activeTicket, JSON.stringify(cloud.activeTicket)],
      ]);

      setHasRestored(true);
    } catch (error) {
      console.error("Failed to restore from cloud:", error);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <AppContext.Provider
      value={{
        vehicles,
        documents,
        isLoading,
        addVehicle,
        deleteVehicle,
        addDocument,
        deleteDocument,
        activeTicket,
        startParkingSession,
        clearParkingSession,
        updateVehicle,
        updateDocument,
        parkingSessions,
        clearParkingHistory,
        resetAppState,
        restoreFromCloud,
        hasRestored,
        setHasRestored,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};;

// 6. Custom React Hook interface for instant screen data streaming
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error(
      "useApp custom hook must be utilized inside an AppProvider wrapper shell.",
    );
  }
  return context;
};
