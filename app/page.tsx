import { Users, Activity, UserPlus, Repeat, Gamepad2, Target, CalendarClock, Sparkles } from "lucide-react"
import { getUserMetrics, getRetentionMetrics, getQuestionMetrics } from "@/lib/analytics"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { UsersActivityChart } from "@/components/dashboard/users-activity-chart"
import { EngagementChart } from "@/components/dashboard/engagement-chart"
import { RoundsChart } from "@/components/dashboard/rounds-chart"
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

export default async function DashboardPage() {
  let data: Awaited<ReturnType<typeof loadAll>> | null = null
  let error: string | null = null

  try {
    data = await loadAll()
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load analytics."
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
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
                <StatCard label="Total players" value={fmt(data.users.totalUsers)} icon={Users} hint={`${fmt(data.users.botCount)} bots excluded`} />
                <StatCard label="Active today" value={fmt(data.users.dau)} icon={Activity} hint="Seen in last 24h" />
                <StatCard label="Weekly active" value={fmt(data.users.wau)} icon={CalendarClock} hint="Seen in last 7 days" />
                <StatCard label="New this week" value={fmt(data.users.newThisWeek)} icon={UserPlus} hint={`${fmt(data.users.newToday)} joined today`} />
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
                <StatCard label="Monthly active" value={fmt(data.users.mau)} icon={Activity} hint="Seen in last 30 days" />
              </div>
              <EngagementChart data={data.retention.engagementBuckets} />
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

async function loadAll() {
  const [users, retention, questions] = await Promise.all([
    getUserMetrics(),
    getRetentionMetrics(),
    getQuestionMetrics(),
  ])
  return { users, retention, questions }
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
