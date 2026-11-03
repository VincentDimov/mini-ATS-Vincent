import { createHash } from "node:crypto";

export const MAX_CV_BYTES = 5 * 1024 * 1024;

// Conservative structural screening, not an antivirus or a full PDF parser.
// Reject active/encrypted documents; serve accepted files as attachments only.
export function validatePdf(bytes: Uint8Array, name: string, mime: string) {
  if (!bytes.length || bytes.length > MAX_CV_BYTES || mime !== "application/pdf" || !name.toLowerCase().endsWith(".pdf"))
    throw new Error("Choose a PDF file between 1 byte and 5 MB.");
  const source = Buffer.from(bytes).toString("latin1");
  if (!/^%PDF-1\.[0-7](?:\r|\n)/.test(source) && !/^%PDF-2\.0(?:\r|\n)/.test(source))
    throw new Error("The file does not contain a supported PDF header.");
  if (!/%%EOF\s*$/.test(source) || !/\d+\s+\d+\s+obj\b/.test(source) || !/\/Type\s*\/Catalog\b/.test(source))
    throw new Error("This PDF is incomplete or unsupported. Export a new PDF and retry.");
  // Decode PDF name escapes before screening, to avoid simple /Java#53cript bypasses.
  const names = source.replace(/#([a-f0-9]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  if (/\/(?:JavaScript|JS|Launch|EmbeddedFile|RichMedia|OpenAction|AA|Encrypt)\b/.test(names))
    throw new Error("Active, embedded or encrypted PDF content is not supported. Export a plain PDF.");
  return { sha256: createHash("sha256").update(bytes).digest("hex"), filename: name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120) || "candidate-cv.pdf" };
}
