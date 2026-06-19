"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart"

const config = {
  active: { label: "Active users", color: "var(--chart-1)" },
  signups: { label: "New signups", color: "var(--chart-3)" },
} satisfies ChartConfig

export function UsersActivityChart({ data }: { data: { date: string; signups: number; active: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User activity</CardTitle>
        <CardDescription>Active users and new signups over the selected range</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[280px] w-full">
          <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="fillActive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-active)" stopOpacity={0.5} />
                <stop offset="95%" stopColor="var(--color-active)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="fillSignups" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-signups)" stopOpacity={0.5} />
                <stop offset="95%" stopColor="var(--color-signups)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area dataKey="active" type="monotone" stroke="var(--color-active)" fill="url(#fillActive)" strokeWidth={2} />
            <Area dataKey="signups" type="monotone" stroke="var(--color-signups)" fill="url(#fillSignups)" strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
