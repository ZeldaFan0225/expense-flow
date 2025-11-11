import { redirect } from "next/navigation"

import { auth } from "@/lib/auth-server"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { FeedTimeline } from "@/components/feed/feed-timeline"
import { getAutomationActivityFeed } from "@/lib/services/feed-service"

export const dynamic = "force-dynamic"

export default async function AutomationFeedPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  const feed = await getAutomationActivityFeed(session.user.id)

  return (
    <DashboardShell
      heading="Automation feed"
      description="Keep tabs on API keys, recurring templates, and import schedules."
      user={session.user}
    >
      <FeedTimeline
        feed={feed}
        currency={session.user.defaultCurrency}
        title="Automation activity"
        description="API keys, recurring templates, and import schedules in chronological order."
        emptyState="No automation events yet. Create an API key or schedule to populate this feed."
      />
    </DashboardShell>
  )
}
