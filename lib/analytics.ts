import "server-only"
import { fetchAll } from "@/lib/supabase/admin"

type PlayerRow = {
  id: string
  created_at: string | null
  last_seen_active_at: string | null
  total_score: number | null
  games_played: number | null
  rounds_played: number | null
  total_slots_snapped: number | null
  is_bot: boolean | null
}

type RoundRow = {
  id: number
  created_at: string | null
  topic_name: string | null
  category_name: string | null
  game_session_id: string | null
}

type SlotAnalyticsRow = {
  canonical_text: string | null
  slot_id: number | null
  is_rare: boolean | null
  is_claimed: boolean | null
  total_attempts: number | null
  failed_attempts: number | null
  unique_attemptors: number | null
  created_at: string | null
}

const DAY_MS = 1000 * 60 * 60 * 24

// Timestamps are stored without timezone; treat them as UTC for consistent bucketing.
function parseTs(value: string | null): number | null {
  if (!value) return null
  const normalized = value.includes("T") ? value : value.replace(" ", "T")
  const withZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}Z`
  const ms = Date.parse(withZone)
  return Number.isNaN(ms) ? null : ms
}

function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

function emptyDayRange(days: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = []
  const today = Date.now()
  for (let i = days - 1; i >= 0; i--) {
    const ms = today - i * DAY_MS
    const key = dayKey(ms)
    out.push({
      key,
      label: new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
    })
  }
  return out
}

export type UserMetrics = {
  totalUsers: number
  dau: number
  wau: number
  mau: number
  newToday: number
  newThisWeek: number
  botCount: number
  signupSeries: { date: string; signups: number; active: number }[]
}

export async function getUserMetrics(): Promise<UserMetrics> {
  const players = await fetchAll<PlayerRow>(
    "player",
    "id,created_at,last_seen_active_at,is_bot",
  )
  const humans = players.filter((p) => !p.is_bot)
  const now = Date.now()

  let dau = 0
  let wau = 0
  let mau = 0
  let newToday = 0
  let newThisWeek = 0

  const signupMap = new Map<string, number>()
  const activeMap = new Map<string, number>()
  const range = emptyDayRange(30)
  const rangeKeys = new Set(range.map((r) => r.key))

  for (const p of humans) {
    const seen = parseTs(p.last_seen_active_at)
    if (seen !== null) {
      const age = now - seen
      if (age <= DAY_MS) dau++
      if (age <= 7 * DAY_MS) wau++
      if (age <= 30 * DAY_MS) mau++
      const k = dayKey(seen)
      if (rangeKeys.has(k)) activeMap.set(k, (activeMap.get(k) ?? 0) + 1)
    }

    const created = parseTs(p.created_at)
    if (created !== null) {
      const age = now - created
      if (age <= DAY_MS) newToday++
      if (age <= 7 * DAY_MS) newThisWeek++
      const k = dayKey(created)
      if (rangeKeys.has(k)) signupMap.set(k, (signupMap.get(k) ?? 0) + 1)
    }
  }

  return {
    totalUsers: humans.length,
    dau,
    wau,
    mau,
    newToday,
    newThisWeek,
    botCount: players.length - humans.length,
    signupSeries: range.map((r) => ({
      date: r.label,
      signups: signupMap.get(r.key) ?? 0,
      active: activeMap.get(r.key) ?? 0,
    })),
  }
}

export type RetentionMetrics = {
  returningUsers: number
  returnRate: number
  avgGamesPlayed: number
  avgRoundsPlayed: number
  avgSlotsSnapped: number
  engagementBuckets: { label: string; players: number }[]
  roundsSeries: { date: string; rounds: number }[]
}

export async function getRetentionMetrics(): Promise<RetentionMetrics> {
  const players = await fetchAll<PlayerRow>(
    "player",
    "id,created_at,last_seen_active_at,games_played,rounds_played,total_slots_snapped,is_bot",
  )
  const humans = players.filter((p) => !p.is_bot)

  let returning = 0
  let totalGames = 0
  let totalRounds = 0
  let totalSnaps = 0

  const buckets = [
    { label: "0 games", min: 0, max: 0, players: 0 },
    { label: "1 game", min: 1, max: 1, players: 0 },
    { label: "2-5 games", min: 2, max: 5, players: 0 },
    { label: "6-10 games", min: 6, max: 10, players: 0 },
    { label: "11+ games", min: 11, max: Infinity, players: 0 },
  ]

  for (const p of humans) {
    const games = p.games_played ?? 0
    totalGames += games
    totalRounds += p.rounds_played ?? 0
    totalSnaps += p.total_slots_snapped ?? 0

    const created = parseTs(p.created_at)
    const seen = parseTs(p.last_seen_active_at)
    // Returning = active on a later calendar day than signup.
    if (created !== null && seen !== null && dayKey(seen) > dayKey(created)) returning++

    const bucket = buckets.find((b) => games >= b.min && games <= b.max)
    if (bucket) bucket.players++
  }

  const count = humans.length || 1

  // Rounds played per day over the last 30 days.
  const rounds = await fetchAll<RoundRow>("roundanalytics", "id,created_at")
  const range = emptyDayRange(30)
  const rangeKeys = new Set(range.map((r) => r.key))
  const roundsMap = new Map<string, number>()
  for (const r of rounds) {
    const ms = parseTs(r.created_at)
    if (ms === null) continue
    const k = dayKey(ms)
    if (rangeKeys.has(k)) roundsMap.set(k, (roundsMap.get(k) ?? 0) + 1)
  }

  return {
    returningUsers: returning,
    returnRate: returning / count,
    avgGamesPlayed: totalGames / count,
    avgRoundsPlayed: totalRounds / count,
    avgSlotsSnapped: totalSnaps / count,
    engagementBuckets: buckets.map((b) => ({ label: b.label, players: b.players })),
    roundsSeries: range.map((r) => ({ date: r.label, rounds: roundsMap.get(r.key) ?? 0 })),
  }
}

export type QuestionStat = {
  text: string
  attempts: number
  failed: number
  claimRate: number
  failRate: number
  uniqueAttemptors: number
  appearances: number
  isRare: boolean
}

export type QuestionMetrics = {
  totalSlotsTracked: number
  totalAttempts: number
  overallClaimRate: number
  hardest: QuestionStat[]
  easiest: QuestionStat[]
  mostAttempted: QuestionStat[]
}

export async function getQuestionMetrics(): Promise<QuestionMetrics> {
  const rows = await fetchAll<SlotAnalyticsRow>(
    "slotanalytics",
    "canonical_text,slot_id,is_rare,is_claimed,total_attempts,failed_attempts,unique_attemptors",
  )

  type Agg = {
    text: string
    attempts: number
    failed: number
    claimed: number
    appearances: number
    uniqueAttemptors: number
    isRare: boolean
  }
  const map = new Map<string, Agg>()

  let totalAttempts = 0
  let totalClaimed = 0

  for (const r of rows) {
    const text = (r.canonical_text ?? "").trim() || `Slot #${r.slot_id ?? "?"}`
    const key = text.toLowerCase()
    const agg =
      map.get(key) ??
      { text, attempts: 0, failed: 0, claimed: 0, appearances: 0, uniqueAttemptors: 0, isRare: false }

    agg.attempts += r.total_attempts ?? 0
    agg.failed += r.failed_attempts ?? 0
    agg.claimed += r.is_claimed ? 1 : 0
    agg.appearances += 1
    agg.uniqueAttemptors += r.unique_attemptors ?? 0
    agg.isRare = agg.isRare || !!r.is_rare

    totalAttempts += r.total_attempts ?? 0
    totalClaimed += r.is_claimed ? 1 : 0
    map.set(key, agg)
  }

  const stats: QuestionStat[] = Array.from(map.values()).map((a) => ({
    text: a.text,
    attempts: a.attempts,
    failed: a.failed,
    claimRate: a.appearances ? a.claimed / a.appearances : 0,
    failRate: a.attempts ? a.failed / a.attempts : 0,
    uniqueAttemptors: a.uniqueAttemptors,
    appearances: a.appearances,
    isRare: a.isRare,
  }))

  // Only rank questions that have been seen enough to be meaningful.
  const ranked = stats.filter((s) => s.appearances >= 3)

  const hardest = [...ranked]
    .sort((a, b) => b.failRate - a.failRate || b.attempts - a.attempts)
    .slice(0, 10)
  const easiest = [...ranked]
    .sort((a, b) => b.claimRate - a.claimRate || a.failRate - b.failRate)
    .slice(0, 10)
  const mostAttempted = [...stats].sort((a, b) => b.attempts - a.attempts).slice(0, 10)

  return {
    totalSlotsTracked: map.size,
    totalAttempts,
    overallClaimRate: rows.length ? totalClaimed / rows.length : 0,
    hardest,
    easiest,
    mostAttempted,
  }
}
