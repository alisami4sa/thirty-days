import { format, parseISO, subDays } from "date-fns";
import type { Challenge, ChallengeCycle, DailyCheckin, DisplayName } from "./types";
import { challengeAppliesTo, USER_IDS } from "./types";
import { cycleDates, todayISO } from "./dates";
import { dayProgress, statusOf } from "./stats";

export function isPastDay(dateISO: string, today = todayISO()): boolean {
  return dateISO < today;
}

/** Past days lock at midnight; only today (and in-cycle) stays editable. */
export function isDayEditable(
  cycle: ChallengeCycle,
  dateISO: string,
  today = todayISO()
): boolean {
  if (cycle.status !== "active") return false;
  if (dateISO < cycle.start_date || dateISO > cycle.end_date) return false;
  return dateISO === today;
}

export function aheadLine(
  checkins: DailyCheckin[],
  challenges: Challenge[],
  dateISO: string
): string {
  const ali = dayProgress(checkins, challenges, "Ali", dateISO);
  const hajar = dayProgress(checkins, challenges, "Hajar", dateISO);
  const aliPct = ali.total ? ali.done / ali.total : 0;
  const hajarPct = hajar.total ? hajar.done / hajar.total : 0;

  if (ali.total === 0 && hajar.total === 0) return "No challenges today";
  if (aliPct === hajarPct) {
    return `Tied today · Ali ${ali.done}/${ali.total} · Hajar ${hajar.done}/${hajar.total}`;
  }
  if (aliPct > hajarPct) {
    return `Ali ahead today · ${ali.done}/${ali.total} vs ${hajar.done}/${hajar.total}`;
  }
  return `Hajar ahead today · ${hajar.done}/${hajar.total} vs ${ali.done}/${ali.total}`;
}

export function challengeNeedsProof(challenge: Challenge): boolean {
  if (challenge.metadata?.require_proof != null) {
    return Boolean(challenge.metadata.require_proof);
  }
  return challenge.title.trim().toLowerCase() === "gym";
}

export function buildWeeklySummary(
  cycle: ChallengeCycle,
  challenges: Challenge[],
  checkins: DailyCheckin[],
  asOf = todayISO()
): string {
  const dates = cycleDates(cycle).filter((d) => d <= asOf && d >= format(subDays(parseISO(asOf), 6), "yyyy-MM-dd"));
  const lines: string[] = [`Week summary (${dates[0] ?? asOf} → ${asOf})`];

  for (const name of ["Ali", "Hajar"] as DisplayName[]) {
    let completed = 0;
    let total = 0;
    let perfectDays = 0;
    const relevant = challenges.filter((c) => challengeAppliesTo(c, name));
    for (const date of dates) {
      const p = dayProgress(checkins, challenges, name, date);
      completed += p.done;
      total += p.total;
      if (p.total > 0 && p.done === p.total) perfectDays += 1;
    }
    const pct = total ? Math.round((completed / total) * 100) : 0;
    lines.push(`${name}: ${pct}% · ${perfectDays} perfect day${perfectDays === 1 ? "" : "s"} · ${completed}/${total}`);
  }

  const aliPct = (() => {
    let c = 0;
    let t = 0;
    for (const d of dates) {
      const p = dayProgress(checkins, challenges, "Ali", d);
      c += p.done;
      t += p.total;
    }
    return t ? c / t : 0;
  })();
  const hajarPct = (() => {
    let c = 0;
    let t = 0;
    for (const d of dates) {
      const p = dayProgress(checkins, challenges, "Hajar", d);
      c += p.done;
      t += p.total;
    }
    return t ? c / t : 0;
  })();

  if (aliPct === hajarPct) lines.push("Week standings: tied");
  else if (aliPct > hajarPct) lines.push("Week standings: Ali leads");
  else lines.push("Week standings: Hajar leads");

  return lines.join("\n");
}

export function checkinsToCsv(
  cycle: ChallengeCycle,
  challenges: Challenge[],
  checkins: DailyCheckin[]
): string {
  const dates = cycleDates(cycle);
  const header = ["date", "challenge", "user", "status", "proof_url"];
  const rows: string[][] = [header];

  for (const date of dates) {
    for (const challenge of challenges) {
      for (const name of ["Ali", "Hajar"] as DisplayName[]) {
        if (!challengeAppliesTo(challenge, name)) continue;
        const status = statusOf(checkins, challenge.id, USER_IDS[name], date);
        const row = checkins.find(
          (c) =>
            c.challenge_id === challenge.id &&
            c.user_id === USER_IDS[name] &&
            c.date === date
        );
        rows.push([
          date,
          challenge.title,
          name,
          status,
          row?.proof_url ?? "",
        ]);
      }
    }
  }

  return rows
    .map((r) =>
      r
        .map((cell) => {
          const v = String(cell);
          if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
          return v;
        })
        .join(",")
    )
    .join("\n");
}

export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
