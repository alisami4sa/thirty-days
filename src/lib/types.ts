export type DisplayName = "Ali" | "Hajar";
export type AppliesTo = "ali" | "hajar" | "both";
export type CheckinStatus = "completed" | "failed" | "pending";
export type CycleStatus = "active" | "archived";

export interface AppUser {
  id: string;
  display_name: DisplayName;
}

export interface ChallengeCycle {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: CycleStatus;
  created_at?: string;
}

export interface ChallengeMetadata {
  protein_grams?: {
    ali?: number;
    hajar?: number;
  };
}

export interface Challenge {
  id: string;
  cycle_id: string;
  title: string;
  description: string;
  applies_to: AppliesTo;
  metadata: ChallengeMetadata;
  sort_order: number;
  enabled: boolean;
}

export interface DailyCheckin {
  id: string;
  cycle_id: string;
  challenge_id: string;
  user_id: string;
  date: string;
  status: CheckinStatus;
  updated_at: string;
}

export const USER_IDS = {
  Ali: process.env.NEXT_PUBLIC_USER_ALI_ID ?? "a1111111-1111-1111-1111-111111111111",
  Hajar: process.env.NEXT_PUBLIC_USER_HAJAR_ID ?? "b2222222-2222-2222-2222-222222222222",
} as const;

export const USERS: AppUser[] = [
  { id: USER_IDS.Ali, display_name: "Ali" },
  { id: USER_IDS.Hajar, display_name: "Hajar" },
];

export function userKey(name: DisplayName): "ali" | "hajar" {
  return name === "Ali" ? "ali" : "hajar";
}

export function challengeAppliesTo(challenge: Challenge, name: DisplayName): boolean {
  if (!challenge.enabled) return false;
  if (challenge.applies_to === "both") return true;
  return challenge.applies_to === userKey(name);
}

export function proteinTarget(challenge: Challenge, name: DisplayName): number | null {
  const grams = challenge.metadata?.protein_grams;
  if (!grams) return null;
  return grams[userKey(name)] ?? null;
}
