import { auth } from "@/lib/auth-server"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import {
  ensureDefaultCategories,
  listCategories,
} from "@/lib/services/category-service"
import { CategoryManager } from "@/components/categories/category-manager"

export const dynamic = "force-dynamic"

export default async function CategoriesPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  await ensureDefaultCategories(session.user.id)
  const categories = await listCategories(session.user.id)

  return (
    <DashboardShell
      heading="Categories"
      description="Color-code spend buckets for analytics."
      user={session.user}
    >
      <CategoryManager categories={categories} />
    </DashboardShell>
  )
}
