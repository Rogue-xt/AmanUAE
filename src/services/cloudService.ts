import {
  ActiveTicket,
  DocumentRecord,
  ParkingSession,
  VehicleProfile,
} from "@/src/context/AppContext";

import {
  loadCloudBackup,
  saveActiveTicketToCloud,
  saveDocumentToCloud,
  saveParkingSessionToCloud,
  saveVehicleToCloud,
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

  saveActiveTicket(uid: string, activeTicket: ActiveTicket | null) {
    return saveActiveTicketToCloud(uid, activeTicket);
  },

  restoreUser(uid: string) {
    return loadCloudBackup(uid);
  },

  // Supabase files
  uploadVehicleImage(uid: string, vehicleId: string, imageUri: string) {
    return uploadVehicleImageToSupabase(uid, vehicleId, imageUri);
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
