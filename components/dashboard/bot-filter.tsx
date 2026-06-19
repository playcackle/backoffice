"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Bot, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const OPTIONS = [
  { value: "exclude", label: "Humans only", short: "Humans" },
  { value: "include", label: "Include bots", short: "All" },
] as const

export function BotFilter({ excludeBots }: { excludeBots: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const current = excludeBots ? "exclude" : "include"

  function select(value: string) {
    if (value === current) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("bots", value)
    startTransition(() => {
      router.replace(`/?${params.toString()}`, { scroll: false })
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Bot className="h-4 w-4" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">Bot data</span>
      </span>
      <div
        role="group"
        aria-label="Filter bot activity"
        className="inline-flex items-center rounded-lg border bg-card p-0.5"
      >
        {OPTIONS.map((opt) => {
          const active = opt.value === current
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => select(opt.value)}
              aria-pressed={active}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="hidden sm:inline">{opt.label}</span>
              <span className="sm:hidden">{opt.short}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
