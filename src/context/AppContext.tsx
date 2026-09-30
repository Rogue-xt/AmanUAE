import React, {
  useCallback,
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
} from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/src/context/AuthContext";
import { CloudService } from "@/src/services/cloudService";
import {
  cancelNotification,
  cancelDocumentExpiryReminders,
  cancelScheduledParkingNotificationsForSession,
  getScheduledNotifications,
  reconcileParkingNotifications,
  scheduleDocumentExpiryReminders,
} from "@/src/services/notificationService";
import {
  AbuDhabiParkingType,
  calculateRenewedParkingExpiry,
  isParkingEmirate,
} from "@/src/config/parkingRules";
import {
  reconcileParkingSessions,
  retainActiveParkingSessions,
  stripParkingNotificationIds,
} from "@/src/utils/parkingSessions";
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
  isLoading: boolean;
  addVehicle: (vehicle: Omit<VehicleProfile, "id">) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  addDocument: (doc: Omit<DocumentRecord, "id" | "createdAt">) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  startParkingSession: (ticket: StartParkingSessionInput) => Promise<{
    started: boolean;
    notificationWarning?: boolean;
  }>;

  renewParkingSession: (params: {
    sessionId: string;
    expectedExpiryTimestamp: number;
  }) => Promise<{
    renewed: boolean;
    reason?: string;
    notificationWarning?: boolean;
  }>;

  endParkingSession: (sessionId: string) => Promise<void>;

  parkingSessions: ParkingSession[];
  clearParkingHistory: () => Promise<{
    cleared: boolean;
    reason?: string;
  }>;
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
  parkingSessions: `@zonegard_${uid}_parking_sessions`,
});
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleProfile[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [parkingSessions, setParkingSessions] = useState<ParkingSession[]>([]);
  const [hasRestored, setHasRestored] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [restoredUid, setRestoredUid] = useState<string | null>(null);
  const renewingSessionIds = useRef(new Set<string>());
  const parkingSessionsRef = useRef<ParkingSession[]>([]);
  const reliabilityInFlight = useRef(false);
  const activeUidRef = useRef(user?.uid);
  activeUidRef.current = user?.uid;

  useEffect(() => {
    parkingSessionsRef.current = parkingSessions;
  }, [parkingSessions]);

  const persistParkingSessions = useCallback(
    async (uid: string, sessions: ParkingSession[]) => {
      if (activeUidRef.current !== uid) return;
      parkingSessionsRef.current = sessions;
      setParkingSessions(sessions);
      const keys = getStorageKeys(uid);
      await AsyncStorage.setItem(
        keys.parkingSessions,
        JSON.stringify(sessions),
      );
    },
    [],
  );

  const prepareParkingSessions = useCallback(
    async (
      sessions: ParkingSession[],
      uid: string,
      options?: { stripCloudNotificationIds?: boolean },
    ) => {
      const now = Date.now();
      let prepared = reconcileParkingSessions(sessions, now);
      if (options?.stripCloudNotificationIds) {
        prepared = stripParkingNotificationIds(prepared);
      }

      let scheduledRequests;
      try {
        scheduledRequests = await getScheduledNotifications();
      } catch (error) {
        console.warn("Could not inspect scheduled parking reminders:", error);
        return { sessions: prepared, notificationWarning: true };
      }

      let notificationWarning = false;
      const repaired: ParkingSession[] = [];
      for (const session of prepared) {
        if (session.status !== "active" || session.expiryTimestamp <= now) {
          const cancellationResults =
            await cancelScheduledParkingNotificationsForSession(
              session,
              uid,
              scheduledRequests,
            );
          notificationWarning ||= cancellationResults.some(
            (result) => result.status === "rejected",
          );
          repaired.push(session);
          continue;
        }

        const notificationState = await reconcileParkingNotifications({
          session,
          ownerUid: uid,
          scheduledRequests,
          now,
        });
        notificationWarning ||= notificationState.notificationWarning;
        repaired.push({
          ...session,
          expiryReminderNotificationId:
            notificationState.expiryReminderNotificationId,
          expiredNotificationId: notificationState.expiredNotificationId,
        });
      }

      return { sessions: repaired, notificationWarning };
    },
    [],
  );

  const reconcileParkingReliability = useCallback(async () => {
    const uid = user?.uid;
    if (
      !uid ||
      !hasRestored ||
      restoredUid !== uid ||
      reliabilityInFlight.current
    ) {
      return;
    }

    reliabilityInFlight.current = true;
    try {
      const sourceSessions = parkingSessionsRef.current;
      const prepared = await prepareParkingSessions(sourceSessions, uid);
      if (parkingSessionsRef.current !== sourceSessions) return;
      await persistParkingSessions(uid, prepared.sessions);
    } catch (error) {
      console.error("Failed to reconcile parking reliability:", error);
    } finally {
      reliabilityInFlight.current = false;
    }
  }, [
    hasRestored,
    persistParkingSessions,
    prepareParkingSessions,
    restoredUid,
    user?.uid,
  ]);

  // 3. Hydration Phase: Load everything from local device memory on app bootup
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
        const [storedVehicles, storedDocs, storedParkingSessions] =
          await Promise.all([
            AsyncStorage.getItem(keys.vehicles),
            AsyncStorage.getItem(keys.documents),
            AsyncStorage.getItem(keys.parkingSessions),
          ]);
        if (activeUidRef.current !== user.uid) return;

        const hasLocalData =
          storedVehicles || storedDocs || storedParkingSessions;

        if (hasLocalData) {
          if (storedVehicles) setVehicles(JSON.parse(storedVehicles));
          else setVehicles([]);

          if (storedDocs) setDocuments(JSON.parse(storedDocs));
          else setDocuments([]);

          if (storedParkingSessions) {
            const parsedSessions: ParkingSession[] = JSON.parse(
              storedParkingSessions,
            );
            const prepared = await prepareParkingSessions(
              parsedSessions,
              user.uid,
            );
            await persistParkingSessions(user.uid, prepared.sessions);
          } else {
            setParkingSessions([]);
          }
          setHasRestored(true);
          setRestoredUid(user.uid);
          return;
        }

        const cloud = await CloudService.restoreUser(user.uid);
        if (activeUidRef.current !== user.uid) return;

        setVehicles(cloud.vehicles);
        setDocuments(cloud.documents);
        const preparedParking = await prepareParkingSessions(
          cloud.parkingSessions,
          user.uid,
          { stripCloudNotificationIds: true },
        );
        setParkingSessions(preparedParking.sessions);

        await AsyncStorage.multiSet([
          [keys.vehicles, JSON.stringify(cloud.vehicles)],
          [keys.documents, JSON.stringify(cloud.documents)],
          [keys.parkingSessions, JSON.stringify(preparedParking.sessions)],
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
  }, [persistParkingSessions, prepareParkingSessions, user?.uid]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void reconcileParkingReliability();
      }
    });
    return () => subscription.remove();
  }, [reconcileParkingReliability]);

  useEffect(() => {
    const nextExpiry = parkingSessions
      .filter((session) => session.status === "active")
      .reduce<number | null>(
        (earliest, session) =>
          earliest === null || session.expiryTimestamp < earliest
            ? session.expiryTimestamp
            : earliest,
        null,
      );
    if (nextExpiry === null || !user?.uid) return;

    const delay = Math.max(0, nextExpiry - Date.now() + 50);
    const timer = setTimeout(
      () => void reconcileParkingReliability(),
      Math.min(delay, 2_147_483_647),
    );
    return () => clearTimeout(timer);
  }, [parkingSessions, reconcileParkingReliability, user?.uid]);

  const startParkingSession = async (newTicket: StartParkingSessionInput) => {
    if (!user?.uid) return { started: false };

    let sessionPersisted = false;
    try {
      const startedAt = newTicket.startedAt ?? Date.now();
      const sessionId = Date.now().toString();

      const sessionRecord: ParkingSession = {
        id: sessionId,
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
      const updatedSessions = [sessionRecord, ...parkingSessionsRef.current];
      await persistParkingSessions(user.uid, updatedSessions);
      sessionPersisted = true;

      const prepared = await prepareParkingSessions(
        updatedSessions,
        user.uid,
      );
      await persistParkingSessions(user.uid, prepared.sessions);
      return {
        started: true,
        notificationWarning: prepared.notificationWarning,
      };
    } catch (error) {
      console.error("Failed to initialize tracking countdown layer:", error);
      return {
        started: sessionPersisted,
        notificationWarning: sessionPersisted,
      };
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
      const currentSessions = parkingSessionsRef.current;
      const selectedSession = currentSessions.find(
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
      let updatedSessions = currentSessions.map((session) =>
        session.id === sessionId ? renewedSession : session,
      );
      setParkingSessions(updatedSessions);

      if (user?.uid) {
        const keys = getStorageKeys(user.uid);
        await AsyncStorage.setItem(
          keys.parkingSessions,
          JSON.stringify(updatedSessions),
        );
      }

      let notificationWarning = cancellationResults.some(
        (result) => result.status === "rejected",
      );
      if (user?.uid) {
        const prepared = await prepareParkingSessions(
          updatedSessions,
          user.uid,
        );
        updatedSessions = prepared.sessions;
        notificationWarning ||= prepared.notificationWarning;
        await persistParkingSessions(user.uid, updatedSessions);
      }

      return {
        renewed: true,
        notificationWarning,
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

  const endParkingSession = async (sessionId: string) => {
    try {
        const currentSessions = parkingSessionsRef.current;
        const selectedSession = currentSessions.find(
          (session) => session.id === sessionId,
        );

        if (!selectedSession) {
          console.warn("Parking session not found:", sessionId);
          return;
        }

        if (selectedSession.status !== "active") {
          return;
        }

        const now = Date.now();
        const updatedSessions: ParkingSession[] = currentSessions.map(
          (session) =>
            session.id === sessionId
              ? {
                  ...session,
                  status:
                    session.expiryTimestamp <= now
                      ? ("expired" as const)
                      : ("completed" as const),
                  endedAt:
                    session.expiryTimestamp <= now
                      ? session.expiryTimestamp
                      : now,
                  expiryReminderNotificationId: null,
                  expiredNotificationId: null,
                }
              : session,
        );

        if (user?.uid) {
          await persistParkingSessions(user.uid, updatedSessions);
        } else {
          parkingSessionsRef.current = updatedSessions;
          setParkingSessions(updatedSessions);
        }

        await Promise.allSettled([
          cancelNotification(
            selectedSession.expiryReminderNotificationId ?? undefined,
          ),
          cancelNotification(
            selectedSession.expiredNotificationId ?? undefined,
          ),
        ]);
    } catch (error) {
      console.error("Failed to end selected parking session:", error);
    }
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
    parkingSessionsRef.current = [];
    setVehicles([]);
    setDocuments([]);
    setParkingSessions([]);
  };
  const clearParkingHistory = async () => {
    if (!user?.uid) {
      return { cleared: false, reason: "You must be signed in." };
    }

    try {
      const now = Date.now();
      const reconciled = reconcileParkingSessions(
        parkingSessionsRef.current,
        now,
      );
      const retainedSessions = retainActiveParkingSessions(reconciled, now);
      const retainedIds = new Set(
        retainedSessions.map((session) => session.id),
      );
      const historicalIds = reconciled
        .filter((session) => !retainedIds.has(session.id))
        .map((session) => session.id);

      await CloudService.deleteParkingSessions(user.uid, historicalIds);
      const keys = getStorageKeys(user.uid);
      await AsyncStorage.setItem(
        keys.parkingSessions,
        JSON.stringify(retainedSessions),
      );
      parkingSessionsRef.current = retainedSessions;
      setParkingSessions(retainedSessions);
      return { cleared: true };
    } catch (error) {
      console.error("Failed to clear parking history:", error);
      return {
        cleared: false,
        reason: "Couldn't clear parking history. Please try again.",
      };
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
      if (activeUidRef.current !== uid) return;

      setVehicles(cloud.vehicles);
      setDocuments(cloud.documents);
      const preparedParking = await prepareParkingSessions(
        cloud.parkingSessions,
        uid,
        { stripCloudNotificationIds: true },
      );
      setParkingSessions(preparedParking.sessions);

      await AsyncStorage.multiSet([
        [keys.vehicles, JSON.stringify(cloud.vehicles)],
        [keys.documents, JSON.stringify(cloud.documents)],
        [keys.parkingSessions, JSON.stringify(preparedParking.sessions)],
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
        startParkingSession,
        renewParkingSession,
        endParkingSession,
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
