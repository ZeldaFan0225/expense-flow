import {auth} from "@/lib/auth-server"
import {NextResponse} from "next/server"
import {listExpenses} from "@/lib/services/expense-service"
import {listIncomeForRange} from "@/lib/services/income-service"

export async function GET(req: Request) {
    const session = await auth()
    if (!session?.user) {
        return new Response("Unauthorized", {status: 401})
    }

    const {searchParams} = new URL(req.url)
    const category = searchParams.get("category")
    const type = searchParams.get("type")
    const preset = searchParams.get("preset") ?? "6m"

    if (!category || !type) {
        return new Response("Missing category or type", {status: 400})
    }

    const now = new Date()
    let start: Date
    const end = new Date()

    switch (preset) {
        case "month":
            start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
            break
        case "3m":
            start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
            break
        case "6m":
            start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
            break
        case "12m":
            start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
            break
        case "ytd":
            start = new Date(now.getFullYear(), 0, 1)
            break
        default:
            start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
    }

    try {
        if (type === "income") {
            const allIncomes = await listIncomeForRange(session.user.id, {start, end})
            if (category === "Recurring") {
                const incomes = allIncomes.filter(
                    (income) => !!income.recurringSourceId
                )
                return NextResponse.json(incomes)
            } else if (category === "One-time") {
                const incomes = allIncomes.filter(
                    (income) => !income.recurringSourceId
                )
                return NextResponse.json(incomes)
            }
            return NextResponse.json([])
        } else if (type === "expense") {
            const expenses = await listExpenses(session.user.id, {start, end})
            const filteredExpenses = expenses.filter(
                (expense) => expense.category?.name === category
            )
            return NextResponse.json(filteredExpenses)
        }

        return new Response("Invalid type", {status: 400})
    } catch (error) {
        console.error(error)
        return new Response("An error occurred", {status: 500})
    }
}
