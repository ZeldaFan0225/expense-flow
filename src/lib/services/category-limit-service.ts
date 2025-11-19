import {startOfMonth, endOfMonth, format} from "date-fns"
import type {Prisma} from "@prisma/client"
import {prisma} from "@/lib/prisma"
import {encryptNumber, decryptNumber, serializeEncrypted} from "@/lib/encryption"
import {calculateImpactShare} from "@/lib/expense-shares"

type CategoryLimitRecord = Prisma.CategoryLimitGetPayload<{ include: { category: true } }>

export type CategoryLimitSummary = {
    id: string
    categoryId: string
    categoryName: string
    color: string
    limit: number
}

export type CategoryLimitReportRow = CategoryLimitSummary & {
    spent: number
    variance: number
    status: "over" | "under"
}

export type CategoryLimitReport = {
    month: string
    rows: CategoryLimitReportRow[]
    totals: {
        limit: number
        spent: number
        overage: number
    }
}

function mapLimit(record: CategoryLimitRecord): CategoryLimitSummary {
    return {
        id: record.id,
        categoryId: record.categoryId,
        categoryName: record.category.name,
        color: record.category.color,
        limit: decryptNumber(record.limitAmountEncrypted, 0),
    }
}

export async function listCategoryLimits(userId: string) {
    const limits = await prisma.categoryLimit.findMany({
        where: {userId},
        include: {category: true},
        orderBy: {category: {name: "asc"}},
    })
    return limits.map(mapLimit)
}

export async function upsertCategoryLimit(
    userId: string,
    input: {categoryId: string; limit: number}
) {
    const categoryExists = await prisma.category.count({
        where: {id: input.categoryId, userId},
    })
    if (categoryExists === 0) {
        throw new Error("Category not found")
    }
    const encrypted = serializeEncrypted(encryptNumber(input.limit))
    const limit = await prisma.categoryLimit.upsert({
        where: {
            userId_categoryId: {
                userId,
                categoryId: input.categoryId,
            },
        },
        update: {
            limitAmountEncrypted: encrypted,
        },
        create: {
            userId,
            categoryId: input.categoryId,
            limitAmountEncrypted: encrypted,
        },
        include: {category: true},
    })
    return mapLimit(limit)
}

export async function deleteCategoryLimit(userId: string, id: string) {
    const result = await prisma.categoryLimit.deleteMany({
        where: {id, userId},
    })
    if (result.count === 0) {
        throw new Error("Limit not found")
    }
}

export async function getCategoryLimitReport(userId: string, month = new Date()): Promise<CategoryLimitReport> {
    const [limits, expenses] = await Promise.all([
        prisma.categoryLimit.findMany({
            where: {userId},
            include: {category: true},
        }),
        prisma.expense.findMany({
            where: {
                userId,
                occurredOn: {
                    gte: startOfMonth(month),
                    lte: endOfMonth(month),
                },
            },
            include: {category: true, group: true},
        }),
    ])

    const spendByCategory = expenses.reduce<Record<string, number>>((acc, expense) => {
        const categoryId = expense.categoryId ?? "uncategorized"
        const amount = decryptNumber(expense.amountEncrypted)
        const splitBy = expense.group?.splitBy ?? expense.splitBy ?? 1
        acc[categoryId] = (acc[categoryId] ?? 0) + calculateImpactShare(amount, splitBy)
        return acc
    }, {})

    const rows: CategoryLimitReportRow[] = limits.map((limit) => {
        const spent = spendByCategory[limit.categoryId] ?? 0
        const limitValue = decryptNumber(limit.limitAmountEncrypted, 0)
        const variance = spent - limitValue
        return {
            id: limit.id,
            categoryId: limit.categoryId,
            categoryName: limit.category.name,
            color: limit.category.color,
            limit: limitValue,
            spent,
            variance,
            status: variance > 0 ? "over" : "under",
        }
    })

    const totals = rows.reduce(
        (acc, row) => {
            acc.limit += row.limit
            acc.spent += row.spent
            if (row.variance > 0) {
                acc.overage += row.variance
            }
            return acc
        },
        {limit: 0, spent: 0, overage: 0}
    )

    return {
        month: format(startOfMonth(month), "yyyy-MM"),
        rows,
        totals,
    }
}
