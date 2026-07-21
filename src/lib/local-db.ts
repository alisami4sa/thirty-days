import { addDays, format } from "date-fns";
import type {
  Challenge,
  ChallengeCycle,
  CheckinStatus,
  DailyCheckin,
  DisplayName,
} from "./types";
import { USER_IDS } from "./types";

const STORAGE_KEY = "thirty-days-local-db-v1";

interface LocalDb {
  cycles: ChallengeCycle[];
  challenges: Challenge[];
  checkins: DailyCheckin[];
}

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultDb(): LocalDb {
  const start = format(new Date(), "yyyy-MM-dd");
  const end = format(addDays(new Date(), 29), "yyyy-MM-dd");
  const cycleId = uid();

  const cycle: ChallengeCycle = {
    id: cycleId,
    name: "Cycle 1",
    start_date: start,
    end_date: end,
    status: "active",
    created_at: new Date().toISOString(),
  };

  const challenges: Challenge[] = [
    {
      id: uid(),
      cycle_id: cycleId,
      title: "No Sugar",
      description: "No added sugar for the day.",
      applies_to: "both",
      metadata: {},
      sort_order: 1,
      enabled: true,
    },
    {
      id: uid(),
      cycle_id: cycleId,
      title: "Gym",
      description: "Complete a gym workout.",
      applies_to: "ali",
      metadata: {},
      sort_order: 2,
      enabled: true,
    },
    {
      id: uid(),
      cycle_id: cycleId,
      title: "Protein Intake",
      description: "Hit your daily protein target.",
      applies_to: "both",
      metadata: { protein_grams: { ali: 175, hajar: 90 } },
      sort_order: 3,
      enabled: true,
    },
    {
      id: uid(),
      cycle_id: cycleId,
      title: "30 mins walk",
      description: "Walk for at least 30 minutes.",
      applies_to: "both",
      metadata: {},
      sort_order: 4,
      enabled: true,
    },
  ];

  return { cycles: [cycle], challenges, checkins: [] };
}

function read(): LocalDb {
  if (typeof window === "undefined") return defaultDb();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const db = defaultDb();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      return db;
    }
    return JSON.parse(raw) as LocalDb;
  } catch {
    const db = defaultDb();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return db;
  }
}

function write(db: LocalDb) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  window.dispatchEvent(new CustomEvent("thirty-days-local-sync"));
}

export const localDb = {
  getActiveCycle(): ChallengeCycle | null {
    return read().cycles.find((c) => c.status === "active") ?? null;
  },

  getCycles(): ChallengeCycle[] {
    return read().cycles.sort((a, b) => b.start_date.localeCompare(a.start_date));
  },

  getChallenges(cycleId: string): Challenge[] {
    return read()
      .challenges.filter((c) => c.cycle_id === cycleId)
      .sort((a, b) => a.sort_order - b.sort_order);
  },

  getCheckins(cycleId: string): DailyCheckin[] {
    return read().checkins.filter((c) => c.cycle_id === cycleId);
  },

  upsertCheckin(input: {
    cycle_id: string;
    challenge_id: string;
    user_id: string;
    date: string;
    status: CheckinStatus;
  }): DailyCheckin {
    const db = read();
    const existing = db.checkins.find(
      (c) =>
        c.challenge_id === input.challenge_id &&
        c.user_id === input.user_id &&
        c.date === input.date
    );
    if (existing) {
      existing.status = input.status;
      existing.updated_at = new Date().toISOString();
      write(db);
      return existing;
    }
    const row: DailyCheckin = {
      id: uid(),
      ...input,
      updated_at: new Date().toISOString(),
    };
    db.checkins.push(row);
    write(db);
    return row;
  },

  updateChallenge(challenge: Challenge) {
    const db = read();
    const idx = db.challenges.findIndex((c) => c.id === challenge.id);
    if (idx >= 0) {
      db.challenges[idx] = challenge;
      write(db);
    }
  },

  addChallenge(challenge: Omit<Challenge, "id">): Challenge {
    const db = read();
    const row: Challenge = { ...challenge, id: uid() };
    db.challenges.push(row);
    write(db);
    return row;
  },

  startNewCycle(opts: {
    name: string;
    start_date: string;
    challenges: Omit<Challenge, "id" | "cycle_id">[];
  }): ChallengeCycle {
    const db = read();
    db.cycles = db.cycles.map((c) =>
      c.status === "active" ? { ...c, status: "archived" as const } : c
    );
    const end = format(addDays(new Date(opts.start_date + "T12:00:00"), 29), "yyyy-MM-dd");
    const cycle: ChallengeCycle = {
      id: uid(),
      name: opts.name,
      start_date: opts.start_date,
      end_date: end,
      status: "active",
      created_at: new Date().toISOString(),
    };
    db.cycles.push(cycle);
    opts.challenges.forEach((ch, i) => {
      db.challenges.push({
        ...ch,
        id: uid(),
        cycle_id: cycle.id,
        sort_order: ch.sort_order ?? i + 1,
      });
    });
    write(db);
    return cycle;
  },

  reset() {
    write(defaultDb());
  },

  subscribe(cb: () => void) {
    const handler = () => cb();
    window.addEventListener("thirty-days-local-sync", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("thirty-days-local-sync", handler);
      window.removeEventListener("storage", handler);
    };
  },
};

export function otherUserName(name: DisplayName): DisplayName {
  return name === "Ali" ? "Hajar" : "Ali";
}

export function userIdFor(name: DisplayName): string {
  return USER_IDS[name];
}
