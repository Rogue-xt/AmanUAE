import assert from "node:assert/strict";
import test from "node:test";

import type { ParkingSession } from "@/src/context/AppContext";
import {
  getActiveParkingSessions,
  getActiveParkingSessionsForVehicle,
  getParkingNotificationPlan,
  reconcileParkingSessions,
  retainActiveParkingSessions,
  stripParkingNotificationIds,
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

test("reconciliation keeps future active sessions active", () => {
  const source = [sessions[0]];
  const reconciled = reconcileParkingSessions(source, now);
  assert.equal(reconciled[0].status, "active");
  assert.equal(reconciled, source);
});

test("reconciliation expires past active sessions at their expiry time", () => {
  const reconciled = reconcileParkingSessions([sessions[1]], now);
  assert.equal(reconciled[0].status, "expired");
  assert.equal(reconciled[0].endedAt, sessions[1].expiryTimestamp);
  assert.equal(reconciled[0].expiryReminderNotificationId, null);
  assert.equal(reconciled[0].expiredNotificationId, null);
});

test("reconciliation leaves completed sessions untouched", () => {
  const completed: ParkingSession = {
    ...sessions[1],
    status: "completed",
    endedAt: now - 90_000,
  };
  const reconciled = reconcileParkingSessions([completed], now);
  assert.equal(reconciled[0], completed);
});

test("reconciliation is idempotent and handles sessions independently", () => {
  const once = reconcileParkingSessions(sessions, now);
  const twice = reconcileParkingSessions(once, now);
  assert.equal(twice, once);
  assert.deepEqual(
    twice.map((session) => session.status),
    ["active", "expired", "active"],
  );
});

test("retaining active sessions removes completed and expired history", () => {
  const completed: ParkingSession = {
    ...sessions[0],
    id: "done",
    status: "completed",
  };
  assert.deepEqual(
    retainActiveParkingSessions([...sessions, completed], now).map(
      (session) => session.id,
    ),
    ["active-a", "active-b"],
  );
});

test("notification planning schedules warning and expiry with over ten minutes left", () => {
  assert.deepEqual(getParkingNotificationPlan(now + 11 * 60_000, now), {
    warningRequired: true,
    expiryRequired: true,
  });
});

test("notification planning never schedules a past warning", () => {
  assert.deepEqual(getParkingNotificationPlan(now + 10 * 60_000, now), {
    warningRequired: false,
    expiryRequired: true,
  });
  assert.deepEqual(getParkingNotificationPlan(now + 60_000, now), {
    warningRequired: false,
    expiryRequired: true,
  });
});

test("notification planning schedules nothing for expired sessions", () => {
  assert.deepEqual(getParkingNotificationPlan(now, now), {
    warningRequired: false,
    expiryRequired: false,
  });
});

test("cloud notification IDs are stripped without changing parking metadata", () => {
  const restored: ParkingSession = {
    ...sessions[0],
    parkingType: "standard",
    expiryReminderNotificationId: "phone-a-warning",
    expiredNotificationId: "phone-a-expiry",
  };
  const [stripped] = stripParkingNotificationIds([restored]);
  assert.equal(stripped.expiryReminderNotificationId, null);
  assert.equal(stripped.expiredNotificationId, null);
  assert.equal(stripped.parkingType, "standard");
  assert.equal(stripped.expiryTimestamp, restored.expiryTimestamp);
});
