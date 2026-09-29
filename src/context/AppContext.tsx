import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/src/context/AuthContext";
import { CloudService } from "@/src/services/cloudService";
import {
  cancelNotification,
  cancelDocumentExpiryReminders,
  scheduleDocumentExpiryReminders,
  scheduleParkingExpiredReminder,
  scheduleParkingExpiryReminder,
} from "@/src/services/notificationService";
import {
  AbuDhabiParkingType,
  calculateRenewedParkingExpiry,
  isParkingEmirate,
} from "@/src/config/parkingRules";
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
  notificationIds?: string[];
}
// 1. Add this interface model right next to your other interface models at the top
export interface ActiveTicket {
  id: string;
  vehicleLabel: string;
  plateDetails: string;
  parkingEmirate: string;
  expiryTimestamp: number;
  expiryReminderNotificationId?: string | null;
  expiredNotificationId?: string | null;
  parkingType?: AbuDhabiParkingType;
}

export interface ParkingSession {
  id: string;
  vehicleId?: string;
  vehicleLabel: string;
  plateDetails: string;
  parkingEmirate: string;
  zoneCode?: string;
  durationHours?: number;
  parkingType?: AbuDhabiParkingType;
  startedAt: number;
  expiryTimestamp: number;
  endedAt?: number;
  status: "active" | "completed" | "expired";
  expiryReminderNotificationId?: string | null;
  expiredNotificationId?: string | null;
}
export interface StartParkingSessionInput {
  vehicleId?: string;
  vehicleLabel: string;
  plateDetails: string;

  parkingEmirate: string;

  zoneCode?: string;
  durationHours?: number;
  parkingType?: AbuDhabiParkingType;

  startedAt: number;
  expiryTimestamp: number;
}

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type: "parking" | "document" | "system" | "success" | "warning";

  createdAt: number;

  read: boolean;

  action?: {
    screen: string;
    id?: string;
  };
};
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

  renewParkingSession: (params: {
    sessionId: string;
    expectedExpiryTimestamp: number;
  }) => Promise<{
    renewed: boolean;
    reason?: string;
    notificationWarning?: boolean;
  }>;

  endParkingSession: (sessionId: string) => Promise<void>;

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
  restoredUid: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const getStorageKeys = (uid: string) => ({
  vehicles: `@zonegard_${uid}_vehicles`,
  documents: `@zonegard_${uid}_documents`,
  activeTicket: `@zonegard_${uid}_active_ticket`,
  parkingSessions: `@zonegard_${uid}_parking_sessions`,
});
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleProfile[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTicket, setActiveTicket] = useState<ActiveTicket | null>(null);
  const [parkingSessions, setParkingSessions] = useState<ParkingSession[]>([]);
  const [hasRestored, setHasRestored] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [restoredUid, setRestoredUid] = useState<string | null>(null);
  const renewingSessionIds = useRef(new Set<string>());

  // 3. Hydration Phase: Load everything from local device memory on app bootup
  // C. Update your initial useEffect hydration block to pull active tickets on bootup

  useEffect(() => {
    const loadStoredData = async () => {
      if (!user?.uid) {
        resetAppState();
        setRestoredUid(null);
        setHasRestored(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setHasRestored(false);
      setRestoredUid(null);
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
          setRestoredUid(user.uid);
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
        setRestoredUid(user.uid);
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
      const completeTicket: ActiveTicket = {
        id: Date.now().toString(),

        vehicleLabel: newTicket.vehicleLabel,
        plateDetails: newTicket.plateDetails,
        parkingEmirate: newTicket.parkingEmirate,
        parkingType: newTicket.parkingType,

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
        parkingType: newTicket.parkingType,
        startedAt,
        expiryTimestamp: newTicket.expiryTimestamp,
        status: "active",
      };
      const expiryReminderNotificationId = await scheduleParkingExpiryReminder({
        sessionId: completeTicket.id,
        vehicleLabel: completeTicket.vehicleLabel,
        parkingEmirate: completeTicket.parkingEmirate,
        expiryTimestamp: completeTicket.expiryTimestamp,
      });

      const expiredNotificationId = await scheduleParkingExpiredReminder({
        sessionId: completeTicket.id,
        vehicleLabel: completeTicket.vehicleLabel,
        parkingEmirate: completeTicket.parkingEmirate,
        expiryTimestamp: completeTicket.expiryTimestamp,
      });

      completeTicket.expiryReminderNotificationId =
        expiryReminderNotificationId;
      completeTicket.expiredNotificationId = expiredNotificationId;

      sessionRecord.expiryReminderNotificationId = expiryReminderNotificationId;
      sessionRecord.expiredNotificationId = expiredNotificationId;

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

  const renewParkingSession: AppContextType["renewParkingSession"] = async ({
    sessionId,
    expectedExpiryTimestamp,
  }) => {
    if (renewingSessionIds.current.has(sessionId)) {
      return {
        renewed: false,
        reason: "This renewal is already being confirmed.",
      };
    }

    renewingSessionIds.current.add(sessionId);

    try {
      const selectedSession = parkingSessions.find(
        (session) => session.id === sessionId,
      );

      if (!selectedSession) {
        return { renewed: false, reason: "Parking session not found." };
      }

      if (
        selectedSession.status !== "active" ||
        selectedSession.expiryTimestamp <= Date.now()
      ) {
        return {
          renewed: false,
          reason: "Expired or completed parking cannot be renewed.",
        };
      }

      if (selectedSession.expiryTimestamp !== expectedExpiryTimestamp) {
        return {
          renewed: false,
          reason: "This renewal was already applied or the session changed.",
        };
      }

      if (!isParkingEmirate(selectedSession.parkingEmirate)) {
        return {
          renewed: false,
          reason: "This parking area does not support ZoneGard renewal.",
        };
      }

      let renewedExpiry: number;

      try {
        renewedExpiry = calculateRenewedParkingExpiry({
          parkingEmirate: selectedSession.parkingEmirate,
          parkingType: selectedSession.parkingType,
          startedAt: selectedSession.startedAt,
          expiryTimestamp: selectedSession.expiryTimestamp,
        });
      } catch (error) {
        return {
          renewed: false,
          reason:
            error instanceof Error
              ? error.message
              : "This session cannot be renewed safely.",
        };
      }

      const cancellationResults = await Promise.allSettled([
        cancelNotification(
          selectedSession.expiryReminderNotificationId ?? undefined,
        ),
        cancelNotification(selectedSession.expiredNotificationId ?? undefined),
      ]);

      const renewedSession: ParkingSession = {
        ...selectedSession,
        durationHours: Math.round(
          (renewedExpiry - selectedSession.startedAt) / (60 * 60 * 1000),
        ),
        expiryTimestamp: renewedExpiry,
        expiryReminderNotificationId: null,
        expiredNotificationId: null,
      };
      let updatedSessions = parkingSessions.map((session) =>
        session.id === sessionId ? renewedSession : session,
      );
      let updatedActiveTicket = activeTicket;

      if (activeTicket?.id === sessionId) {
        updatedActiveTicket = {
          ...activeTicket,
          expiryTimestamp: renewedExpiry,
          expiryReminderNotificationId: null,
          expiredNotificationId: null,
        };
      }

      setParkingSessions(updatedSessions);
      setActiveTicket(updatedActiveTicket);

      if (user?.uid) {
        const keys = getStorageKeys(user.uid);
        const storageUpdates: [string, string][] = [
          [keys.parkingSessions, JSON.stringify(updatedSessions)],
        ];

        if (updatedActiveTicket) {
          storageUpdates.push([
            keys.activeTicket,
            JSON.stringify(updatedActiveTicket),
          ]);
        }

        await AsyncStorage.multiSet(storageUpdates);
      }

      const notificationResults = await Promise.allSettled([
        scheduleParkingExpiryReminder({
          sessionId,
          vehicleLabel: renewedSession.vehicleLabel,
          parkingEmirate: renewedSession.parkingEmirate,
          expiryTimestamp: renewedExpiry,
        }),
        scheduleParkingExpiredReminder({
          sessionId,
          vehicleLabel: renewedSession.vehicleLabel,
          parkingEmirate: renewedSession.parkingEmirate,
          expiryTimestamp: renewedExpiry,
        }),
      ]);
      const expiryReminderNotificationId =
        notificationResults[0].status === "fulfilled"
          ? notificationResults[0].value
          : null;
      const expiredNotificationId =
        notificationResults[1].status === "fulfilled"
          ? notificationResults[1].value
          : null;

      const sessionWithNotifications: ParkingSession = {
        ...renewedSession,
        expiryReminderNotificationId,
        expiredNotificationId,
      };
      updatedSessions = updatedSessions.map((session) =>
        session.id === sessionId ? sessionWithNotifications : session,
      );

      if (updatedActiveTicket?.id === sessionId) {
        updatedActiveTicket = {
          ...updatedActiveTicket,
          expiryReminderNotificationId,
          expiredNotificationId,
        };
      }

      setParkingSessions(updatedSessions);
      setActiveTicket(updatedActiveTicket);

      if (user?.uid) {
        const keys = getStorageKeys(user.uid);
        const storageUpdates: [string, string][] = [
          [keys.parkingSessions, JSON.stringify(updatedSessions)],
        ];

        if (updatedActiveTicket) {
          storageUpdates.push([
            keys.activeTicket,
            JSON.stringify(updatedActiveTicket),
          ]);
        }

        await AsyncStorage.multiSet(storageUpdates);
      }

      return {
        renewed: true,
        notificationWarning:
          cancellationResults.some((result) => result.status === "rejected") ||
          notificationResults.some((result) => result.status === "rejected"),
      };
    } catch (error) {
      console.error("Failed to renew parking session:", error);
      return {
        renewed: false,
        reason: "ZoneGard could not save the confirmed renewal.",
      };
    } finally {
      renewingSessionIds.current.delete(sessionId);
    }
  };

  //End parking
    const endParkingSession = async (sessionId: string) => {
      try {
        const selectedSession = parkingSessions.find(
          (session) => session.id === sessionId,
        );

        if (!selectedSession) {
          console.warn("Parking session not found:", sessionId);
          return;
        }

        if (selectedSession.status !== "active") {
          return;
        }

        await Promise.all([
          cancelNotification(
            selectedSession.expiryReminderNotificationId ?? undefined,
          ),
          cancelNotification(
            selectedSession.expiredNotificationId ?? undefined,
          ),
        ]);

        const now = Date.now();

        const updatedSessions: ParkingSession[] = parkingSessions.map(
          (session) =>
            session.id === sessionId
              ? {
                  ...session,
                  status:
                    session.expiryTimestamp <= now
                      ? ("expired" as const)
                      : ("completed" as const),
                  endedAt: now,
                  expiryReminderNotificationId: null,
                  expiredNotificationId: null,
                }
              : session,
        );

        setParkingSessions(updatedSessions);

        /*
         * Keep activeTicket temporarily for backward compatibility.
         * If the ended session was the current activeTicket, select another
         * active session so the existing dashboard does not become empty.
         */
        let nextActiveTicket = activeTicket;

        if (activeTicket?.id === sessionId) {
          const nextActiveSession = updatedSessions.find(
            (session) =>
              session.status === "active" &&
              session.expiryTimestamp > Date.now(),
          );

          nextActiveTicket = nextActiveSession
            ? {
                id: nextActiveSession.id,
                vehicleLabel: nextActiveSession.vehicleLabel,
                plateDetails: nextActiveSession.plateDetails,
                parkingEmirate: nextActiveSession.parkingEmirate,
                parkingType: nextActiveSession.parkingType,
                expiryTimestamp: nextActiveSession.expiryTimestamp,
                expiryReminderNotificationId:
                  nextActiveSession.expiryReminderNotificationId,
                expiredNotificationId: nextActiveSession.expiredNotificationId,
              }
            : null;

          setActiveTicket(nextActiveTicket);
        }

        if (!user?.uid) return;

        const keys = getStorageKeys(user.uid);

        const storageUpdates: [string, string][] = [
          [keys.parkingSessions, JSON.stringify(updatedSessions)],
        ];

        if (nextActiveTicket) {
          storageUpdates.push([
            keys.activeTicket,
            JSON.stringify(nextActiveTicket),
          ]);

          await AsyncStorage.multiSet(storageUpdates);
        } else {
          await AsyncStorage.setItem(
            keys.parkingSessions,
            JSON.stringify(updatedSessions),
          );

          await AsyncStorage.removeItem(keys.activeTicket);
        }
      } catch (error) {
        console.error("Failed to end selected parking session:", error);
      }
    };

    //Clear Parking
  // const clearParkingSession = async () => {
  //   await cancelNotification(
  //     activeTicket?.expiryReminderNotificationId ?? undefined,
  //   );
  //   await cancelNotification(activeTicket?.expiredNotificationId ?? undefined);
  //   try {
  //     if (activeTicket) {
  //       const now = Date.now();

  //       const updatedSessions = parkingSessions.map((session) =>
  //         session.id === activeTicket.id
  //           ? {
  //               ...session,
  //               status:
  //                 session.expiryTimestamp <= now
  //                   ? ("expired" as const)
  //                   : ("completed" as const),
  //               endedAt: now,
  //             }
  //           : session,
  //       );

  //       setParkingSessions(updatedSessions);
  //       if (!user?.uid) return;
  //       const keys = getStorageKeys(user.uid);
  //       await AsyncStorage.setItem(
  //         keys.parkingSessions,
  //         JSON.stringify(updatedSessions),
  //       );
  //     }

  //     setActiveTicket(null);
  //     if (!user?.uid) return;
  //     const keys = getStorageKeys(user.uid);
  //     await AsyncStorage.removeItem(keys.activeTicket);
  //   } catch (error) {
  //     console.error("Failed to flush active tracking matrix session:", error);
  //   }
  // };

    const clearParkingSession = async () => {
      if (!activeTicket?.id) return;

      await endParkingSession(activeTicket.id);
    };
  const deleteVehicle = async (id: string) => {
    try {
      const updatedVehicles = vehicles.filter((v) => v.id !== id);

      const updatedDocs = documents.map((doc) =>
        doc.vehicleId === id ? { ...doc, vehicleId: "" } : doc,
      );

      setVehicles(updatedVehicles);
      setDocuments(updatedDocs);

      if (!user?.uid) return;

      const keys = getStorageKeys(user.uid);

      await AsyncStorage.multiSet([
        [keys.vehicles, JSON.stringify(updatedVehicles)],
        [keys.documents, JSON.stringify(updatedDocs)],
      ]);

      await CloudService.deleteVehicle(user.uid, id);

      await Promise.all(
        updatedDocs
          .filter(
            (doc) =>
              documents.find((old) => old.id === doc.id)?.vehicleId === id,
          )
          .map((doc) => CloudService.saveDocument(user.uid, doc)),
      );
    } catch (error) {
      console.error("Failed to delete vehicle:", error);
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
      const notificationIds = await scheduleDocumentExpiryReminders({
        documentId,
        title: newDoc.title,
        expiryDate: newDoc.expiryDate,
      });
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
        notificationIds,
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
      const existingDoc = documents.find((doc) => doc.id === id);

      await cancelDocumentExpiryReminders(existingDoc?.notificationIds);

      const updatedDocs = documents.filter((d) => d.id !== id);

      setDocuments(updatedDocs);

      if (!user?.uid) return;

      const keys = getStorageKeys(user.uid);

      await AsyncStorage.setItem(keys.documents, JSON.stringify(updatedDocs));

      await CloudService.deleteDocument(user.uid, id);
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  };

  // update doc.
  const updateDocument = async (
    id: string,
    payload: Partial<Omit<DocumentRecord, "id" | "createdAt">>,
  ) => {
    try {
      if (!user?.uid) return;

      const existingDoc = documents.find((doc) => doc.id === id);

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

      let notificationIds = existingDoc?.notificationIds || [];

      const expiryChanged =
        !!payload.expiryDate && payload.expiryDate !== existingDoc?.expiryDate;

      if (expiryChanged && payload.expiryDate) {
        await cancelDocumentExpiryReminders(existingDoc?.notificationIds);

        notificationIds = await scheduleDocumentExpiryReminders({
          documentId: id,
          title: payload.title || existingDoc?.title || "Document",
          expiryDate: payload.expiryDate,
        });
      }

      const updatedDocs = documents.map((doc) =>
        doc.id === id
          ? {
              ...doc,
              ...payload,
              fileUrl: fileUrl ?? doc.fileUrl,
              notificationIds,
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
      setRestoredUid(null);
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
      setRestoredUid(uid);
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
        renewParkingSession,
        endParkingSession,
        clearParkingSession,
        updateVehicle,
        updateDocument,
        parkingSessions,
        clearParkingHistory,
        resetAppState,
        restoreFromCloud,
        hasRestored,
        restoredUid,
        setHasRestored,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

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
