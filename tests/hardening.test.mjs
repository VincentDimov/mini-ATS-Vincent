import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
async function load(path) {
  const compiled = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
      },
    },
  ).outputText;
  return import(
    "data:text/javascript;base64," + Buffer.from(compiled).toString("base64")
  );
}
const { validatePdf } = await load("../src/lib/pdf-validation.ts");
const { requestOpenAiAnalysis, parseAnalysis } = await load(
  "../src/lib/ai-analysis.ts",
);
const pdf = Buffer.from(
  "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n",
);
const analysis = {
  summary: "Synthetic evidence only",
  strengths: ["Testing"],
  potential_gaps: [],
  matching_skills: [],
  interview_questions: ["Explain your tests?"],
};
test("PDF content screening rejects spoofed, oversized, truncated and active files", () => {
  assert.match(
    validatePdf(pdf, "synthetic.pdf", "application/pdf").sha256,
    /^[a-f0-9]{64}$/,
  );
  for (const [bytes, name, mime] of [
    [Buffer.from("not a PDF"), "x.pdf", "application/pdf"],
    [pdf, "x.exe", "application/pdf"],
    [pdf, "x.pdf", "text/plain"],
    [Buffer.alloc(5 * 1024 * 1024 + 1), "x.pdf", "application/pdf"],
    [pdf.subarray(0, pdf.length - 8), "x.pdf", "application/pdf"],
    [
      Buffer.from(pdf.toString().replace("/Catalog", "/Catalog /Java#53cript")),
      "x.pdf",
      "application/pdf",
    ],
    [
      Buffer.from(pdf.toString().replace("/Catalog", "/Catalog /Encrypt")),
      "x.pdf",
      "application/pdf",
    ],
  ])
    assert.throws(() => validatePdf(bytes, name, mime));
});
test("AI payload validation bounds and rejects malformed data", () => {
  assert.deepEqual(parseAnalysis(analysis), analysis);
  for (const value of [
    null,
    [],
    {},
    { ...analysis, summary: "" },
    { ...analysis, strengths: [1] },
    { ...analysis, matching_skills: Array(9).fill("x") },
  ])
    assert.throws(() => parseAnalysis(value));
});
test("AI is optional and never calls the provider without configuration", async () => {
  const saved = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    assert.equal(
      (
        await requestOpenAiAnalysis(
          pdf,
          { title: "Test", description: "Test" },
          () => {
            throw Error("must not call");
          },
        )
      ).configured,
      false,
    );
  } finally {
    if (saved === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = saved;
  }
});
test("AI HTTP failure and malformed results can be retried without creating provider files", async () => {
  const saved = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "synthetic-unit-test-not-a-key";
  try {
    await assert.rejects(
      requestOpenAiAnalysis(
        pdf,
        { title: "Test", description: "Test" },
        async () => new Response("", { status: 429 }),
      ),
    );
    await assert.rejects(
      requestOpenAiAnalysis(
        pdf,
        { title: "Test", description: "Test" },
        async () => Response.json({ output_text: "invalid" }),
      ),
    );
    let calls = 0;
    const result = await requestOpenAiAnalysis(
      pdf,
      { title: "Test", description: "Test" },
      async (url, options) => {
        calls++;
        assert.equal(url, "https://api.openai.com/v1/responses");
        const body = JSON.parse(options.body);
        assert.equal(body.store, false);
        assert.ok(options.signal);
        assert.match(
          body.input[0].content[0].file_data,
          /^data:application\/pdf;base64,/,
        );
        return Response.json({
          output: [{ content: [{ text: JSON.stringify(analysis) }] }],
        });
      },
    );
    assert.equal(calls, 1);
    assert.deepEqual(result.analysis, analysis);
  } finally {
    if (saved === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = saved;
  }
});
test("service role and CV lifecycle helpers stay server-only", () => {
  for (const name of ["admin.ts", "../cv-maintenance.ts"]) {
    const path =
      name === "admin.ts"
        ? "../src/lib/supabase/admin.ts"
        : "../src/lib/cv-maintenance.ts";
    assert.match(
      readFileSync(new URL(path, import.meta.url), "utf8"),
      /import "server-only"/,
    );
  }
});
