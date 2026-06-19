"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { CalendarRange, Loader2 } from "lucide-react"
import { RANGE_PRESETS, type RangePreset } from "@/lib/date-range"
import { cn } from "@/lib/utils"

export function DateRangeFilter({ value }: { value: RangePreset }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function select(preset: RangePreset) {
    if (preset === value) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("range", preset)
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
          <CalendarRange className="h-4 w-4" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">Date range</span>
      </span>
      <div
        role="group"
        aria-label="Select date range"
        className="inline-flex items-center rounded-lg border bg-card p-0.5"
      >
        {RANGE_PRESETS.map((preset) => {
          const active = preset.value === value
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => select(preset.value)}
              aria-pressed={active}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="hidden sm:inline">{preset.label}</span>
              <span className="sm:hidden">{preset.short}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
