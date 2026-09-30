import * as Notifications from "expo-notifications";

import type { ParkingSession } from "@/src/context/AppContext";
import { getParkingNotificationPlan } from "@/src/utils/parkingSessions";

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
  ownerUid: string;
}) {
  const secondsUntilReminder =
    Math.ceil((params.expiryTimestamp - Date.now()) / 1000) - 10 * 60;

  if (secondsUntilReminder <= 0) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Parking expires soon",
      body: `${params.vehicleLabel} parking in ${params.parkingEmirate} expires in 10 minutes.`,
      data: {
        type: "parking-expiry-warning",
        sessionId: params.sessionId,
        expiryTimestamp: params.expiryTimestamp,
        ownerUid: params.ownerUid,
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
  ownerUid: string;
}) {
  const secondsUntilExpiry = Math.ceil(
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
        expiryTimestamp: params.expiryTimestamp,
        ownerUid: params.ownerUid,
        screen: "parking-sessions",
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsUntilExpiry,
    },
  });
}

export async function getScheduledNotifications() {
  return Notifications.getAllScheduledNotificationsAsync();
}

type ParkingNotificationType =
  | "parking-expiry-warning"
  | "parking-expired";

function findScheduledParkingNotification(
  requests: Notifications.NotificationRequest[],
  params: {
    storedId?: string | null;
    sessionId: string;
    type: ParkingNotificationType;
    expiryTimestamp: number;
    ownerUid?: string;
  },
) {
  return requests.find((request) => {
    const data = request.content.data;
    if (data?.type !== params.type || data?.sessionId !== params.sessionId) {
      return false;
    }

    const isStoredRequest = request.identifier === params.storedId;
    const hasCurrentMetadata =
      data.expiryTimestamp === params.expiryTimestamp &&
      (!params.ownerUid || data.ownerUid === params.ownerUid);

    return isStoredRequest
      ? data.expiryTimestamp == null || hasCurrentMetadata
      : hasCurrentMetadata;
  });
}

function getParkingNotificationRequests(
  requests: Notifications.NotificationRequest[],
  sessionId: string,
  type: ParkingNotificationType,
  ownerUid: string,
  storedId?: string | null,
) {
  return requests.filter(
    (request) => {
      const data = request.content.data;
      return (
        data?.type === type &&
        data?.sessionId === sessionId &&
        (data.ownerUid === ownerUid ||
          (data.ownerUid == null && request.identifier === storedId))
      );
    },
  );
}

export async function cancelScheduledParkingNotificationsForSession(
  session: ParkingSession,
  ownerUid: string,
  requests: Notifications.NotificationRequest[],
) {
  const parkingRequests = requests.filter(
    (request) => {
      const data = request.content.data;
      const isStoredLegacyRequest =
        data?.ownerUid == null &&
        (request.identifier === session.expiryReminderNotificationId ||
          request.identifier === session.expiredNotificationId);
      return (
        data?.sessionId === session.id &&
        (data?.type === "parking-expiry-warning" ||
          data?.type === "parking-expired") &&
        (data?.ownerUid === ownerUid || isStoredLegacyRequest)
      );
    },
  );
  return Promise.allSettled(
    parkingRequests.map((request) => cancelNotification(request.identifier)),
  );
}

export async function reconcileParkingNotifications(params: {
  session: ParkingSession;
  ownerUid: string;
  scheduledRequests?: Notifications.NotificationRequest[];
  now?: number;
}): Promise<{
  expiryReminderNotificationId: string | null;
  expiredNotificationId: string | null;
  notificationWarning: boolean;
}> {
  const now = params.now ?? Date.now();
  const plan = getParkingNotificationPlan(
    params.session.expiryTimestamp,
    now,
  );
  const scheduledRequests =
    params.scheduledRequests ?? (await getScheduledNotifications());
  let notificationWarning = false;

  const warningRequest = findScheduledParkingNotification(scheduledRequests, {
    storedId: params.session.expiryReminderNotificationId,
    sessionId: params.session.id,
    type: "parking-expiry-warning",
    expiryTimestamp: params.session.expiryTimestamp,
    ownerUid: params.ownerUid,
  });
  const expiryRequest = findScheduledParkingNotification(scheduledRequests, {
    storedId: params.session.expiredNotificationId,
    sessionId: params.session.id,
    type: "parking-expired",
    expiryTimestamp: params.session.expiryTimestamp,
    ownerUid: params.ownerUid,
  });

  const staleRequests = [
    ...getParkingNotificationRequests(
      scheduledRequests,
      params.session.id,
      "parking-expiry-warning",
      params.ownerUid,
      params.session.expiryReminderNotificationId,
    ).filter((request) => request.identifier !== warningRequest?.identifier),
    ...getParkingNotificationRequests(
      scheduledRequests,
      params.session.id,
      "parking-expired",
      params.ownerUid,
      params.session.expiredNotificationId,
    ).filter((request) => request.identifier !== expiryRequest?.identifier),
  ];
  const staleCancellationResults = await Promise.allSettled(
    staleRequests.map((request) => cancelNotification(request.identifier)),
  );
  if (staleCancellationResults.some((result) => result.status === "rejected")) {
    notificationWarning = true;
  }

  let expiryReminderNotificationId: string | null = null;
  if (plan.warningRequired) {
    if (warningRequest) {
      expiryReminderNotificationId = warningRequest.identifier;
    } else {
      try {
        expiryReminderNotificationId = await scheduleParkingExpiryReminder({
          sessionId: params.session.id,
          vehicleLabel: params.session.vehicleLabel,
          parkingEmirate: params.session.parkingEmirate,
          expiryTimestamp: params.session.expiryTimestamp,
          ownerUid: params.ownerUid,
        });
      } catch {
        notificationWarning = true;
      }
    }
  } else if (warningRequest) {
    try {
      await cancelNotification(warningRequest.identifier);
    } catch {
      notificationWarning = true;
    }
  }

  let expiredNotificationId: string | null = null;
  if (plan.expiryRequired) {
    if (expiryRequest) {
      expiredNotificationId = expiryRequest.identifier;
    } else {
      try {
        expiredNotificationId = await scheduleParkingExpiredReminder({
          sessionId: params.session.id,
          vehicleLabel: params.session.vehicleLabel,
          parkingEmirate: params.session.parkingEmirate,
          expiryTimestamp: params.session.expiryTimestamp,
          ownerUid: params.ownerUid,
        });
      } catch {
        notificationWarning = true;
      }
    }
  }

  return {
    expiryReminderNotificationId,
    expiredNotificationId,
    notificationWarning,
  };
}
