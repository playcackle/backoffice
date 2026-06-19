import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Crown, Heart, Sparkle, Coffee, AlertTriangle, Moon } from "lucide-react"
import type { LifecycleSegment } from "@/lib/analytics"

const TONE_STYLES: Record<
  LifecycleSegment["tone"],
  { bar: string; text: string; chip: string }
> = {
  positive: {
    bar: "bg-success",
    text: "text-success",
    chip: "bg-success/10 text-success",
  },
  neutral: {
    bar: "bg-primary",
    text: "text-primary",
    chip: "bg-primary/10 text-primary",
  },
  warning: {
    bar: "bg-warning",
    text: "text-warning",
    chip: "bg-warning/15 text-warning",
  },
  danger: {
    bar: "bg-destructive",
    text: "text-destructive",
    chip: "bg-destructive/10 text-destructive",
  },
}

const ICONS: Record<string, typeof Crown> = {
  champions: Crown,
  loyal: Heart,
  newcomers: Sparkle,
  casual: Coffee,
  atRisk: AlertTriangle,
  dormant: Moon,
}

function pct(n: number) {
  return `${(n * 100).toFixed(0)}%`
}

export function LifecycleSegments({ segments }: { segments: LifecycleSegment[] }) {
  const maxShare = Math.max(...segments.map((s) => s.share), 0.0001)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Player lifecycle segments</CardTitle>
        <CardDescription>
          Players grouped by recency and play frequency, with the recommended action for each group.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {segments.map((s) => {
            const tone = TONE_STYLES[s.tone]
            const Icon = ICONS[s.key] ?? Sparkle
            return (
              <div
                key={s.key}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`flex size-7 items-center justify-center rounded-md ${tone.chip}`}>
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="font-medium">{s.label}</span>
                  </div>
                  <span className={`text-xs font-medium ${tone.text}`}>{pct(s.share)}</span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tabular-nums">{s.players.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">players</span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${(s.share / maxShare) * 100}%` }} />
                </div>

                <p className="text-xs text-muted-foreground">{s.description}</p>
                <p className="text-sm leading-relaxed text-pretty">{s.action}</p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
