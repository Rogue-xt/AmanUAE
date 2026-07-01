import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";

import { db } from "@/src/firebase/firebaseConfig";
import {
  ActiveTicket,
  DocumentRecord,
  ParkingSession,
  VehicleProfile,
} from "@/src/context/AppContext";

export type CloudBackup = {
  vehicles: VehicleProfile[];
  documents: DocumentRecord[];
  parkingSessions: ParkingSession[];
  activeTicket: ActiveTicket | null;
};
function removeUndefinedFields<T extends Record<string, any>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as T;
}

const userDoc = (uid: string) => doc(db, "users", uid);

export async function saveVehicleToCloud(uid: string, vehicle: VehicleProfile) {
  const ref = doc(db, "users", uid, "vehicles", vehicle.id);

  console.log("Saving vehicle to:", ref.path);

  await setDoc(ref, removeUndefinedFields(vehicle));
}
export async function deleteVehicleFromCloud(uid: string, vehicleId: string) {
  await deleteDoc(doc(userDoc(uid), "vehicles", vehicleId));
}
export async function saveDocumentToCloud(
  uid: string,
  documentData: DocumentRecord,
) {
  await setDoc(
    doc(userDoc(uid), "documents", documentData.id),
    removeUndefinedFields(documentData),
  );
}

export async function deleteDocumentFromCloud(uid: string, documentId: string) {
  await deleteDoc(doc(userDoc(uid), "documents", documentId));
}

export async function saveParkingSessionToCloud(
  uid: string,
  session: ParkingSession,
) {
  await setDoc(
    doc(userDoc(uid), "parkingSessions", session.id),
    removeUndefinedFields(session),
  );
}

export async function saveActiveTicketToCloud(
  uid: string,
  activeTicket: ActiveTicket | null,
) {
  await setDoc(doc(userDoc(uid), "meta", "activeTicket"), {
    value: activeTicket,
  });
}

export async function loadCloudBackup(uid: string): Promise<CloudBackup> {
  const [vehiclesSnap, documentsSnap, sessionsSnap, activeTicketSnap] =
    await Promise.all([
      getDocs(collection(userDoc(uid), "vehicles")),
      getDocs(collection(userDoc(uid), "documents")),
      getDocs(collection(userDoc(uid), "parkingSessions")),
      getDocs(collection(userDoc(uid), "meta")),
    ]);

  const activeTicketDoc = activeTicketSnap.docs.find(
    (item) => item.id === "activeTicket",
  );

  return {
    vehicles: vehiclesSnap.docs.map((item) => item.data() as VehicleProfile),
    documents: documentsSnap.docs.map((item) => item.data() as DocumentRecord),
    parkingSessions: sessionsSnap.docs.map(
      (item) => item.data() as ParkingSession,
    ),
    activeTicket:
      (activeTicketDoc?.data()?.value as ActiveTicket | null | undefined) ??
      null,
  };
}
