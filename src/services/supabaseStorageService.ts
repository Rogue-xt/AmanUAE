import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";

import { supabase } from "@/src/supabase/supabaseClient";

const BUCKET = "zonegard-files";

//Vehicle image

export async function uploadVehicleImageToSupabase(
  uid: string,
  vehicleId: string,
  imageUri: string,
) {
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: "base64",
  });

  const filePath = `users/${uid}/vehicles/${vehicleId}.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, decode(base64), {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

  return data.publicUrl;
}


//Doc image
export async function uploadDocumentFileToSupabase(
  uid: string,
  documentId: string,
  fileUri: string,
  fileName?: string,
  mimeType?: string,
) {
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: "base64",
  });

  const extension = fileName?.split(".").pop() || "file";
  const filePath = `users/${uid}/documents/${documentId}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, decode(base64), {
      contentType: mimeType || "application/octet-stream",
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

  return data.publicUrl;
}