import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/src/firebase/firebaseConfig";
import {
  DocumentRecord,
  ParkingSession,
  VehicleProfile,
} from "@/src/context/AppContext";
import { omitUndefinedDeep } from "@/src/utils/firestoreSerialization";

export type CloudBackup = {
  vehicles: VehicleProfile[];
  documents: DocumentRecord[];
  parkingSessions: ParkingSession[];
};
const userDoc = (uid: string) => doc(db, "users", uid);

export async function saveVehicleToCloud(uid: string, vehicle: VehicleProfile) {
  const ref = doc(db, "users", uid, "vehicles", vehicle.id);

  await setDoc(ref, omitUndefinedDeep(vehicle));
}

export async function saveDocumentToCloud(
  uid: string,
  documentData: DocumentRecord,
) {
  await setDoc(
    doc(userDoc(uid), "documents", documentData.id),
    omitUndefinedDeep(documentData),
  );
}
export async function saveParkingSessionToCloud(
  uid: string,
  session: ParkingSession,
) {
  await setDoc(
    doc(userDoc(uid), "parkingSessions", session.id),
    omitUndefinedDeep(session),
  );
}

export async function deleteVehicleFromCloud(uid: string, vehicleId: string) {
  await deleteDoc(doc(db, "users", uid, "vehicles", vehicleId));
}

export async function deleteDocumentFromCloud(uid: string, documentId: string) {
  await deleteDoc(doc(db, "users", uid, "documents", documentId));
}

export async function deleteParkingSessionFromCloud(
  uid: string,
  sessionId: string,
) {
  await deleteDoc(doc(db, "users", uid, "parkingSessions", sessionId));
}

export async function deleteParkingSessionsFromCloud(
  uid: string,
  sessionIds: string[],
) {
  if (sessionIds.length === 0) return;

  const batch = writeBatch(db);
  sessionIds.forEach((sessionId) => {
    batch.delete(doc(db, "users", uid, "parkingSessions", sessionId));
  });
  await batch.commit();
}
export async function loadCloudBackup(uid: string): Promise<CloudBackup> {
  const [vehiclesSnap, documentsSnap, sessionsSnap] = await Promise.all([
    getDocs(collection(userDoc(uid), "vehicles")),
    getDocs(collection(userDoc(uid), "documents")),
    getDocs(collection(userDoc(uid), "parkingSessions")),
  ]);

  return {
    vehicles: vehiclesSnap.docs.map((item) => item.data() as VehicleProfile),
    documents: documentsSnap.docs.map((item) => item.data() as DocumentRecord),
    parkingSessions: sessionsSnap.docs.map(
      (item) => item.data() as ParkingSession,
    ),
  };
}
