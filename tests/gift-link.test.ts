import assert from "node:assert/strict";
import test from "node:test";
import { createGiftLink, readGiftLink } from "../lib/gift-link";

test("a named Pages link opens the intended recipient and flower without tracking parameters", () => {
  const link = createGiftLink(new URL("https://duytruyenthong.github.io/no-bloom/?utm_source=facebook&v=1"), " Lê Thị Mai ", "peony");
  assert.equal(link, "https://duytruyenthong.github.io/no-bloom/?for=L%C3%AA+Th%E1%BB%8B+Mai&flower=peony");
  assert.deepEqual(readGiftLink(new URL(link)), { name: "Lê Thị Mai", flower: "peony" });
});

test("invalid names and unknown flowers do not select arbitrary content", () => {
  assert.equal(readGiftLink(new URL(`https://example.com/no-bloom/?for=${"a".repeat(61)}`)), null);
  assert.deepEqual(readGiftLink(new URL("https://example.com/no-bloom/?for=Mai&flower=unknown")), { name: "Mai", flower: "rose" });
});
