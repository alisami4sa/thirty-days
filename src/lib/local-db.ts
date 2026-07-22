import { addDays, format } from "date-fns";
import type {
  Challenge,
  ChallengeCycle,
  CheckinStatus,
  DailyCheckin,
  DisplayName,
  Note,
} from "./types";
import { USER_IDS } from "./types";

const STORAGE_KEY = "thirty-days-local-db-v1";

interface LocalDb {
  cycles: ChallengeCycle[];
  challenges: Challenge[];
  checkins: DailyCheckin[];
  notes: Note[];
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

  return { cycles: [cycle], challenges, checkins: [], notes: [] };
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
    const parsed = JSON.parse(raw) as LocalDb;
    if (!parsed.notes) parsed.notes = [];
    return parsed;
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
    proof_url?: string | null;
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
      if (input.proof_url !== undefined) existing.proof_url = input.proof_url;
      existing.updated_at = new Date().toISOString();
      write(db);
      return existing;
    }
    const row: DailyCheckin = {
      id: uid(),
      cycle_id: input.cycle_id,
      challenge_id: input.challenge_id,
      user_id: input.user_id,
      date: input.date,
      status: input.status,
      proof_url: input.proof_url ?? null,
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

  getNotes(): Note[] {
    return read()
      .notes.slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  addNote(input: { from_user_id: string; to_user_id: string; body: string }): Note {
    const db = read();
    const row: Note = {
      id: uid(),
      from_user_id: input.from_user_id,
      to_user_id: input.to_user_id,
      body: input.body.trim(),
      created_at: new Date().toISOString(),
    };
    db.notes.unshift(row);
    db.notes = db.notes.slice(0, 40);
    write(db);
    return row;
  },

  deleteNote(id: string, fromUserId: string) {
    const db = read();
    db.notes = db.notes.filter((n) => !(n.id === id && n.from_user_id === fromUserId));
    write(db);
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
