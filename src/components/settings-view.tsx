"use client";

import { useEffect, useState } from "react";
import type { AppliesTo, Challenge, ChallengeMetadata, DisplayName } from "@/lib/types";
import { todayISO } from "@/lib/dates";
import type { CycleData } from "@/hooks/use-cycle-data";
import { useIdentity } from "@/hooks/use-identity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type DraftChallenge = {
  title: string;
  description: string;
  applies_to: AppliesTo;
  enabled: boolean;
  proteinAli: string;
  proteinHajar: string;
  sort_order: number;
  id?: string;
};

function toDraft(ch: Challenge): DraftChallenge {
  return {
    id: ch.id,
    title: ch.title,
    description: ch.description,
    applies_to: ch.applies_to,
    enabled: ch.enabled,
    proteinAli: String(ch.metadata?.protein_grams?.ali ?? ""),
    proteinHajar: String(ch.metadata?.protein_grams?.hajar ?? ""),
    sort_order: ch.sort_order,
  };
}

function fromDraft(d: DraftChallenge): Omit<Challenge, "id" | "cycle_id"> & { id?: string } {
  const metadata: ChallengeMetadata = {};
  const ali = Number(d.proteinAli);
  const hajar = Number(d.proteinHajar);
  if ((!Number.isNaN(ali) && d.proteinAli !== "") || (!Number.isNaN(hajar) && d.proteinHajar !== "")) {
    metadata.protein_grams = {};
    if (!Number.isNaN(ali) && d.proteinAli !== "") metadata.protein_grams.ali = ali;
    if (!Number.isNaN(hajar) && d.proteinHajar !== "") metadata.protein_grams.hajar = hajar;
  }
  return {
    id: d.id,
    title: d.title.trim(),
    description: d.description.trim(),
    applies_to: d.applies_to,
    enabled: d.enabled,
    metadata,
    sort_order: d.sort_order,
  };
}

export function SettingsView({
  data,
  displayName,
}: {
  data: CycleData;
  displayName: DisplayName;
}) {
  const { cycle, challenges, cycles, mode, updateChallenge, addChallenge, startNewCycle } = data;
  const clearIdentity = useIdentity((s) => s.clearIdentity);
  const [switchTo, setSwitchTo] = useState<DisplayName | null>(null);

  const [drafts, setDrafts] = useState<DraftChallenge[]>(() => challenges.map(toDraft));
  const [cycleName, setCycleName] = useState(
    () => `Cycle ${(cycles?.length ?? 0) + 1}`
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const challengeKey = `${cycle?.id ?? ""}:${challenges.map((c) => c.id).join(",")}`;

  useEffect(() => {
    setDrafts(challenges.map(toDraft));
    // Only re-seed drafts when the cycle or challenge ids change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeKey]);

  const updateDraft = (index: number, patch: Partial<DraftChallenge>) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const saveCurrent = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      for (const d of drafts) {
        const row = fromDraft(d);
        if (!row.title) continue;
        if (row.id) {
          const existing = challenges.find((c) => c.id === row.id);
          if (!existing || !cycle) continue;
          await updateChallenge({
            ...existing,
            title: row.title,
            description: row.description,
            applies_to: row.applies_to,
            enabled: row.enabled,
            metadata: row.metadata,
            sort_order: row.sort_order,
          });
        } else if (cycle) {
          await addChallenge({
            title: row.title,
            description: row.description,
            applies_to: row.applies_to,
            enabled: row.enabled,
            metadata: row.metadata,
            sort_order: row.sort_order,
          });
        }
      }
      setMessage("Challenges saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onStartCycle = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const nextChallenges = drafts
        .map(fromDraft)
        .filter((c) => c.title)
        .map((row) => {
          const { id: _omit, ...rest } = row;
          void _omit;
          return rest;
        });
      await startNewCycle({
        name: cycleName.trim() || `Cycle ${cycles.length + 1}`,
        start_date: todayISO(),
        challenges: nextChallenges.length
          ? nextChallenges
          : [
              {
                title: "No Sugar",
                description: "No added sugar for the day.",
                applies_to: "both",
                metadata: {},
                sort_order: 1,
                enabled: true,
              },
            ],
      });
      setMessage("New cycle started. Previous cycle archived.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start cycle");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-28">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          Settings
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--ink)]">
          Cycle & identity
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Signed in as <span className="font-semibold text-[var(--ink)]">{displayName}</span>
          {" · "}
          Data: {mode === "supabase" ? "Supabase live" : "Local demo"}
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Switch user
        </h2>
        <p className="text-sm text-[var(--muted)]">
          Switching only changes who you check in as. The board stays shared.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(["Ali", "Hajar"] as DisplayName[]).map((name) => (
            <AlertDialog
              key={name}
              open={switchTo === name}
              onOpenChange={(open) => setSwitchTo(open ? name : null)}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant={displayName === name ? "default" : "secondary"}
                  disabled={displayName === name}
                  onClick={() => setSwitchTo(name)}
                >
                  {name}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Switch to {name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will check in as {name} on this device. Existing board data is unchanged.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      useIdentity.getState().setIdentity(name);
                      setSwitchTo(null);
                    }}
                  >
                    Switch to {name}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ))}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline">Clear identity</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Return to identity picker?</AlertDialogTitle>
              <AlertDialogDescription>
                You will need to choose Ali or Hajar again on this device.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => clearIdentity()}>Clear</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
            Challenges
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Edit the active set. Starting a new cycle archives history and copies these definitions.
          </p>
          {cycle && (
            <p className="mt-2 text-xs font-semibold text-[var(--muted)]">
              Active: {cycle.name} ({cycle.start_date} → {cycle.end_date})
            </p>
          )}
        </div>

        <ul className="space-y-4">
          {drafts.map((d, index) => (
            <li
              key={d.id ?? `new-${index}`}
              className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/70 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={`enabled-${index}`}>Enabled</Label>
                <Switch
                  id={`enabled-${index}`}
                  checked={d.enabled}
                  onCheckedChange={(v) => updateDraft(index, { enabled: v })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`title-${index}`}>Title</Label>
                <Input
                  id={`title-${index}`}
                  value={d.title}
                  onChange={(e) => updateDraft(index, { title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`desc-${index}`}>Description</Label>
                <Textarea
                  id={`desc-${index}`}
                  value={d.description}
                  onChange={(e) => updateDraft(index, { description: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`applies-${index}`}>Applies to</Label>
                <select
                  id={`applies-${index}`}
                  className="flex h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  value={d.applies_to}
                  onChange={(e) =>
                    updateDraft(index, { applies_to: e.target.value as AppliesTo })
                  }
                >
                  <option value="both">Both</option>
                  <option value="ali">Ali only</option>
                  <option value="hajar">Hajar only</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`prot-ali-${index}`}>Protein Ali (g)</Label>
                  <Input
                    id={`prot-ali-${index}`}
                    inputMode="numeric"
                    value={d.proteinAli}
                    onChange={(e) => updateDraft(index, { proteinAli: e.target.value })}
                    placeholder="—"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`prot-hajar-${index}`}>Protein Hajar (g)</Label>
                  <Input
                    id={`prot-hajar-${index}`}
                    inputMode="numeric"
                    value={d.proteinHajar}
                    onChange={(e) => updateDraft(index, { proteinHajar: e.target.value })}
                    placeholder="—"
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>

        <Button
          variant="secondary"
          onClick={() =>
            setDrafts((prev) => [
              ...prev,
              {
                title: "",
                description: "",
                applies_to: "both",
                enabled: true,
                proteinAli: "",
                proteinHajar: "",
                sort_order: prev.length + 1,
              },
            ])
          }
        >
          Add challenge
        </Button>

        <Button disabled={saving || !cycle} onClick={() => void saveCurrent()}>
          Save challenges
        </Button>
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/70 p-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          New 30-day cycle
        </h2>
        <p className="text-sm text-[var(--muted)]">
          Archives the current cycle (history kept) and starts a fresh 30 days using the challenge list above.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="cycle-name">Cycle name</Label>
          <Input
            id="cycle-name"
            value={cycleName}
            onChange={(e) => setCycleName(e.target.value)}
          />
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={saving}>
              Start new cycle
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start a new 30-day cycle?</AlertDialogTitle>
              <AlertDialogDescription>
                The current cycle will be archived. Past check-ins remain available in history via archived cycles in the database. New check-ins begin today.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => void onStartCycle()}>
                Start cycle
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>

      {cycles.length > 1 && (
        <section>
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
            Past cycles
          </h2>
          <ul className="mt-3 space-y-2">
            {cycles.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
              >
                <span className="font-medium text-[var(--ink)]">{c.name}</span>
                <span className="text-[var(--muted)]">
                  {c.status} · {c.start_date}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {message && (
        <p className="rounded-xl bg-[var(--ok-soft)] px-4 py-3 text-sm text-[var(--ok-deep)]">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-xl bg-[var(--fail-soft)] px-4 py-3 text-sm text-[var(--fail-deep)]">
          {error}
        </p>
      )}
    </div>
  );
}
