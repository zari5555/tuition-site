/**
 * Timezone utilities for Tuitionss.com
 * Fixed to Asia/Karachi (PKT - Pakistan Standard Time, UTC+05:00)
 */

if (typeof process !== "undefined" && process.env) {
  process.env.TZ = "Asia/Karachi";
}

export const KARACHI_TIMEZONE = "Asia/Karachi";
export const KARACHI_OFFSET = "+05:00";
export const KARACHI_OFFSET_HOURS = 5;

/**
 * Format a Date, string, or number into a Karachi time string (e.g. "04:00 PM").
 */
export function formatKarachiTime(
  date: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" }
): string {
  if (!date) return "";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: KARACHI_TIMEZONE,
    ...options,
  }).format(d);
}

/**
 * Format a Date, string, or number into a Karachi date string (e.g. "Oct 7, 2026").
 */
export function formatKarachiDate(
  date: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }
): string {
  if (!date) return "";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: KARACHI_TIMEZONE,
    ...options,
  }).format(d);
}

/**
 * Format a Date, string, or number into a full Karachi date and time string (e.g. "Oct 7, 2026, 04:00 PM").
 */
export function formatKarachiDateTime(
  date: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
): string {
  if (!date) return "";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: KARACHI_TIMEZONE,
    ...options,
  }).format(d);
}

/**
 * Format the weekday in Karachi timezone (e.g. "Mon" or "Monday").
 */
export function formatKarachiWeekday(
  date: Date | string | number | null | undefined,
  format: "short" | "long" = "short"
): string {
  if (!date) return "";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: KARACHI_TIMEZONE,
    weekday: format,
  }).format(d);
}

/**
 * Get the 0-6 day of the week index (0=Sun, 1=Mon, ..., 6=Sat) in Karachi timezone.
 */
export function getKarachiDayIndex(date: Date | string | number): number {
  const weekdayShort = formatKarachiWeekday(date, "short");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const idx = days.indexOf(weekdayShort);
  return idx >= 0 ? idx : 0;
}

/**
 * Get the date string in Karachi timezone as "YYYY-MM-DD".
 */
export function getKarachiDateString(date: Date | string | number = new Date()): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: KARACHI_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(d);
  const year = parts.find((p) => p.type === "year")?.value || "";
  const month = parts.find((p) => p.type === "month")?.value || "";
  const day = parts.find((p) => p.type === "day")?.value || "";
  return `${year}-${month}-${day}`;
}

/**
 * Get the month string in Karachi timezone as "YYYY-MM".
 */
export function getKarachiMonthString(date: Date | string | number = new Date()): string {
  return getKarachiDateString(date).slice(0, 7);
}

/**
 * Parse a Karachi date string ("YYYY-MM-DD") and time string ("HH:MM" or "HH:MM:SS")
 * into a UTC Date object that represents that exact Karachi wall-clock time.
 */
export function parseKarachiDateTime(dateStr: string, timeStr: string): Date {
  const cleanDate = dateStr.trim();
  const cleanTime = timeStr.trim().length === 5 ? `${timeStr.trim()}:00` : timeStr.trim();
  return new Date(`${cleanDate}T${cleanTime}+05:00`);
}

/**
 * Given a Date or ISO string, get the start of the day (00:00:00) in Karachi timezone as a Date.
 */
export function getKarachiStartOfDay(date: Date | string | number = new Date()): Date {
  const dateStr = getKarachiDateString(date);
  return new Date(`${dateStr}T00:00:00+05:00`);
}

/**
 * Given a Date or ISO string, get the end of the day (23:59:59.999) in Karachi timezone as a Date.
 */
export function getKarachiEndOfDay(date: Date | string | number = new Date()): Date {
  const dateStr = getKarachiDateString(date);
  return new Date(`${dateStr}T23:59:59.999+05:00`);
}

/**
 * Given a Date or ISO string, get the min and max date strings ("YYYY-MM-01" and "YYYY-MM-LastDay")
 * for the calendar month in Karachi timezone.
 */
export function getKarachiMonthRange(date: Date | string | number = new Date()): { minDate: string; maxDate: string } {
  const yyyyMm = getKarachiMonthString(date);
  const [yearStr, monthStr] = yyyyMm.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const lastDay = new Date(year, month, 0).getDate();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return {
    minDate: `${yyyyMm}-01`,
    maxDate: `${yyyyMm}-${pad(lastDay)}`,
  };
}
