"use client"

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { RetentionMilestone } from "@/lib/analytics"

const config = {
  rate: { label: "Retained", color: "var(--chart-1)" },
} satisfies ChartConfig

// Top-quartile mobile-game benchmarks (industry rule of thumb).
const BENCHMARKS: Record<string, number> = {
  "Day 1": 0.4,
  "Day 7": 0.2,
  "Day 30": 0.1,
}

export function RetentionFunnel({ data }: { data: RetentionMilestone[] }) {
  const chartData = data.map((m) => ({
    label: m.label,
    rate: Number((m.rate * 100).toFixed(1)),
    benchmark: (BENCHMARKS[m.label] ?? 0) * 100,
    retained: m.retained,
    eligible: m.eligible,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Retention curve (D1 / D7 / D30)</CardTitle>
        <CardDescription>
          Share of players who stayed active past each milestone, versus top-quartile benchmarks.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ChartContainer config={config} className="h-[260px] w-full">
          <BarChart data={chartData} margin={{ left: 4, right: 8, top: 20 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} width={36} unit="%" domain={[0, 100]} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{value}% retained</span>
                      <span className="text-xs text-muted-foreground">
                        {item.payload.retained.toLocaleString()} of {item.payload.eligible.toLocaleString()} eligible
                      </span>
                      <span className="text-xs text-muted-foreground">Benchmark: {item.payload.benchmark}%</span>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="rate" fill="var(--color-rate)" radius={[6, 6, 0, 0]}>
              <LabelList dataKey="rate" position="top" formatter={(v: unknown) => `${v}%`} className="fill-foreground text-xs" />
            </Bar>
          </BarChart>
        </ChartContainer>

        <div className="grid grid-cols-3 gap-3">
          {chartData.map((m) => {
            const meets = m.rate >= m.benchmark
            return (
              <div key={m.label} className="rounded-lg border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-lg font-semibold tabular-nums">{m.rate}%</p>
                <p className={`text-xs ${meets ? "text-success" : "text-warning"}`}>
                  {meets ? "At/above" : "Below"} {m.benchmark}% target
                </p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
