import { useEffect } from "react";

import { useAuth } from "@/src/context/AuthContext";
import { useApp } from "@/src/context/AppContext";

import {
  saveActiveTicketToCloud,
  saveDocumentToCloud,
  saveParkingSessionToCloud,
  saveVehicleToCloud,
} from "@/src/services/firestoreSync";

export function useCloudSync() {
  const { user } = useAuth();
  const { vehicles, documents, parkingSessions, activeTicket } = useApp();
console.log("Cloud sync hook running");
console.log("User:", user?.uid);
console.log("Vehicles:", vehicles.length);
console.log("Documents:", documents.length);
console.log("Parking Sessions:", parkingSessions.length);
//   useEffect(() => {
//     if (!user) return;
//     vehicles.forEach((vehicle) => {
//       saveVehicleToCloud(user.uid, vehicle).catch(console.error);
//     });
//   }, [vehicles, user]);
useEffect(() => {
  if (!user) {
    console.log("CLOUD SYNC: no user");
    return;
  }

  console.log("CLOUD SYNC: vehicles", vehicles.length, user.uid);

  vehicles.forEach((vehicle) => {
    saveVehicleToCloud(user.uid, vehicle)
      .then(() => console.log("Vehicle synced:", vehicle.id))
      .catch((error) => console.log("Vehicle sync failed:", error));
  });
}, [vehicles, user]);

  useEffect(() => {
    if (!user) return;
    documents.forEach((documentItem) => {
      saveDocumentToCloud(user.uid, documentItem).catch(console.error);
    });
  }, [documents, user]);

  useEffect(() => {
    if (!user) return;
    parkingSessions.forEach((session) => {
      saveParkingSessionToCloud(user.uid, session).catch(console.error);
    });
  }, [parkingSessions, user]);

  useEffect(() => {
    if (!user) return;
    saveActiveTicketToCloud(user.uid, activeTicket).catch(console.error);
  }, [activeTicket, user]);
}
