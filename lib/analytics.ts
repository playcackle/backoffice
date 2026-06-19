import "server-only"
import { fetchAll } from "@/lib/supabase/admin"
import { resolveRange, type RangePreset } from "@/lib/date-range"

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

// A resolved time window. `startMs` is null for "all time".
export type Window = { startMs: number | null; endMs: number; days: number; preset: RangePreset; label: string }

export function getWindow(preset?: string | null): Window {
  const { value, days, label } = resolveRange(preset)
  const endMs = Date.now()
  const startMs = days > 0 ? endMs - days * DAY_MS : null
  return { startMs, endMs, days, preset: value, label }
}

function inWindow(ms: number | null, w: Window): boolean {
  if (ms === null) return false
  if (ms > w.endMs) return false
  if (w.startMs !== null && ms < w.startMs) return false
  return true
}

// Build time buckets spanning the window. Uses daily granularity for spans up
// to ~13 weeks, otherwise weekly buckets to keep the series readable.
type Buckets = {
  keys: string[]
  labels: Map<string, string>
  keyFor: (ms: number) => string | null
}

function buildBuckets(w: Window, earliestMs: number): Buckets {
  const start = w.startMs ?? Math.min(earliestMs, w.endMs)
  const spanDays = Math.max(1, Math.ceil((w.endMs - start) / DAY_MS))
  const weekly = spanDays > 92
  const keys: string[] = []
  const labels = new Map<string, string>()

  if (weekly) {
    // Anchor to the Monday on/before start.
    const startDate = new Date(start)
    const dow = (startDate.getUTCDay() + 6) % 7
    let cursor = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate() - dow)
    while (cursor <= w.endMs) {
      const key = dayKey(cursor)
      keys.push(key)
      labels.set(
        key,
        new Date(cursor).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      )
      cursor += 7 * DAY_MS
    }
    return {
      keys,
      labels,
      keyFor: (ms: number) => {
        const d = new Date(ms)
        const wd = (d.getUTCDay() + 6) % 7
        const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - wd)
        const key = dayKey(monday)
        return labels.has(key) ? key : null
      },
    }
  }

  const startDay = Date.UTC(
    new Date(start).getUTCFullYear(),
    new Date(start).getUTCMonth(),
    new Date(start).getUTCDate(),
  )
  for (let cursor = startDay; cursor <= w.endMs; cursor += DAY_MS) {
    const key = dayKey(cursor)
    keys.push(key)
    labels.set(key, new Date(cursor).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }))
  }
  return {
    keys,
    labels,
    keyFor: (ms: number) => {
      const key = dayKey(ms)
      return labels.has(key) ? key : null
    },
  }
}

export type UserMetrics = {
  totalUsers: number
  newInRange: number
  activeInRange: number
  dau: number
  wau: number
  mau: number
  newToday: number
  newThisWeek: number
  botCount: number
  signupSeries: { date: string; signups: number; active: number }[]
}

export async function getUserMetrics(w: Window): Promise<UserMetrics> {
  const players = await fetchAll<PlayerRow>("player", "id,created_at,last_seen_active_at,is_bot")
  const humans = players.filter((p) => !p.is_bot)
  const now = Date.now()

  let dau = 0
  let wau = 0
  let mau = 0
  let newToday = 0
  let newThisWeek = 0
  let newInRange = 0
  let activeInRange = 0
  let totalUpToEnd = 0

  let earliest = now
  for (const p of humans) {
    const created = parseTs(p.created_at)
    if (created !== null && created < earliest) earliest = created
  }

  const buckets = buildBuckets(w, earliest)
  const signupMap = new Map<string, number>()
  const activeMap = new Map<string, number>()

  for (const p of humans) {
    const seen = parseTs(p.last_seen_active_at)
    if (seen !== null) {
      const age = now - seen
      if (age <= DAY_MS) dau++
      if (age <= 7 * DAY_MS) wau++
      if (age <= 30 * DAY_MS) mau++
      if (inWindow(seen, w)) {
        activeInRange++
        const k = buckets.keyFor(seen)
        if (k) activeMap.set(k, (activeMap.get(k) ?? 0) + 1)
      }
    }

    const created = parseTs(p.created_at)
    if (created !== null) {
      const age = now - created
      if (age <= DAY_MS) newToday++
      if (age <= 7 * DAY_MS) newThisWeek++
      if (created <= w.endMs) totalUpToEnd++
      if (inWindow(created, w)) {
        newInRange++
        const k = buckets.keyFor(created)
        if (k) signupMap.set(k, (signupMap.get(k) ?? 0) + 1)
      }
    }
  }

  return {
    totalUsers: totalUpToEnd,
    newInRange,
    activeInRange,
    dau,
    wau,
    mau,
    newToday,
    newThisWeek,
    botCount: players.length - humans.length,
    signupSeries: buckets.keys.map((k) => ({
      date: buckets.labels.get(k) ?? k,
      signups: signupMap.get(k) ?? 0,
      active: activeMap.get(k) ?? 0,
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

export async function getRetentionMetrics(w: Window): Promise<RetentionMetrics> {
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

  // Rounds played per bucket over the selected window.
  const rounds = await fetchAll<RoundRow>("roundanalytics", "id,created_at")
  let earliest = w.endMs
  for (const r of rounds) {
    const ms = parseTs(r.created_at)
    if (ms !== null && ms < earliest) earliest = ms
  }
  const timeBuckets = buildBuckets(w, earliest)
  const roundsMap = new Map<string, number>()
  for (const r of rounds) {
    const ms = parseTs(r.created_at)
    if (!inWindow(ms, w)) continue
    const k = timeBuckets.keyFor(ms as number)
    if (k) roundsMap.set(k, (roundsMap.get(k) ?? 0) + 1)
  }

  return {
    returningUsers: returning,
    returnRate: returning / count,
    avgGamesPlayed: totalGames / count,
    avgRoundsPlayed: totalRounds / count,
    avgSlotsSnapped: totalSnaps / count,
    engagementBuckets: buckets.map((b) => ({ label: b.label, players: b.players })),
    roundsSeries: timeBuckets.keys.map((k) => ({ date: timeBuckets.labels.get(k) ?? k, rounds: roundsMap.get(k) ?? 0 })),
  }
}

export type TopicStat = {
  topic: string
  category: string | null
  rounds: number
  sessions: number
  share: number
}

export type TopicMetrics = {
  totalTopics: number
  totalRounds: number
  topTopic: string | null
  topics: TopicStat[]
}

export async function getTopicMetrics(w: Window): Promise<TopicMetrics> {
  const rounds = await fetchAll<RoundRow>("roundanalytics", "id,created_at,topic_name,category_name,game_session_id")

  type Agg = { topic: string; category: string | null; rounds: number; sessions: Set<string> }
  const map = new Map<string, Agg>()
  let totalRounds = 0

  for (const r of rounds) {
    const ms = parseTs(r.created_at)
    if (!inWindow(ms, w)) continue
    const topic = (r.topic_name ?? "").trim() || "Untitled topic"
    const key = topic.toLowerCase()
    const agg = map.get(key) ?? { topic, category: r.category_name ?? null, rounds: 0, sessions: new Set<string>() }
    agg.rounds += 1
    if (!agg.category && r.category_name) agg.category = r.category_name
    if (r.game_session_id) agg.sessions.add(r.game_session_id)
    map.set(key, agg)
    totalRounds++
  }

  const topics: TopicStat[] = Array.from(map.values())
    .map((a) => ({
      topic: a.topic,
      category: a.category,
      rounds: a.rounds,
      sessions: a.sessions.size,
      share: totalRounds ? a.rounds / totalRounds : 0,
    }))
    .sort((a, b) => b.rounds - a.rounds)

  return {
    totalTopics: topics.length,
    totalRounds,
    topTopic: topics[0]?.topic ?? null,
    topics: topics.slice(0, 12),
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

export async function getQuestionMetrics(w: Window): Promise<QuestionMetrics> {
  const rows = await fetchAll<SlotAnalyticsRow>(
    "slotanalytics",
    "canonical_text,slot_id,is_rare,is_claimed,total_attempts,failed_attempts,unique_attemptors,created_at",
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
  let consideredRows = 0

  for (const r of rows) {
    const ms = parseTs(r.created_at)
    // Slot analytics rows carry a created_at; honor the window when present.
    if (r.created_at && !inWindow(ms, w)) continue
    consideredRows++
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

  const hardest = [...ranked].sort((a, b) => b.failRate - a.failRate || b.attempts - a.attempts).slice(0, 10)
  const easiest = [...ranked].sort((a, b) => b.claimRate - a.claimRate || a.failRate - b.failRate).slice(0, 10)
  const mostAttempted = [...stats].sort((a, b) => b.attempts - a.attempts).slice(0, 10)

  return {
    totalSlotsTracked: map.size,
    totalAttempts,
    overallClaimRate: consideredRows ? totalClaimed / consideredRows : 0,
    hardest,
    easiest,
    mostAttempted,
  }
}
