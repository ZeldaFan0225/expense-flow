import {auth} from "@/lib/auth-server"
import {redirect} from "next/navigation"
import {DashboardShell} from "@/components/layout/dashboard-shell"
import {listCategories} from "@/lib/services/category-service"
import {requireOnboardingCompletion} from "@/lib/onboarding"
import {ScenarioPlanner} from "@/components/analytics/scenario-planner"

export const dynamic = "force-dynamic"

export default async function ScenarioPlannerPage() {
    const session = await auth()
    if (!session?.user) {
        redirect("/")
    }

    requireOnboardingCompletion(session)

    const categories = await listCategories(session.user.id)

    return (
        <DashboardShell
            heading="Scenario Planner"
            description="Simulate income or category adjustments."
            user={session.user}
        >
            <ScenarioPlanner
                categories={categories}
                currency={session.user.defaultCurrency}
            />
        </DashboardShell>
    )
}
