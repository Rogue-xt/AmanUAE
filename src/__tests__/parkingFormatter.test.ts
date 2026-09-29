import assert from "node:assert/strict";
import test from "node:test";

import {
  generateParkingSMS,
  isKhorfakkanRegion,
} from "@/src/utils/parkingFormatter";

test("Dubai vehicle parking in Dubai preserves the current payload", () => {
  assert.deepEqual(
    generateParkingSMS({
      plateEmirate: "Dubai",
      parkingEmirate: "Dubai",
      plateCode: "A",
      plateNumber: "12345",
      zoneCode: "332C",
      durationInHours: 2,
    }),
    { recipient: "7275", body: "A12345 332C 2" },
  );
});

test("non-Dubai vehicle parking in Dubai preserves current syntax", () => {
  assert.deepEqual(
    generateParkingSMS({
      plateEmirate: "AbuDhabi",
      parkingEmirate: "Dubai",
      plateCode: "A",
      plateNumber: "12345",
      zoneCode: "332C",
      durationInHours: 2,
    }),
    { recipient: "7275", body: "AUHA 12345 332C 2" },
  );
});

test("Abu Dhabi Standard and Premium preserve current payloads", () => {
  const base = {
    plateEmirate: "Dubai" as const,
    parkingEmirate: "AbuDhabi" as const,
    plateCode: "A",
    plateNumber: "12345",
    durationInHours: 2,
  };

  assert.deepEqual(generateParkingSMS(base), {
    recipient: "3009",
    body: "DXBA 12345 S 2",
  });
  assert.deepEqual(
    generateParkingSMS({ ...base, isPremiumAbuDhabi: true }),
    { recipient: "3009", body: "DXBA 12345 P 2" },
  );
});

test("Sharjah omits plate code and supports the five-hour UI payload", () => {
  const twoHours = generateParkingSMS({
    plateEmirate: "Dubai",
    parkingEmirate: "Sharjah",
    plateCode: "A",
    plateNumber: "12345",
    durationInHours: 2,
  });
  const fiveHours = generateParkingSMS({
    plateEmirate: "Dubai",
    parkingEmirate: "Sharjah",
    plateCode: "A",
    plateNumber: "12345",
    durationInHours: 5,
  });

  assert.deepEqual(twoHours, {
    recipient: "5566",
    body: "DXB 12345 2",
  });
  assert.equal(twoHours.body.includes("A"), false);
  assert.equal(fiveHours.body, "DXB 12345 5");
});

test("Ajman preserves leading zeroes and has no trailing whitespace", () => {
  const result = generateParkingSMS({
    plateEmirate: "Ajman",
    parkingEmirate: "Ajman",
    plateCode: "B",
    plateNumber: "0123",
    durationInHours: 1,
  });

  assert.deepEqual(result, { recipient: "5155", body: "AJM B 0123" });
  assert.equal(result.body.endsWith(" "), false);
});

test("formatter normalizes code, zone, and surrounding whitespace", () => {
  assert.deepEqual(
    generateParkingSMS({
      plateEmirate: "Dubai",
      parkingEmirate: "Dubai",
      plateCode: " a ",
      plateNumber: " 0123 ",
      zoneCode: " 332c ",
      durationInHours: 2,
    }),
    { recipient: "7275", body: "A0123 332C 2" },
  );
});

test("Dubai requires a non-empty zone", () => {
  assert.throws(
    () =>
      generateParkingSMS({
        plateEmirate: "Dubai",
        parkingEmirate: "Dubai",
        plateCode: "A",
        plateNumber: "12345",
        zoneCode: "   ",
        durationInHours: 2,
      }),
    /Dubai parking requires a zone code/,
  );
});

test("formatter preserves current duration boundaries", () => {
  const dubaiMinimum = generateParkingSMS({
    plateEmirate: "Dubai",
    parkingEmirate: "Dubai",
    plateCode: "A",
    plateNumber: "12345",
    zoneCode: "332C",
    durationInHours: 0,
  });
  const dubaiMaximum = generateParkingSMS({
    plateEmirate: "Dubai",
    parkingEmirate: "Dubai",
    plateCode: "A",
    plateNumber: "12345",
    zoneCode: "332C",
    durationInHours: 99,
  });
  const premiumMaximum = generateParkingSMS({
    plateEmirate: "Dubai",
    parkingEmirate: "AbuDhabi",
    plateCode: "A",
    plateNumber: "12345",
    durationInHours: 99,
    isPremiumAbuDhabi: true,
  });
  const standardMaximum = generateParkingSMS({
    plateEmirate: "Dubai",
    parkingEmirate: "AbuDhabi",
    plateCode: "A",
    plateNumber: "12345",
    durationInHours: 99,
  });
  const sharjahMaximum = generateParkingSMS({
    plateEmirate: "Dubai",
    parkingEmirate: "Sharjah",
    plateCode: "A",
    plateNumber: "12345",
    durationInHours: 99,
  });
  const ajmanIgnoresDuration = generateParkingSMS({
    plateEmirate: "Ajman",
    parkingEmirate: "Ajman",
    plateCode: "B",
    plateNumber: "0123",
    durationInHours: 99,
  });

  assert.equal(dubaiMinimum.body, "A12345 332C 1");
  assert.equal(dubaiMaximum.body, "A12345 332C 24");
  assert.equal(premiumMaximum.body, "DXBA 12345 P 4");
  assert.equal(standardMaximum.body, "DXBA 12345 S 24");
  assert.equal(sharjahMaximum.body, "DXB 12345 24");
  assert.equal(ajmanIgnoresDuration.body, "AJM B 0123");
});

test("unsupported parking emirates are rejected", () => {
  for (const parkingEmirate of [
    "RasAlKhaimah",
    "UmmAlQuwain",
    "Fujairah",
  ] as const) {
    assert.throws(
      () =>
        generateParkingSMS({
          plateEmirate: "Dubai",
          parkingEmirate,
          plateCode: "A",
          plateNumber: "12345",
          durationInHours: 1,
        }),
      new RegExp(`${parkingEmirate} does not support SMS parking`),
    );
  }
});

test("RAK vehicle remains usable in a supported parking emirate", () => {
  assert.deepEqual(
    generateParkingSMS({
      plateEmirate: "RasAlKhaimah",
      parkingEmirate: "Sharjah",
      plateCode: "A",
      plateNumber: "0123",
      durationInHours: 2,
    }),
    { recipient: "5566", body: "RAK 0123 2" },
  );
});

test("Khorfakkan variants remain special while Sharjah does not", () => {
  for (const location of [
    "Khor Fakkan",
    "Khorfakkan",
    "Khorfakan",
    "Khawr Fakkān",
  ]) {
    assert.equal(isKhorfakkanRegion(location), true);
  }

  assert.equal(isKhorfakkanRegion("Sharjah"), false);
});
