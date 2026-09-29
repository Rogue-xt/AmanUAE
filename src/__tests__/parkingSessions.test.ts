import assert from "node:assert/strict";
import test from "node:test";

import type { ParkingSession } from "@/src/context/AppContext";
import {
  getActiveParkingSessions,
  getActiveParkingSessionsForVehicle,
} from "@/src/utils/parkingSessions";

const now = Date.UTC(2026, 0, 1, 12);
const sessions: ParkingSession[] = [
  {
    id: "active-a",
    vehicleId: "vehicle-a",
    vehicleLabel: "Car A",
    plateDetails: "A 1",
    parkingEmirate: "Dubai",
    startedAt: now - 1_000,
    expiryTimestamp: now + 60_000,
    status: "active",
  },
  {
    id: "expired-a",
    vehicleId: "vehicle-a",
    vehicleLabel: "Car A",
    plateDetails: "A 1",
    parkingEmirate: "Dubai",
    startedAt: now - 120_000,
    expiryTimestamp: now - 60_000,
    status: "active",
  },
  {
    id: "active-b",
    vehicleId: "vehicle-b",
    vehicleLabel: "Car B",
    plateDetails: "B 2",
    parkingEmirate: "Sharjah",
    startedAt: now - 1_000,
    expiryTimestamp: now + 60_000,
    status: "active",
  },
];

test("active parking helpers exclude expired sessions", () => {
  assert.deepEqual(
    getActiveParkingSessions(sessions, now).map((session) => session.id),
    ["active-a", "active-b"],
  );
});

test("vehicle parking helper uses vehicle ID without a single-ticket fallback", () => {
  assert.deepEqual(
    getActiveParkingSessionsForVehicle(sessions, "vehicle-a", now).map(
      (session) => session.id,
    ),
    ["active-a"],
  );
});
