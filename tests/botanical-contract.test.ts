import test from "node:test";
import assert from "node:assert/strict";
import { botanicalStates, createBotanicalResponse } from "../lib/botanical-ui";
import { generativeUiResponseSchema } from "../lib/botanical-schema";
import { flowerKinds } from "../lib/flower-catalog";

test("every internal botanical payload conforms to the external A2UI contract", () => {
  for (const state of botanicalStates) for (const flower of flowerKinds) for (const locale of ["vi", "en"] as const) {
    const payload = createBotanicalResponse(state, locale, "An", flower);
    assert.deepEqual(generativeUiResponseSchema.parse(payload), payload);
  }
});
