import type { ParkingSession } from "@/src/context/AppContext";

export const PARKING_WARNING_LEAD_MS = 10 * 60 * 1000;

export type ParkingNotificationPlan = {
  warningRequired: boolean;
  expiryRequired: boolean;
};

export function isParkingSessionActive(
  session: ParkingSession,
  now = Date.now(),
): boolean {
  return session.status === "active" && session.expiryTimestamp > now;
}

export function getActiveParkingSessions(
  sessions: ParkingSession[],
  now = Date.now(),
): ParkingSession[] {
  return sessions.filter((session) => isParkingSessionActive(session, now));
}

export function getActiveParkingSessionsForVehicle(
  sessions: ParkingSession[],
  vehicleId: string,
  now = Date.now(),
): ParkingSession[] {
  return sessions.filter(
    (session) =>
      session.vehicleId === vehicleId && isParkingSessionActive(session, now),
  );
}

export function reconcileParkingSessions(
  sessions: ParkingSession[],
  now = Date.now(),
): ParkingSession[] {
  let changed = false;
  const reconciled = sessions.map((session) => {
    if (session.status !== "active" || session.expiryTimestamp > now) {
      return session;
    }

    changed = true;
    return {
      ...session,
      status: "expired" as const,
      endedAt: session.endedAt ?? session.expiryTimestamp,
      expiryReminderNotificationId: null,
      expiredNotificationId: null,
    };
  });

  return changed ? reconciled : sessions;
}

export function retainActiveParkingSessions(
  sessions: ParkingSession[],
  now = Date.now(),
): ParkingSession[] {
  return reconcileParkingSessions(sessions, now).filter((session) =>
    isParkingSessionActive(session, now),
  );
}

export function stripParkingNotificationIds(
  sessions: ParkingSession[],
): ParkingSession[] {
  return sessions.map((session) => ({
    ...session,
    expiryReminderNotificationId: null,
    expiredNotificationId: null,
  }));
}

export function getParkingNotificationPlan(
  expiryTimestamp: number,
  now = Date.now(),
): ParkingNotificationPlan {
  const timeRemaining = expiryTimestamp - now;

  return {
    warningRequired: timeRemaining > PARKING_WARNING_LEAD_MS,
    expiryRequired: timeRemaining > 0,
  };
}
