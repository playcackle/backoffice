import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let cached: SupabaseClient | null = null

// Read-only service-role client used exclusively for server-side analytics
// aggregation. Never import this from client components.
export function getAdminClient(): SupabaseClient {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error("Supabase environment variables are not configured.")
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}

// Fetch every row of a selection in pages of 1000 (Supabase's max page size),
// up to a safety cap, and return the combined array.
export async function fetchAll<T>(
  table: string,
  columns: string,
  options: { cap?: number; order?: { column: string; ascending?: boolean } } = {},
): Promise<T[]> {
  const supabase = getAdminClient()
  const cap = options.cap ?? 100_000
  const pageSize = 1000
  const rows: T[] = []

  for (let from = 0; from < cap; from += pageSize) {
    let query = supabase.from(table).select(columns).range(from, from + pageSize - 1)
    if (options.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? true })
    }
    const { data, error } = await query
    if (error) throw new Error(`Failed to read ${table}: ${error.message}`)
    if (!data || data.length === 0) break
    rows.push(...(data as T[]))
    if (data.length < pageSize) break
  }

  return rows
}
