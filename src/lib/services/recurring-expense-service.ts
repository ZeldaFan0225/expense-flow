import type { RecurringExpense } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  decryptNumber,
  decryptString,
  encryptNumber,
  encryptString,
  serializeEncrypted,
} from "@/lib/encryption"
import { recurringExpenseSchema } from "@/lib/validation"

function mapTemplate(template: RecurringExpense) {
  return {
    id: template.id,
    categoryId: template.categoryId,
    dueDayOfMonth: template.dueDayOfMonth,
    splitBy: template.splitBy,
    isActive: template.isActive,
    lastGeneratedOn: template.lastGeneratedOn,
    amount: decryptNumber(template.amountEncrypted),
    description: decryptString(template.descriptionEncrypted),
  }
}

export async function listRecurringExpenses(userId: string) {
  const templates = await prisma.recurringExpense.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })
  return templates.map(mapTemplate)
}

export async function createRecurringExpense(userId: string, payload: unknown) {
  const data = recurringExpenseSchema.parse(payload)
  const created = await prisma.recurringExpense.create({
    data: {
      userId,
      categoryId: data.categoryId,
      dueDayOfMonth: data.dueDayOfMonth,
      splitBy: data.splitBy,
      amountEncrypted: serializeEncrypted(encryptNumber(data.amount)),
      descriptionEncrypted: serializeEncrypted(
        encryptString(data.description)
      ),
    },
  })
  return mapTemplate(created)
}

export async function updateRecurringExpense(
  userId: string,
  id: string,
  payload: unknown
) {
  const data = recurringExpenseSchema.partial().parse(payload)
  await prisma.recurringExpense.findFirstOrThrow({
    where: { id, userId },
  })

  const updated = await prisma.recurringExpense.update({
    where: { id },
    data: {
      categoryId: data.categoryId,
      dueDayOfMonth: data.dueDayOfMonth,
      splitBy: data.splitBy,
      amountEncrypted: data.amount
        ? serializeEncrypted(encryptNumber(data.amount))
        : undefined,
      descriptionEncrypted: data.description
        ? serializeEncrypted(encryptString(data.description))
        : undefined,
      isActive: data.isActive,
    },
  })
  return mapTemplate(updated)
}

export async function toggleRecurringExpense(userId: string, id: string) {
  const template = await prisma.recurringExpense.findFirstOrThrow({
    where: { id, userId },
  })
  const updated = await prisma.recurringExpense.update({
    where: { id },
    data: { isActive: !template.isActive },
  })
  return mapTemplate(updated)
}

export async function deleteRecurringExpense(userId: string, id: string) {
  await prisma.recurringExpense.findFirstOrThrow({
    where: { id, userId },
  })
  await prisma.recurringExpense.delete({
    where: { id },
  })
}
