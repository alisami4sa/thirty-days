import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function supabaseKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = supabaseKey();
  return Boolean(url && key && !url.includes("your-project"));
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (client) return client;

  client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabaseKey()!, {
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return client;
}
