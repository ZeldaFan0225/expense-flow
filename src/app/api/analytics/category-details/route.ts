import {auth} from "@/lib/auth-server"
import {NextResponse} from "next/server"
import {listExpenses} from "@/lib/services/expense-service"
import {listIncomeForRange} from "@/lib/services/income-service"
import {resolveRange, type RangePreset} from "@/lib/time";
import {getCategoryByName} from "@/lib/services/category-service";

export async function GET(req: Request) {
    const session = await auth()
    if (!session?.user) {
        return new Response("Unauthorized", {status: 401})
    }

    const {searchParams} = new URL(req.url)
    const categoryName = searchParams.get("category")
    const type = searchParams.get("type")
    const preset = (searchParams.get("preset") ?? "6m") as RangePreset
    const startParam = searchParams.get("start")
    const endParam = searchParams.get("end")
    const customStart = startParam ? new Date(startParam) : undefined
    const customEnd = endParam ? new Date(endParam) : undefined

    if (!categoryName || !type) {
        return new Response("Missing category or type", {status: 400})
    }

    const {start, end} = resolveRange({preset, start: customStart, end: customEnd})

    try {
        if (type === "income") {
            const allIncomes = await listIncomeForRange(session.user.id, {start, end})
            if (categoryName === "Income") {
                return NextResponse.json(allIncomes)
            }
            if (categoryName === "Recurring income") {
                const incomes = allIncomes.filter(
                    (income) => !!income.recurringSourceId
                )
                return NextResponse.json(incomes)
            } else if (categoryName === "One-time income") {
                const incomes = allIncomes.filter(
                    (income) => !income.recurringSourceId
                )
                return NextResponse.json(incomes)
            }
            return NextResponse.json([])
        } else if (type === "expense") {
            if (categoryName === "Spending") {
                const expenses = await listExpenses(session.user.id, {start, end})
                return NextResponse.json(expenses)
            }

            const category = await getCategoryByName(session.user.id, categoryName)
            if (!category) {
                return NextResponse.json([])
            }

            const expenses = await listExpenses(session.user.id, {start, end, categoryId: category.id})
            return NextResponse.json(expenses)
        }

        return new Response("Invalid type", {status: 400})
    } catch (error) {
        console.error(error)
        return new Response("An error occurred", {status: 500})
    }
}
