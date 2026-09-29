import type { ParkingSession } from "@/src/context/AppContext";

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
