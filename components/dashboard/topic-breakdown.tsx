"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { TopicStat } from "@/lib/analytics"

const config = {
  rounds: { label: "Rounds", color: "var(--chart-1)" },
} satisfies ChartConfig

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`
}

export function TopicBreakdown({ topics }: { topics: TopicStat[] }) {
  if (topics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Topic breakdown</CardTitle>
          <CardDescription>Rounds played per topic in the selected range</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">No rounds recorded in this range.</p>
        </CardContent>
      </Card>
    )
  }

  // Use the top entries for the chart; keep labels short so the axis stays readable.
  const chartData = topics.slice(0, 8).map((t) => ({
    topic: t.topic.length > 22 ? `${t.topic.slice(0, 21)}…` : t.topic,
    rounds: t.rounds,
  }))
  const chartHeight = Math.max(220, chartData.length * 38)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Topic breakdown</CardTitle>
        <CardDescription>Most-played topics in the selected range</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ChartContainer config={config} className="w-full" style={{ height: chartHeight }}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="topic"
              tickLine={false}
              axisLine={false}
              width={140}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="rounds" fill="var(--color-rounds)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Topic</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Rounds</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map((t, i) => (
                <TableRow key={`${t.topic}-${i}`}>
                  <TableCell className="font-medium">
                    <span className="line-clamp-1 max-w-[220px]">{t.topic}</span>
                  </TableCell>
                  <TableCell>
                    {t.category ? (
                      <Badge variant="secondary" className="font-normal">
                        {t.category}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{t.rounds.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.sessions.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{pct(t.share)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
