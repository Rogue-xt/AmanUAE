import assert from "node:assert/strict";
import test from "node:test";

import { omitUndefinedDeep } from "@/src/utils/firestoreSerialization";

test("Firestore serialization omits undefined parking fields recursively", () => {
  assert.deepEqual(
    omitUndefinedDeep({
      value: {
        parkingEmirate: "Dubai",
        parkingType: undefined,
        nested: { missing: undefined, retained: "value" },
      },
    }),
    {
      value: {
        parkingEmirate: "Dubai",
        nested: { retained: "value" },
      },
    },
  );
});

test("Firestore serialization preserves valid falsy and null values", () => {
  assert.deepEqual(
    omitUndefinedDeep({
      parkingType: "standard",
      enabled: false,
      count: 0,
      label: "",
      notificationId: null,
      values: [0, undefined, false, null, ""],
    }),
    {
      parkingType: "standard",
      enabled: false,
      count: 0,
      label: "",
      notificationId: null,
      values: [0, false, null, ""],
    },
  );
});

test("Firestore serialization preserves Abu Dhabi parking type", () => {
  assert.deepEqual(
    omitUndefinedDeep({ parkingType: "premium" }),
    { parkingType: "premium" },
  );
});
