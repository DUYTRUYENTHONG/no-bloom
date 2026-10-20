import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../lib/name.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source.replaceAll("export function", "function"), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const { normalizeName, validateName, countGraphemes } = new Function(`${js}; return { normalizeName, validateName, countGraphemes };`)();

test("normalizes Vietnamese names without removing accents", () => {
  assert.equal(normalizeName("  Lê   Thị   Mai  "), "Lê Thị Mai");
});

test("allows nicknames, punctuation, and exactly 60 graphemes", () => {
  assert.equal(validateName("O'Lan-Anh").valid, true);
  assert.equal(validateName("a".repeat(60)).valid, true);
  assert.equal(validateName("a".repeat(61)).tooLong, true);
  assert.equal(countGraphemes("👩🏽‍🌾"), 1);
});

test("rejects a whitespace-only named entry", () => {
  assert.equal(validateName("  ").valid, false);
});
