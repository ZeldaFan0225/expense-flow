import { CheckCircle, Circle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export type ChecklistItem = {
  id: string
  label: string
  description: string
  href: string
  completed: boolean
}

type OnboardingChecklistProps = {
  items: ChecklistItem[]
}

export function OnboardingChecklist({ items }: OnboardingChecklistProps) {
  const remaining = items.filter((item) => !item.completed)
  if (!remaining.length) return null

  return (
    <Card className="rounded-3xl border-dashed">
      <CardHeader>
        <CardTitle>Finish onboarding</CardTitle>
        <p className="text-sm text-muted-foreground">
          Complete these flows to unlock the full analytics toolkit.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-2xl border px-3 py-2"
          >
            <div className="flex items-center gap-3">
              {item.completed ? (
                <CheckCircle className="size-4 text-emerald-500" />
              ) : (
                <Circle className="size-4 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
            {item.completed ? (
              <span className="text-xs text-muted-foreground">Done</span>
            ) : (
              <Button asChild size="sm" variant="ghost">
                <a href={item.href}>Start</a>
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
