export const RANGE_PRESETS = [
  { value: "7d", label: "Last 7 days", short: "7d", days: 7 },
  { value: "30d", label: "Last 30 days", short: "30d", days: 30 },
  { value: "90d", label: "Last 90 days", short: "90d", days: 90 },
  { value: "all", label: "All time", short: "All", days: 0 },
] as const

export type RangePreset = (typeof RANGE_PRESETS)[number]["value"]

export const DEFAULT_PRESET: RangePreset = "30d"

export function resolveRange(preset?: string | null): { value: RangePreset; days: number; label: string } {
  const found = RANGE_PRESETS.find((r) => r.value === preset)
  const p = found ?? RANGE_PRESETS.find((r) => r.value === DEFAULT_PRESET)!
  return { value: p.value, days: p.days, label: p.label }
}
