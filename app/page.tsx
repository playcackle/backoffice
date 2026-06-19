import { Suspense } from "react"
import { Users, Activity, UserPlus, Repeat, Gamepad2, Target, CalendarClock, CalendarRange, Sparkles, Layers, Hash } from "lucide-react"
import {
  getUserMetrics,
  getRetentionMetrics,
  getQuestionMetrics,
  getTopicMetrics,
  getWindow,
} from "@/lib/analytics"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DateRangeFilter } from "@/components/dashboard/date-range-filter"
import { StatCard } from "@/components/dashboard/stat-card"
import { UsersActivityChart } from "@/components/dashboard/users-activity-chart"
import { EngagementChart } from "@/components/dashboard/engagement-chart"
import { RoundsChart } from "@/components/dashboard/rounds-chart"
import { TopicBreakdown } from "@/components/dashboard/topic-breakdown"
import { QuestionsTable } from "@/components/dashboard/questions-table"
import { Card, CardContent } from "@/components/ui/card"

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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range } = await searchParams
  const window = getWindow(range)

  let data: Awaited<ReturnType<typeof loadAll>> | null = null
  let error: string | null = null

  try {
    data = await loadAll(range)
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

            <Section title="Topics" description="Which trivia topics players spend their rounds on">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard label="Topics played" value={fmt(data.topics.totalTopics)} icon={Layers} />
                <StatCard label="Rounds in range" value={fmt(data.topics.totalRounds)} icon={Hash} />
                <StatCard label="Top topic" value={data.topics.topTopic ?? "—"} icon={Sparkles} />
              </div>
              <TopicBreakdown topics={data.topics.topics} />
            </Section>

            <Section title="Question performance" description="Which questions challenge or stump your players">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard label="Questions tracked" value={fmt(data.questions.totalSlotsTracked)} icon={Sparkles} />
                <StatCard label="Total attempts" value={fmt(data.questions.totalAttempts)} icon={Target} />
                <StatCard label="Overall claim rate" value={pct(data.questions.overallClaimRate)} icon={Activity} />
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

async function loadAll(range?: string) {
  const window = getWindow(range)
  const [users, retention, topics, questions] = await Promise.all([
    getUserMetrics(window),
    getRetentionMetrics(window),
    getTopicMetrics(window),
    getQuestionMetrics(window),
  ])
  return { users, retention, topics, questions }
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}
