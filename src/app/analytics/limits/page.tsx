import {auth} from "@/lib/auth-server"
import {redirect} from "next/navigation"
import {DashboardShell} from "@/components/layout/dashboard-shell"
import {requireOnboardingCompletion} from "@/lib/onboarding"
import {ensureDefaultCategories, listCategories} from "@/lib/services/category-service"
import {getCategoryLimitReport} from "@/lib/services/category-limit-service"
import {CategoryLimitPlanner} from "@/components/analytics/category-limit-planner"
import {GuidedSteps} from "@/components/guided-steps"

export const dynamic = "force-dynamic"

export default async function CategoryLimitPage() {
    const session = await auth()
    if (!session?.user) {
        redirect("/")
    }

    requireOnboardingCompletion(session)

    await ensureDefaultCategories(session.user.id)

    const [categories, report] = await Promise.all([
        listCategories(session.user.id),
        getCategoryLimitReport(session.user.id),
    ])

    return (
        <DashboardShell
            heading="Category limits"
            description="Define guardrails for each spending bucket and spot overruns instantly."
            user={session.user}
        >
            <GuidedSteps
                storageKey="category-limits-guided"
                steps={[
                    {
                        title: "Pick a category",
                        description: "Attach a monthly ceiling to every category that needs extra scrutiny.",
                    },
                    {
                        title: "Watch the bars",
                        description: "We plot spend vs. limit so you can see which buckets are heating up.",
                    },
                    {
                        title: "Adjust anytime",
                        description: "Update limits on the fly as budgets change—everything encrypts at rest.",
                    },
                ]}
            />
            <CategoryLimitPlanner
                categories={categories}
                initialReport={report}
                currency={session.user.defaultCurrency ?? "USD"}
            />
        </DashboardShell>
    )
}
