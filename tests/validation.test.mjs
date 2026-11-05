import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const compile = (source) =>
  "data:text/javascript;base64," +
  Buffer.from(
    ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
      },
    }).outputText,
  ).toString("base64");
const pipeline = compile(
  readFileSync(new URL("../src/lib/pipeline.ts", import.meta.url), "utf8"),
);
const source = readFileSync(
  new URL("../src/lib/validation.ts", import.meta.url),
  "utf8",
).replace('"@/lib/pipeline"', JSON.stringify(pipeline));
const {
  validateJobInput,
  validateCandidateInput,
  validateAdminUserInput,
  validateLinkedInUrl,
} = await import(compile(source));
test("runtime validation rejects malformed actions and oversized optional fields", () => {
  assert.throws(() => validateJobInput({ title: 42, description: "Test" }));
  assert.throws(() =>
    validateJobInput({
      title: "Test",
      description: "Test",
      notes: "x".repeat(6001),
    }),
  );
  assert.throws(() =>
    validateCandidateInput({
      jobId: "forged",
      fullName: "Test",
      email: "test@example.test",
      pipelineStage: "new",
    }),
  );
  assert.throws(() =>
    validateAdminUserInput({
      email: "test@example.test",
      fullName: "Test",
      role: "admin",
      password: undefined,
    }),
  );
  assert.throws(() =>
    validateAdminUserInput({
      email: "test@example.test",
      fullName: "Test",
      role: "admin",
      password: "x".repeat(129),
    }),
  );
});
test("LinkedIn validation denies executable and deceptive origins", () => {
  for (const value of [
    "javascript:alert(1)",
    "https://linkedin.com.evil.test/in/test",
    "http://linkedin.com/in/test",
  ])
    assert.throws(() => validateLinkedInUrl(value));
  assert.equal(
    validateLinkedInUrl("https://www.linkedin.com/in/synthetic-test"),
    "https://www.linkedin.com/in/synthetic-test",
  );
});
