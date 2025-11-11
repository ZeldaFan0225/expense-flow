import type { RecurringIncome } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  decryptNumber,
  decryptString,
  encryptNumber,
  encryptString,
  serializeEncrypted,
} from "@/lib/encryption"
import { recurringIncomeSchema } from "@/lib/validation"

function mapTemplate(template: RecurringIncome) {
  return {
    id: template.id,
    dueDayOfMonth: template.dueDayOfMonth,
    isActive: template.isActive,
    lastGeneratedOn: template.lastGeneratedOn,
    amount: decryptNumber(template.amountEncrypted),
    description: decryptString(template.descriptionEncrypted),
  }
}

export async function listRecurringIncomes(userId: string) {
  const templates = await prisma.recurringIncome.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })
  return templates.map(mapTemplate)
}

export async function createRecurringIncome(userId: string, payload: unknown) {
  const data = recurringIncomeSchema.parse(payload)
  const created = await prisma.recurringIncome.create({
    data: {
      userId,
      dueDayOfMonth: data.dueDayOfMonth,
      amountEncrypted: serializeEncrypted(encryptNumber(data.amount)),
      descriptionEncrypted: serializeEncrypted(
        encryptString(data.description)
      ),
    },
  })
  return mapTemplate(created)
}

export async function updateRecurringIncome(
  userId: string,
  id: string,
  payload: unknown
) {
  const data = recurringIncomeSchema.partial().parse(payload)
  await prisma.recurringIncome.findFirstOrThrow({
    where: { id, userId },
  })

  const updated = await prisma.recurringIncome.update({
    where: { id },
    data: {
      dueDayOfMonth: data.dueDayOfMonth,
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

export async function deleteRecurringIncome(userId: string, id: string) {
  await prisma.recurringIncome.findFirstOrThrow({
    where: { id, userId },
  })
  await prisma.recurringIncome.delete({
    where: { id },
  })
}
