import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import type { ChallengeCycle } from "./types";

export function todayISO(date = new Date()): string {
  return format(date, "yyyy-MM-dd");
}

export function formatDayLabel(iso: string): string {
  return format(parseISO(iso), "EEE d MMM");
}

export function cycleDayNumber(cycle: ChallengeCycle, dateISO: string): number {
  return differenceInCalendarDays(parseISO(dateISO), parseISO(cycle.start_date)) + 1;
}

export function cycleTotalDays(cycle: ChallengeCycle): number {
  return differenceInCalendarDays(parseISO(cycle.end_date), parseISO(cycle.start_date)) + 1;
}

export function cycleDates(cycle: ChallengeCycle): string[] {
  const total = cycleTotalDays(cycle);
  const start = parseISO(cycle.start_date);
  return Array.from({ length: total }, (_, i) => format(addDays(start, i), "yyyy-MM-dd"));
}

export function isDateInCycle(cycle: ChallengeCycle, dateISO: string): boolean {
  return dateISO >= cycle.start_date && dateISO <= cycle.end_date;
}

export function isCycleEditable(cycle: ChallengeCycle): boolean {
  return cycle.status === "active";
}
