export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  // Spreadsheet formulas must remain plain text in exported, user-supplied fields.
  if (/^[\s]*[=+@\-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function toCsv(rows: unknown[][]): string {
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
function icsText(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\r", "");
}
function icsDate(value: string) {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}
export function interviewCalendar(event: {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location: string;
  notes: string;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mini ATS Vincent//Interview//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "UID:" + event.id + "@mini-ats-vincent",
    "DTSTAMP:" + icsDate(new Date().toISOString()),
    "DTSTART:" + icsDate(event.starts_at),
    "DTEND:" + icsDate(event.ends_at),
    "SUMMARY:" + icsText(event.title),
    "LOCATION:" + icsText(event.location),
    "DESCRIPTION:" + icsText(event.notes),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}
export function downloadText(name: string, value: string, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
