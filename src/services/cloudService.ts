import {
  DocumentRecord,
  ParkingSession,
  VehicleProfile,
} from "@/src/context/AppContext";

import {
  loadCloudBackup,
  saveDocumentToCloud,
  saveParkingSessionToCloud,
  saveVehicleToCloud,
  deleteVehicleFromCloud,
  deleteDocumentFromCloud,
  deleteParkingSessionFromCloud,
  deleteParkingSessionsFromCloud,
} from "@/src/services/firestoreSync";

import {
  uploadDocumentFileToSupabase,
  uploadVehicleImageToSupabase,
} from "@/src/services/supabaseStorageService";

export const CloudService = {
  // Firestore metadata
  saveVehicle(uid: string, vehicle: VehicleProfile) {
    return saveVehicleToCloud(uid, vehicle);
  },

  saveDocument(uid: string, document: DocumentRecord) {
    return saveDocumentToCloud(uid, document);
  },

  saveParkingSession(uid: string, session: ParkingSession) {
    return saveParkingSessionToCloud(uid, session);
  },

  restoreUser(uid: string) {
    return loadCloudBackup(uid);
  },

  // Supabase files
  uploadVehicleImage(uid: string, vehicleId: string, imageUri: string) {
    return uploadVehicleImageToSupabase(uid, vehicleId, imageUri);
  },
  deleteVehicle(uid: string, vehicleId: string) {
    return deleteVehicleFromCloud(uid, vehicleId);
  },

  deleteDocument(uid: string, documentId: string) {
    return deleteDocumentFromCloud(uid, documentId);
  },

  deleteParkingSession(uid: string, sessionId: string) {
    return deleteParkingSessionFromCloud(uid, sessionId);
  },

  deleteParkingSessions(uid: string, sessionIds: string[]) {
    return deleteParkingSessionsFromCloud(uid, sessionIds);
  },
  
  uploadDocumentFile(
    uid: string,
    documentId: string,
    fileUri: string,
    fileName?: string,
    mimeType?: string,
  ) {
    return uploadDocumentFileToSupabase(
      uid,
      documentId,
      fileUri,
      fileName,
      mimeType,
    );
  },
};
