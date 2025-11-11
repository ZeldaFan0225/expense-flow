import type { Category, Expense, ExpenseGroup } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  bulkExpenseSchema,
  expenseSchema,
} from "@/lib/validation"
import {
  decryptNumber,
  decryptString,
  encryptNumber,
  encryptString,
  serializeEncrypted,
} from "@/lib/encryption"
import { materializeRecurringExpenses } from "@/lib/recurring"

type ExpenseWithRelations = Expense & {
  category: Category | null
  group: ExpenseGroup | null
}

function mapExpense(record: ExpenseWithRelations) {
  return {
    id: record.id,
    occurredOn: record.occurredOn,
    category: record.category,
    recurringSourceId: record.recurringSourceId,
    amount: decryptNumber(record.amountEncrypted),
    impactAmount: decryptNumber(record.impactAmountEncrypted),
    description: decryptString(record.descriptionEncrypted),
    group: record.group
      ? {
          id: record.group.id,
          title: decryptString(record.group.titleEncrypted),
          notes: decryptString(record.group.notesEncrypted),
          splitBy: record.group.splitBy,
        }
      : null,
  }
}

export async function listExpenses(
  userId: string,
  params: { start?: Date; end?: Date; take?: number } = {}
) {
  await materializeRecurringExpenses(userId)
  const { start, end, take = 200 } = params
  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      occurredOn: {
        gte: start,
        lte: end,
      },
    },
    orderBy: { occurredOn: "desc" },
    take,
    include: {
      category: true,
      group: true,
    },
  })

  return expenses.map(mapExpense)
}

export async function getExpense(userId: string, id: string) {
  const expense = await prisma.expense.findFirst({
    where: { id, userId },
    include: { category: true, group: true },
  })
  if (!expense) return null
  return mapExpense(expense)
}

export async function createExpense(userId: string, payload: unknown) {
  const data = expenseSchema.parse(payload)
  const created = await prisma.expense.create({
    data: {
      userId,
      occurredOn: data.occurredOn,
      categoryId: data.categoryId,
      amountEncrypted: serializeEncrypted(encryptNumber(data.amount)),
      impactAmountEncrypted: serializeEncrypted(
        encryptNumber(data.impactAmount ?? data.amount)
      ),
      descriptionEncrypted: serializeEncrypted(
        encryptString(data.description)
      ),
    },
    include: { category: true, group: true },
  })
  return mapExpense(created)
}

export async function updateExpense(userId: string, id: string, payload: unknown) {
  const data = expenseSchema.partial().parse(payload)

  await prisma.expense.findFirstOrThrow({
    where: { id, userId },
  })

  const updated = await prisma.expense.update({
    where: { id },
    data: {
      occurredOn: data.occurredOn,
      categoryId: data.categoryId,
      amountEncrypted:
        data.amount !== undefined
          ? serializeEncrypted(encryptNumber(data.amount))
          : undefined,
      impactAmountEncrypted:
        data.impactAmount !== undefined
          ? serializeEncrypted(encryptNumber(data.impactAmount))
          : undefined,
      descriptionEncrypted: data.description
        ? serializeEncrypted(encryptString(data.description))
        : undefined,
    },
    include: {
      category: true,
      group: true,
    },
  })

  return mapExpense(updated)
}

export async function deleteExpense(userId: string, id: string) {
  await prisma.expense.findFirstOrThrow({
    where: { id, userId },
  })
  await prisma.expense.delete({
    where: { id },
  })
}

export async function bulkCreateExpenses(userId: string, payload: unknown) {
  const data = bulkExpenseSchema.parse(payload)

  if (!data.items.length) return []

  const group = data.group
    ? await prisma.expenseGroup.create({
        data: {
          userId,
          splitBy: data.group.splitBy,
          titleEncrypted: serializeEncrypted(
            encryptString(data.group.title)
          ),
          notesEncrypted: data.group.notes
            ? serializeEncrypted(encryptString(data.group.notes))
            : undefined,
        },
      })
    : null

  const created = await prisma.$transaction(
    data.items.map((item) =>
      prisma.expense.create({
        data: {
          userId,
          occurredOn: item.occurredOn,
          categoryId: item.categoryId,
          groupId: group?.id,
          amountEncrypted: serializeEncrypted(encryptNumber(item.amount)),
          impactAmountEncrypted: serializeEncrypted(
            encryptNumber(item.impactAmount ?? item.amount)
          ),
          descriptionEncrypted: serializeEncrypted(
            encryptString(item.description)
          ),
        },
        include: { category: true, group: true },
      })
    )
  )

  return created.map(mapExpense)
}

export async function summarizeExpenses(userId: string, start: Date, end: Date) {
  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      occurredOn: { gte: start, lte: end },
    },
  })

  return expenses.reduce(
    (acc, expense) => acc + decryptNumber(expense.impactAmountEncrypted),
    0
  )
}

export async function getExpenseSuggestions(userId: string, take = 5) {
  const expenses = await prisma.expense.findMany({
    where: { userId },
    orderBy: { occurredOn: "desc" },
    take: 50,
  })

  const uniqueDescriptions = Array.from(
    new Set(expenses.map((expense) => decryptString(expense.descriptionEncrypted)))
  )

  return uniqueDescriptions.slice(0, take)
}

export async function suggestCategoryForDescription(
  userId: string,
  description: string
) {
  const normalized = description.toLowerCase().trim()
  if (!normalized) return null

  const expenses = await prisma.expense.findMany({
    where: { userId, categoryId: { not: null } },
    include: { category: true },
    orderBy: { occurredOn: "desc" },
    take: 200,
  })

  const tokens = normalized.split(/\s+/).filter(Boolean)
  if (!tokens.length) return null

  let best: { categoryId: string; categoryName: string; score: number } | null = null
  for (const expense of expenses) {
    if (!expense.category) continue
    const descriptionText = decryptString(expense.descriptionEncrypted).toLowerCase()
    const descriptionTokens = descriptionText.split(/\s+/)
    let score = 0
    for (const token of tokens) {
      if (descriptionTokens.includes(token)) score += 2
      if (descriptionText.startsWith(token)) score += 1
      if (descriptionText.includes(token)) score += 0.5
    }
    if (!best || score > best.score) {
      best = {
        categoryId: expense.category.id,
        categoryName: expense.category.name,
        score,
      }
    }
  }

  return best
}
