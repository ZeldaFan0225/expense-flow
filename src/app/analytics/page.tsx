import { auth } from "@/lib/auth-server"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import {
  getAvailableBalanceSeries,
  getPeriodComparison,
  getForecast,
  detectSpendingAnomalies,
  getCategoryHealth,
  getIncomeFlowGraph,
} from "@/lib/services/analytics-service"
import { listCategories } from "@/lib/services/category-service"
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard"

export const dynamic = "force-dynamic"

export default async function AnalyticsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/")
  }

  const [series, comparison, forecast, anomalies, categoryHealth, incomeFlow, categories] =
    await Promise.all([
      getAvailableBalanceSeries(session.user.id),
      getPeriodComparison(session.user.id),
      getForecast(session.user.id),
      detectSpendingAnomalies(session.user.id),
      getCategoryHealth(session.user.id),
      getIncomeFlowGraph(session.user.id),
      listCategories(session.user.id),
    ])

  return (
    <DashboardShell
      heading="Analytics"
      description="Trend cash flow, compare months, and export CSV."
      user={session.user}
    >
      <AnalyticsDashboard
        initialSeries={series.series}
        initialComparison={comparison}
        initialForecast={forecast}
        initialAnomalies={anomalies}
        initialCategoryHealth={categoryHealth}
        initialIncomeFlow={incomeFlow}
        categories={categories}
        currency={session.user.defaultCurrency}
      />
    </DashboardShell>
  )
}
