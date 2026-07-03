import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const DOCUMENT_REMINDER_DAYS = [30, 14, 7, 1];

export async function scheduleDocumentExpiryReminders(params: {
  documentId: string;
  title: string;
  expiryDate: string;
}) {
  const notificationIds: string[] = [];

  const expiry = new Date(`${params.expiryDate}T09:00:00`);
  if (Number.isNaN(expiry.getTime())) return notificationIds;

  for (const daysBefore of DOCUMENT_REMINDER_DAYS) {
    const reminderDate = new Date(expiry);
    reminderDate.setDate(expiry.getDate() - daysBefore);

    const secondsUntilReminder = Math.floor(
      (reminderDate.getTime() - Date.now()) / 1000,
    );

    if (secondsUntilReminder <= 0) continue;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Document expiry reminder",
        body: `${params.title} expires in ${daysBefore} day${
          daysBefore === 1 ? "" : "s"
        }.`,
        data: {
          type: "document-expiry",
          documentId: params.documentId,
          screen: "vault",
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilReminder,
      },
    });

    notificationIds.push(id);
  }

  return notificationIds;
}


export async function cancelDocumentExpiryReminders(ids?: string[]) {
  if (!ids?.length) return;

  await Promise.all(
    ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)),
  );
}
export async function requestNotificationPermission() {
  const existing = await Notifications.getPermissionsAsync();

  if (existing.status === "granted") return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
}

export async function cancelNotification(id?: string) {
  if (!id) return;
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function scheduleParkingExpiryReminder(params: {
  sessionId: string;
  vehicleLabel: string;
  parkingEmirate: string;
  expiryTimestamp: number;
}) {
  const secondsUntilReminder = Math.floor(
    (params.expiryTimestamp - Date.now()) / 1000 - 10 * 60,
  );

  if (secondsUntilReminder <= 0) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Parking expires soon",
      body: `${params.vehicleLabel} parking in ${params.parkingEmirate} expires in 10 minutes.`,
      data: {
        type: "parking-expiry-warning",
        sessionId: params.sessionId,
        screen: "parking",
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsUntilReminder,
    },
  });
}

export async function scheduleParkingExpiredReminder(params: {
  sessionId: string;
  vehicleLabel: string;
  parkingEmirate: string;
  expiryTimestamp: number;
}) {
  const secondsUntilExpiry = Math.floor(
    (params.expiryTimestamp - Date.now()) / 1000,
  );

  if (secondsUntilExpiry <= 0) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Parking expired",
      body: `${params.vehicleLabel} parking in ${params.parkingEmirate} has expired.`,
      data: {
        type: "parking-expired",
        sessionId: params.sessionId,
        screen: "parking-sessions",
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsUntilExpiry,
    },
  });
}
