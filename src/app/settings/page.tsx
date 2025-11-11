import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-server"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { UserSettingsForm } from "@/components/settings/user-settings-form"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  return (
    <DashboardShell
      heading="Settings"
      description="Manage currency formatting and accent colors."
      user={session.user}
    >
      <UserSettingsForm
        defaultCurrency={session.user.defaultCurrency}
        accentColor={session.user.accentColor}
      />
    </DashboardShell>
  )
}
