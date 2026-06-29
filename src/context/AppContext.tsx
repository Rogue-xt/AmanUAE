import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
}export interface StartParkingSessionInput {
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
  updateVehicle: (
    id: string,
    payload: Partial<Omit<VehicleProfile, "id">>,
  ) => Promise<void>;

  updateDocument: (
    id: string,
    payload: Partial<Omit<DocumentRecord, "id" | "createdAt">>,
  ) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Define storage keys for internal device memory isolation
const VEHICLES_STORAGE_KEY = "@zonegard_vehicles";
const DOCUMENTS_STORAGE_KEY = "@zonegard_documents";
const TICKET_STORAGE_KEY = "@zonegard_active_ticket";
const TICKET_NOTIFICATION_KEY = "@zonegard_ticket_notification_id";
const PARKING_SESSIONS_STORAGE_KEY = "@zonegard_parking_sessions";


// const requestNotificationPermission = async () => {
//   const existing = await Notifications.getPermissionsAsync();

//   if (existing.status === "granted") {
//     return true;
//   }

//   const requested = await Notifications.requestPermissionsAsync();
//   return requested.status === "granted";
// };
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vehicles, setVehicles] = useState<VehicleProfile[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTicket, setActiveTicket] = useState<ActiveTicket | null>(null);
  const [parkingSessions, setParkingSessions] = useState<ParkingSession[]>([]);

  // 3. Hydration Phase: Load everything from local device memory on app bootup
  // C. Update your initial useEffect hydration block to pull active tickets on bootup
  useEffect(() => {
    const loadStoredData = async () => {
      try {
     const [storedVehicles, storedDocs, storedTicket, storedParkingSessions] =
       await Promise.all([
         AsyncStorage.getItem(VEHICLES_STORAGE_KEY),
         AsyncStorage.getItem(DOCUMENTS_STORAGE_KEY),
         AsyncStorage.getItem(TICKET_STORAGE_KEY),
         AsyncStorage.getItem(PARKING_SESSIONS_STORAGE_KEY),
       ]);

        if (storedVehicles) setVehicles(JSON.parse(storedVehicles));
        if (storedDocs) setDocuments(JSON.parse(storedDocs));
        if (storedParkingSessions) {
          const parsedSessions: ParkingSession[] = JSON.parse(
            storedParkingSessions,
          );

          const normalizedSessions = parsedSessions.map((session) =>
            session.status === "active" && session.expiryTimestamp <= Date.now()
              ? { ...session, status: "expired" as const }
              : session,
          );

          setParkingSessions(normalizedSessions);

          await AsyncStorage.setItem(
            PARKING_SESSIONS_STORAGE_KEY,
            JSON.stringify(normalizedSessions),
          );
        }

        // If a ticket exists, check if it already expired while the app was closed
        if (storedTicket) {
          const parsedTicket: ActiveTicket = JSON.parse(storedTicket);
          if (parsedTicket.expiryTimestamp > Date.now()) {
            setActiveTicket(parsedTicket);
          } else {
            // If it expired past the current system wall clock time, clean it up automatically
            await AsyncStorage.removeItem(TICKET_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error("Failed to load local data from device memory:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredData();
  }, []);

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

    await AsyncStorage.multiSet([
      [TICKET_STORAGE_KEY, JSON.stringify(completeTicket)],
      [PARKING_SESSIONS_STORAGE_KEY, JSON.stringify(updatedSessions)],
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

     await AsyncStorage.setItem(
       PARKING_SESSIONS_STORAGE_KEY,
       JSON.stringify(updatedSessions),
     );
   }

   setActiveTicket(null);
   await AsyncStorage.removeItem(TICKET_STORAGE_KEY);
 } catch (error) {
   console.error("Failed to flush active tracking matrix session:", error);
 }
  };

  // 4. Vehicle Operations with Auto-Save Flushing
  const addVehicle = async (newVehicle: Omit<VehicleProfile, "id">) => {
    try {
      const vehicleWithId: VehicleProfile = {
        ...newVehicle,
        id: Date.now().toString(), // Generate a safe unique runtime timestamp identifier
        
      };
      const updatedVehicles = [...vehicles, vehicleWithId];
      setVehicles(updatedVehicles);
      await AsyncStorage.setItem(
        VEHICLES_STORAGE_KEY,
        JSON.stringify(updatedVehicles),
      );
    } catch (error) {
      console.error("Failed to save vehicle profile to device memory:", error);
    }
  };

  const deleteVehicle = async (id: string) => {
    try {
      const updatedVehicles = vehicles.filter((v) => v.id !== id);
      setVehicles(updatedVehicles);
      await AsyncStorage.setItem(
        VEHICLES_STORAGE_KEY,
        JSON.stringify(updatedVehicles),
      );
    } catch (error) {
      console.error("Failed to update vehicle log entry deletion:", error);
    }
  };

 

  // Update Vehicle
  const updateVehicle = async (
    id: string,
    payload: Partial<Omit<VehicleProfile, "id">>,
  ) => {
    try {
      const updatedVehicles = vehicles.map((vehicle) =>
        vehicle.id === id ? { ...vehicle, ...payload } : vehicle,
      );

      setVehicles(updatedVehicles);

      await AsyncStorage.setItem(
        VEHICLES_STORAGE_KEY,
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
      const docWithId: DocumentRecord = {
        ...newDoc,
        id: Date.now().toString(),
        createdAt: Date.now(),
      };

      const updatedDocs = [...documents, docWithId];

      setDocuments(updatedDocs);

      await AsyncStorage.setItem(
        DOCUMENTS_STORAGE_KEY,
        JSON.stringify(updatedDocs),
      );
    } catch (error) {
      console.error("Failed to save document profile entry:", error);
    }
  };

  //Delete doc
  const deleteDocument = async (id: string) => {
    try {
      const updatedDocs = documents.filter((d) => d.id !== id);
      setDocuments(updatedDocs);
      await AsyncStorage.setItem(
        DOCUMENTS_STORAGE_KEY,
        JSON.stringify(updatedDocs),
      );
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
      const updatedDocs = documents.map((doc) =>
        doc.id === id ? { ...doc, ...payload } : doc,
      );

      setDocuments(updatedDocs);

      await AsyncStorage.setItem(
        DOCUMENTS_STORAGE_KEY,
        JSON.stringify(updatedDocs),
      );
    } catch (error) {
      console.error("Failed to update document record:", error);
    }
  };

  const clearParkingHistory = async () => {
    try {
      setParkingSessions([]);
      await AsyncStorage.removeItem(PARKING_SESSIONS_STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear parking history:", error);
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
};;;

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
