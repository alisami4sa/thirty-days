import type { Challenge, CheckinStatus, DailyCheckin, DisplayName } from "./types";
import { challengeAppliesTo, USER_IDS } from "./types";

export function getCheckin(
  checkins: DailyCheckin[],
  challengeId: string,
  userId: string,
  date: string
): DailyCheckin | undefined {
  return checkins.find(
    (c) => c.challenge_id === challengeId && c.user_id === userId && c.date === date
  );
}

export function statusOf(
  checkins: DailyCheckin[],
  challengeId: string,
  userId: string,
  date: string
): CheckinStatus {
  return getCheckin(checkins, challengeId, userId, date)?.status ?? "pending";
}

export function completionRate(
  checkins: DailyCheckin[],
  challenges: Challenge[],
  userName: DisplayName,
  dates: string[],
  upToDate?: string
): number {
  const userId = USER_IDS[userName];
  const relevant = challenges.filter((c) => challengeAppliesTo(c, userName));
  const scopedDates = upToDate ? dates.filter((d) => d <= upToDate) : dates;
  let total = 0;
  let completed = 0;

  for (const challenge of relevant) {
    for (const date of scopedDates) {
      total += 1;
      if (statusOf(checkins, challenge.id, userId, date) === "completed") {
        completed += 1;
      }
    }
  }

  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

export function currentStreak(
  checkins: DailyCheckin[],
  challenges: Challenge[],
  userName: DisplayName,
  dates: string[],
  asOf: string
): number {
  const userId = USER_IDS[userName];
  const relevant = challenges.filter((c) => challengeAppliesTo(c, userName));
  if (relevant.length === 0) return 0;

  const pastOrToday = dates.filter((d) => d <= asOf).reverse();
  let streak = 0;

  for (const date of pastOrToday) {
    const allDone = relevant.every(
      (ch) => statusOf(checkins, ch.id, userId, date) === "completed"
    );
    if (!allDone) break;
    streak += 1;
  }

  return streak;
}

export function dayProgress(
  checkins: DailyCheckin[],
  challenges: Challenge[],
  userName: DisplayName,
  date: string
): { done: number; total: number } {
  const userId = USER_IDS[userName];
  const relevant = challenges.filter((c) => challengeAppliesTo(c, userName));
  const done = relevant.filter(
    (ch) => statusOf(checkins, ch.id, userId, date) === "completed"
  ).length;
  return { done, total: relevant.length };
}
