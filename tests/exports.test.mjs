import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(
  new URL("../src/lib/exports.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const { csvCell, toCsv, interviewCalendar } = await import(
  "data:text/javascript;base64," + Buffer.from(compiled).toString("base64")
);

test("CSV quotes fields and neutralizes spreadsheet formulas", () => {
  assert.equal(csvCell('Alice, "A"'), '"Alice, ""A"""');
  for (const value of [
    "=1+1",
    "+cmd",
    "@SUM(A1)",
    "-1",
    ' \t=HYPERLINK("x")',
  ]) {
    assert.ok(csvCell(value).startsWith("\"'"));
  }
  assert.equal(
    toCsv([
      ["Name", "Email"],
      ["Alice", null],
    ]),
    '\uFEFF"Name","Email"\r\n"Alice",""',
  );
});

test("calendar exports UTC times and escapes untrusted event text", () => {
  const result = interviewCalendar({
    id: "test",
    title: "Intro, team; call",
    starts_at: "2026-10-12T10:00:00+02:00",
    ends_at: "2026-10-12T11:00:00+02:00",
    location: "Online",
    notes: "Line one\r\nBEGIN:VEVENT",
  });
  assert.match(result, /DTSTART:20261012T080000Z/);
  assert.match(result, /DTEND:20261012T090000Z/);
  assert.match(result, /SUMMARY:Intro\\, team\\; call/);
  assert.equal(result.match(/^BEGIN:VEVENT$/gm).length, 1);
  assert.match(result, /DESCRIPTION:Line one\\nBEGIN:VEVENT/);
});
