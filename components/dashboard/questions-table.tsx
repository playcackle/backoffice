"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { QuestionStat } from "@/lib/analytics"

function pct(n: number) {
  return `${(n * 100).toFixed(0)}%`
}

function QuestionTable({ rows, metric }: { rows: QuestionStat[]; metric: "fail" | "claim" | "attempts" }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Question</TableHead>
            <TableHead className="text-right">Attempts</TableHead>
            <TableHead className="text-right">Unique players</TableHead>
            <TableHead className="text-right">Fail rate</TableHead>
            <TableHead className="text-right">Claim rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                Not enough question data yet.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((q, i) => (
              <TableRow key={`${q.text}-${i}`}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span className="line-clamp-1 max-w-[240px]">{q.text}</span>
                    {q.isRare ? (
                      <Badge variant="secondary" className="shrink-0">
                        Rare
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{q.attempts.toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums">{q.uniqueAttemptors.toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className={metric === "fail" ? "font-semibold text-destructive" : ""}>{pct(q.failRate)}</span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className={metric === "claim" ? "font-semibold text-primary" : ""}>{pct(q.claimRate)}</span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export function QuestionsTable({
  hardest,
  easiest,
  mostAttempted,
}: {
  hardest: QuestionStat[]
  easiest: QuestionStat[]
  mostAttempted: QuestionStat[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Question performance</CardTitle>
        <CardDescription>Ranked by player accuracy and engagement across game rounds</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="hardest">
          <TabsList>
            <TabsTrigger value="hardest">Hardest</TabsTrigger>
            <TabsTrigger value="easiest">Easiest</TabsTrigger>
            <TabsTrigger value="popular">Most attempted</TabsTrigger>
          </TabsList>

          <TabsContent value="hardest" className="mt-4">
            <QuestionTable rows={hardest} metric="fail" />
          </TabsContent>
          <TabsContent value="easiest" className="mt-4">
            <QuestionTable rows={easiest} metric="claim" />
          </TabsContent>
          <TabsContent value="popular" className="mt-4">
            <QuestionTable rows={mostAttempted} metric="attempts" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
