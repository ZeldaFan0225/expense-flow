import { auth } from "@/lib/auth-server"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const endpoints = [
  {
    method: "GET",
    path: "/api/expenses?start&end",
    scope: "expenses:read",
    description: "List decrypted expenses with optional date filters.",
  },
  {
    method: "POST",
    path: "/api/expenses",
    scope: "expenses:write",
    description: "Create a single encrypted expense.",
  },
  {
    method: "POST",
    path: "/api/expenses/bulk",
    scope: "expenses:write",
    description: "Submit 1–20 expenses in one request (same schema as bulk builder).",
  },
  {
    method: "GET",
    path: "/api/spending?preset",
    scope: "analytics:read",
    description: "Return balance series plus comparison deltas.",
  },
  {
    method: "GET",
    path: "/api/budget?month=YYYY-MM",
    scope: "budget:read",
    description: "Monthly overview totals and remaining budget.",
  },
  {
    method: "GET",
    path: "/api/feed",
    scope: "analytics:read",
    description: "Chronological feed of expenses, income, and automations.",
  },
  {
    method: "GET",
    path: "/api/categories",
    scope: "expenses:read",
    description: "List categories (defaults auto-create on first call).",
  },
  {
    method: "POST",
    path: "/api/categories",
    scope: "expenses:write",
    description: "Create or update a category with name + color.",
  },
  {
    method: "DELETE",
    path: "/api/categories/:id",
    scope: "expenses:write",
    description: "Remove a category (reassigns expenses to uncategorized).",
  },
  {
    method: "POST",
    path: "/api/income",
    scope: "income:write",
    description: "Record income entry (session or API key).",
  },
  {
    method: "GET",
    path: "/api/income/recurring",
    scope: "income:write",
    description: "List recurring income templates (write scope needed for parity).",
  },
  {
    method: "POST",
    path: "/api/income/recurring",
    scope: "income:write",
    description: "Create or update recurring income templates.",
  },
]

export const dynamic = "force-dynamic"

export default async function DocsPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  return (
    <DashboardShell
      heading="API docs"
      description="Scopes, headers, and endpoints for integrating Expense Flow."
      user={session.user}
    >
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Supply either a session cookie (browser) or an <code>x-api-key</code>{" "}
            header with a scoped token. Rate limits: 120 requests per minute per
            user or key + path combination. Expect HTTP 429 with{" "}
            <code>Retry-After</code> when throttled.
          </p>
          <p>
            API keys are formatted as <code>exp_prefix_secret</code>. Secrets
            are hashed with bcrypt and never stored in plaintext. Revoke a key
            directly from the dashboard to invalidate immediately.
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Endpoints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {endpoints.map((endpoint) => (
            <div
              key={`${endpoint.method}-${endpoint.path}`}
              className="rounded-2xl border px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{endpoint.method}</Badge>
                <code className="text-xs">{endpoint.path}</code>
                <Badge variant="outline">{endpoint.scope}</Badge>
              </div>
              <p className="mt-2 text-muted-foreground">
                {endpoint.description}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </DashboardShell>
  )
}
