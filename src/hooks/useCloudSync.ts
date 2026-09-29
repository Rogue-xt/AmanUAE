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
  console.log("Cloud sync hook running");
  console.log("User:", user?.uid);
  console.log("Vehicles:", vehicles.length);
  console.log("Documents:", documents.length);
  console.log("Parking Sessions:", parkingSessions.length);

  useEffect(() => {
    if (!user?.uid || isLoading || !hasRestored || restoredUid !== user.uid)
      return;
    vehicles.forEach((vehicle) => {
      CloudService.saveVehicle(user.uid, vehicle)
        .then(() => console.log("Vehicle synced:", vehicle.id, vehicle.label))
        .catch((error) => console.log("Vehicle sync failed:", error));
    });
  }, [vehicles, user, isLoading, hasRestored, restoredUid]);

  useEffect(() => {
    if (!user?.uid || isLoading || !hasRestored || restoredUid !== user.uid)
      return;
    documents.forEach((documentItem) => {
      CloudService.saveDocument(user.uid, documentItem).catch(console.error);
    });
  }, [documents, user, isLoading, hasRestored, restoredUid]);

  useEffect(() => {
    if (!user?.uid || isLoading || !hasRestored || restoredUid !== user.uid)
      return;
    parkingSessions.forEach((session) => {
      CloudService.saveParkingSession(user.uid, session).catch(console.error);
    });
  }, [parkingSessions, user, isLoading, hasRestored, restoredUid]);
}
