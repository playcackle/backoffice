import { Suspense } from "react"
import { Users, Activity, UserPlus, Repeat, Gamepad2, Target, CalendarClock, CalendarRange, Sparkles, Layers, Hash, Flame, AlertTriangle, Moon, Lightbulb } from "lucide-react"
import {
  getUserMetrics,
  getRetentionMetrics,
  getQuestionMetrics,
  getTopicMetrics,
  getGrowthInsights,
  getWindow,
  type GrowthInsights,
} from "@/lib/analytics"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DateRangeFilter } from "@/components/dashboard/date-range-filter"
import { BotFilter } from "@/components/dashboard/bot-filter"
import { StatCard } from "@/components/dashboard/stat-card"
import { UsersActivityChart } from "@/components/dashboard/users-activity-chart"
import { EngagementChart } from "@/components/dashboard/engagement-chart"
import { RoundsChart } from "@/components/dashboard/rounds-chart"
import { TopicBreakdown } from "@/components/dashboard/topic-breakdown"
import { QuestionsTable } from "@/components/dashboard/questions-table"
import { LifecycleSegments } from "@/components/dashboard/lifecycle-segments"
import { RetentionFunnel } from "@/components/dashboard/retention-funnel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

function fmt(n: number) {
  return n.toLocaleString("en-US")
}

function pct(n: number) {
  return `${(n * 100).toFixed(0)}%`
}

function dec(n: number) {
  return n.toFixed(1)
}

// Stickiness benchmarks: social/game apps often exceed 50%, while 20%+ is
// healthy for most consumer products.
function stickinessVerdict(ratio: number): string {
  if (ratio >= 0.5) return "Excellent — strong daily habit"
  if (ratio >= 0.2) return "Healthy daily engagement"
  if (ratio >= 0.1) return "Room to deepen the habit"
  return "Low — focus on daily reasons to return"
}

// Derive a short, prioritized set of recommendations from the growth signals.
function buildRecommendations(g: GrowthInsights): { title: string; detail: string }[] {
  const recs: { title: string; detail: string }[] = []
  const segByKey = Object.fromEntries(g.segments.map((s) => [s.key, s]))

  const d7 = g.retention.find((m) => m.label === "Day 7")
  if (d7 && d7.eligible > 0 && d7.rate < 0.2) {
    recs.push({
      title: "Fix early retention first",
      detail: `Day 7 retention is ${(d7.rate * 100).toFixed(0)}% (below the 20% target). Improve onboarding and push newcomers toward their 2nd and 3rd game.`,
    })
  }
  if (g.winBackCount > 0) {
    recs.push({
      title: `Win back ${g.winBackCount.toLocaleString()} at-risk players`,
      detail: "These players were engaged but have gone quiet for 2–4 weeks. A personalized nudge now is far cheaper than re-acquiring them.",
    })
  }
  const champions = segByKey["champions"]
  if (champions && champions.players > 0) {
    recs.push({
      title: `Turn ${champions.players.toLocaleString()} champions into a growth engine`,
      detail: "Add referral incentives and shareable results — your most active players are the cheapest acquisition channel you have.",
    })
  }
  if (g.stickiness < 0.2) {
    recs.push({
      title: "Build a daily habit loop",
      detail: `Stickiness is ${(g.stickiness * 100).toFixed(0)}%. Add daily challenges, streaks, or a daily quiz so players have a reason to return every day.`,
    })
  }
  const dormant = segByKey["dormant"]
  if (recs.length < 3 && dormant && dormant.players > 0) {
    recs.push({
      title: `Reactivate ${dormant.players.toLocaleString()} dormant players`,
      detail: "Run a 'we miss you' campaign featuring new topics added since they left.",
    })
  }
  return recs.slice(0, 3)
}

function RecommendationCard({ growth }: { growth: GrowthInsights }) {
  const recs = buildRecommendations(growth)
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="size-4 text-primary" aria-hidden="true" />
          Recommended next moves
        </CardTitle>
        <CardDescription>Prioritized from your current retention and lifecycle signals.</CardDescription>
      </CardHeader>
      <CardContent>
        {recs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Metrics look healthy — keep reinforcing what is working.
          </p>
        ) : (
          <ol className="flex flex-col gap-4">
            {recs.map((r, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium leading-snug text-pretty">{r.title}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{r.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; bots?: string }>
}) {
  const { range, bots } = await searchParams
  const window = getWindow(range)
  const excludeBots = bots !== "include"

  let data: Awaited<ReturnType<typeof loadAll>> | null = null
  let error: string | null = null

  try {
    data = await loadAll(range, excludeBots)
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load analytics."
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-balance">Analytics overview</h1>
            <p className="text-sm text-muted-foreground">Showing data for {window.label.toLowerCase()}</p>
          </div>
          <Suspense fallback={null}>
            <DateRangeFilter value={window.preset} />
          </Suspense>
        </div>

        {error ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-destructive">Could not load analytics</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        ) : data ? (
          <div className="flex flex-col gap-8">
            <Section title="Players" description="Unique and active users across your trivia game">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Unique users today" value={fmt(data.users.dau)} icon={Activity} hint="Distinct players active in last 24h" />
                <StatCard label="Unique users this week" value={fmt(data.users.wau)} icon={CalendarClock} hint="Distinct players active in last 7 days" />
                <StatCard label="Unique users (30 days)" value={fmt(data.users.mau)} icon={CalendarRange} hint="Distinct players active in last 30 days" />
                <StatCard label="Total players" value={fmt(data.users.totalUsers)} icon={Users} hint={`${fmt(data.users.botCount)} bots excluded`} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
                <StatCard label="Active in range" value={fmt(data.users.activeInRange)} icon={Users} hint={`Distinct players seen in ${window.label.toLowerCase()}`} />
                <StatCard label="New in range" value={fmt(data.users.newInRange)} icon={UserPlus} hint={`${fmt(data.users.newToday)} joined today`} />
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <UsersActivityChart data={data.users.signupSeries} />
                <RoundsChart data={data.retention.roundsSeries} />
              </div>
            </Section>

            <Section title="Retention & engagement" description="How players come back and how deeply they play">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Returning players" value={fmt(data.retention.returningUsers)} icon={Repeat} hint={`${pct(data.retention.returnRate)} return rate`} />
                <StatCard label="Avg games / player" value={dec(data.retention.avgGamesPlayed)} icon={Gamepad2} />
                <StatCard label="Avg rounds / player" value={dec(data.retention.avgRoundsPlayed)} icon={Target} />
                <StatCard label="Avg slots / player" value={dec(data.retention.avgSlotsSnapped)} icon={Sparkles} />
              </div>
              <EngagementChart data={data.retention.engagementBuckets} />
            </Section>

            <Section
              title="Growth & retention insights"
              description="Actionable signals for keeping players and growing the base. These reflect the current state of all players, independent of the date range."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Stickiness (DAU/MAU)"
                  value={pct(data.growth.stickiness)}
                  icon={Flame}
                  hint={stickinessVerdict(data.growth.stickiness)}
                />
                <StatCard
                  label="Weekly stickiness"
                  value={pct(data.growth.weeklyStickiness)}
                  icon={Activity}
                  hint="Daily actives among weekly actives"
                />
                <StatCard
                  label="Win-back targets"
                  value={fmt(data.growth.winBackCount)}
                  icon={AlertTriangle}
                  hint="Engaged players quiet for 2–4 weeks"
                />
                <StatCard
                  label="Dormant valuable"
                  value={fmt(data.growth.dormantValuable)}
                  icon={Moon}
                  hint="High-activity players gone 30+ days"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <RetentionFunnel data={data.growth.retention} />
                <div className="flex items-stretch">
                  <RecommendationCard growth={data.growth} />
                </div>
              </div>
              <LifecycleSegments segments={data.growth.segments} />
            </Section>

            <Section title="Topics" description="Which trivia topics players spend their rounds on">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard label="Topics played" value={fmt(data.topics.totalTopics)} icon={Layers} />
                <StatCard label="Rounds in range" value={fmt(data.topics.totalRounds)} icon={Hash} />
                <StatCard label="Top topic" value={data.topics.topTopic ?? "—"} icon={Sparkles} />
              </div>
              <TopicBreakdown topics={data.topics.topics} />
            </Section>

            <Section
              title="Question performance"
              description={
                data.questions.excludeBots
                  ? "Based on real human submissions — bot activity is excluded"
                  : "Including all submissions from both human players and bots"
              }
              action={
                <Suspense fallback={null}>
                  <BotFilter excludeBots={data.questions.excludeBots} />
                </Suspense>
              }
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard label="Questions tracked" value={fmt(data.questions.totalSlotsTracked)} icon={Sparkles} />
                <StatCard
                  label="Total attempts"
                  value={fmt(data.questions.totalAttempts)}
                  icon={Target}
                  hint={data.questions.excludeBots ? "Human submissions only" : "Humans + bots"}
                />
                <StatCard label="Success rate" value={pct(data.questions.overallClaimRate)} icon={Activity} hint="Successful snaps per attempt" />
              </div>
              <QuestionsTable
                hardest={data.questions.hardest}
                easiest={data.questions.easiest}
                mostAttempted={data.questions.mostAttempted}
              />
            </Section>
          </div>
        ) : null}
      </main>
    </div>
  )
}

async function loadAll(range?: string, excludeBots = true) {
  const window = getWindow(range)
  const [users, retention, topics, questions, growth] = await Promise.all([
    getUserMetrics(window),
    getRetentionMetrics(window),
    getTopicMetrics(window),
    getQuestionMetrics(window, excludeBots),
    getGrowthInsights(),
  ])
  return { users, retention, topics, questions, growth }
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string
  description: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
