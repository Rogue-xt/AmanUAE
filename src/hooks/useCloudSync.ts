import { useEffect } from "react";

import { useAuth } from "@/src/context/AuthContext";
import { useApp } from "@/src/context/AppContext";

import { CloudService } from "@/src/services/cloudService";

export function useCloudSync() {
  const { user } = useAuth();
  const {
    vehicles,
    documents,
    parkingSessions,
    isLoading,
    hasRestored,
    restoredUid,
  } = useApp();

  useEffect(() => {
    if (!user?.uid || isLoading || !hasRestored || restoredUid !== user.uid)
      return;
    vehicles.forEach((vehicle) => {
      CloudService.saveVehicle(user.uid, vehicle)
        .catch((error: unknown) => logCloudSyncError("vehicle", error));
    });
  }, [vehicles, user, isLoading, hasRestored, restoredUid]);

  useEffect(() => {
    if (!user?.uid || isLoading || !hasRestored || restoredUid !== user.uid)
      return;
    documents.forEach((documentItem) => {
      CloudService.saveDocument(user.uid, documentItem).catch(
        (error: unknown) => logCloudSyncError("document", error),
      );
    });
  }, [documents, user, isLoading, hasRestored, restoredUid]);

  useEffect(() => {
    if (!user?.uid || isLoading || !hasRestored || restoredUid !== user.uid)
      return;
    parkingSessions.forEach((session) => {
      CloudService.saveParkingSession(user.uid, session).catch(
        (error: unknown) => logCloudSyncError("parking session", error),
      );
    });
  }, [parkingSessions, user, isLoading, hasRestored, restoredUid]);
}

function logCloudSyncError(scope: string, error: unknown) {
  const detail = error instanceof Error ? error.message : "Unknown error";
  console.error(`Failed to sync ${scope}: ${detail}`);
}
