import { auth } from "@/lib/auth-server"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { CsvImportForm } from "@/components/import/csv-import-form"
import { ImportScheduleManager } from "@/components/import/import-schedule-manager"
import { listImportSchedules } from "@/lib/services/import-service"

export const dynamic = "force-dynamic"

export default async function ImportPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  const schedules = await listImportSchedules(session.user.id)

  return (
    <DashboardShell
      heading="Import CSV"
      description="Preview, edit, and automate recurring uploads."
      user={session.user}
    >
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <CsvImportForm />
        <ImportScheduleManager initialSchedules={schedules} />
      </div>
    </DashboardShell>
  )
}
