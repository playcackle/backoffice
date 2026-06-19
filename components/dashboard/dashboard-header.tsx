import { BarChart3, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { logout } from "@/app/login/actions"

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BarChart3 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">Cackle Back Office</span>
            <span className="text-xs text-muted-foreground">Player & game analytics</span>
          </div>
        </div>
        <form action={logout}>
          <Button variant="outline" size="sm" type="submit">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </form>
      </div>
    </header>
  )
}
