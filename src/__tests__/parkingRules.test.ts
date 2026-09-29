import assert from "node:assert/strict";
import test from "node:test";

import {
  clampParkingUiDuration,
  getParkingRule,
  getParkingSessionDurationHours,
  getParkingUiDurations,
  SPECIAL_PARKING_AREA_RULES,
} from "@/src/config/parkingRules";

test("Dubai rules expose the current supported UI behavior", () => {
  const rule = getParkingRule("Dubai");

  assert.equal(rule.smsSupported, true);
  assert.equal(rule.recipient, "7275");
  assert.deepEqual(rule.uiDurations, [1, 2, 3, 4]);
  assert.equal(rule.requiresZone, true);
  assert.equal(rule.requiresParkingType, false);
});

test("Abu Dhabi rules expose Standard and Premium duration limits", () => {
  const rule = getParkingRule("AbuDhabi");

  assert.equal(rule.smsSupported, true);
  assert.equal(rule.recipient, "3009");
  assert.equal(rule.uiDurations[0], 1);
  assert.equal(rule.uiDurations[rule.uiDurations.length - 1], 24);
  assert.equal(rule.uiDurations.length, 24);
  assert.deepEqual(getParkingUiDurations("AbuDhabi", true), [1, 2, 3, 4]);
  assert.equal(rule.requiresParkingType, true);
  assert.equal(rule.formatterMaxDurationHours, 24);
  assert.equal(rule.premiumFormatterMaxDurationHours, 4);
});

test("Abu Dhabi parking type changes clamp only invalid durations", () => {
  assert.equal(clampParkingUiDuration("AbuDhabi", 20, true), 4);
  assert.equal(clampParkingUiDuration("AbuDhabi", 4, false), 4);
  assert.equal(getParkingSessionDurationHours("AbuDhabi", 12), 12);
});

test("Sharjah rules protect the 1, 2, 3, 5 hour duration set", () => {
  const rule = getParkingRule("Sharjah");

  assert.equal(rule.smsSupported, true);
  assert.equal(rule.recipient, "5566");
  assert.deepEqual(rule.uiDurations, [1, 2, 3, 5]);
  assert.equal(rule.requiresZone, false);
});

test("Ajman rules preserve the fixed one-hour session", () => {
  const rule = getParkingRule("Ajman");

  assert.equal(rule.smsSupported, true);
  assert.equal(rule.recipient, "5155");
  assert.deepEqual(rule.uiDurations, [1]);
  assert.equal(rule.durationMode, "fixed");
  assert.equal(getParkingSessionDurationHours("Ajman", 5), 1);
});

test("RAK, UAQ, and Fujairah remain unsupported", () => {
  for (const emirate of [
    "RasAlKhaimah",
    "UmmAlQuwain",
    "Fujairah",
  ] as const) {
    const rule = getParkingRule(emirate);

    assert.equal(rule.smsSupported, false);
    assert.equal(rule.recipient, null);
    assert.deepEqual(rule.uiDurations, []);
  }
});

test("Khorfakkan remains a blocked special parking area", () => {
  assert.equal(SPECIAL_PARKING_AREA_RULES.Khorfakkan.smsSupported, false);
  assert.equal(
    SPECIAL_PARKING_AREA_RULES.Khorfakkan.ordinarySharjahSmsBlocked,
    true,
  );
});
