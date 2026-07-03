import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

function safeFileName(fileName?: string) {
  return (fileName || `zonegard-document-${Date.now()}`)
    .replace(/\s+/g, "_")
    .replace(/[^\w.-]/g, "");
}

export async function prepareFileForSharing(
  sourceUri: string,
  fileName?: string,
) {
  const cacheUri = `${FileSystem.cacheDirectory}${safeFileName(fileName)}`;

  if (sourceUri.startsWith("http")) {
    const downloaded = await FileSystem.downloadAsync(sourceUri, cacheUri);
    return downloaded.uri;
  }

  await FileSystem.copyAsync({
    from: sourceUri,
    to: cacheUri,
  });

  return cacheUri;
}

export async function openFileWithViewer(
  sourceUri: string,
  fileName?: string,
  mimeType?: string,
) {
  const localUri = await prepareFileForSharing(sourceUri, fileName);

  if (Platform.OS === "android") {
    try {
      const IntentLauncher = require("expo-intent-launcher");

      const contentUri = await FileSystem.getContentUriAsync(localUri);

      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: contentUri,
        type: mimeType || "application/pdf",
        flags: 1,
      });

      return;
    } catch (error) {
      console.log("Native PDF viewer unavailable, using share sheet instead.");
    }
  }

  await Sharing.shareAsync(localUri, {
    mimeType: mimeType || "application/pdf",
    dialogTitle: "Open document",
  });
}
