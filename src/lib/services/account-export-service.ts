import JSZip from "jszip"
import {prisma} from "@/lib/prisma"
import {decryptNumber, decryptString} from "@/lib/encryption"
import {calculateImpactShare} from "@/lib/expense-shares"

type AccountExportArchive = {
    filename: string
    buffer: ArrayBuffer
    counts: Record<string, number>
}

function formatOptionalDate(value?: Date | null) {
    return value ? value.toISOString() : null
}

function normalizeText(value: string) {
    return value.length ? value : null
}

function addJsonFile(zip: JSZip, filename: string, data: unknown) {
    zip.file(filename, JSON.stringify(data, null, 2))
}

export async function buildAccountExportArchive(userId: string): Promise<AccountExportArchive> {
    const user = await prisma.user.findUnique({
        where: {id: userId},
        select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            image: true,
            defaultCurrency: true,
            themePreference: true,
            accentColor: true,
            onboardingCompleted: true,
            encryptionKeyVersion: true,
            createdAt: true,
            updatedAt: true,
        },
    })

    if (!user) {
        throw new Error("User not found")
    }

    const [
        accounts,
        categories,
        categoryLimits,
        expenseGroups,
        expenses,
        recurringExpenses,
        incomes,
        recurringIncomes,
        monthlyOverrides,
        apiKeys,
        importSchedules,
    ] = await Promise.all([
        prisma.account.findMany({where: {userId}}),
        prisma.category.findMany({
            where: {userId},
            orderBy: {name: "asc"},
        }),
        prisma.categoryLimit.findMany({
            where: {userId},
            include: {category: true},
        }),
        prisma.expenseGroup.findMany({
            where: {userId},
            orderBy: {createdAt: "asc"},
        }),
        prisma.expense.findMany({
            where: {userId},
            include: {
                category: true,
                group: true,
            },
            orderBy: {occurredOn: "desc"},
        }),
        prisma.recurringExpense.findMany({
            where: {userId},
            include: {category: true},
            orderBy: {createdAt: "asc"},
        }),
        prisma.income.findMany({
            where: {userId},
            include: {recurringSource: true},
            orderBy: {occurredOn: "desc"},
        }),
        prisma.recurringIncome.findMany({
            where: {userId},
            orderBy: {createdAt: "asc"},
        }),
        prisma.monthlyIncomeOverride.findMany({
            where: {userId},
            orderBy: {month: "desc"},
        }),
        prisma.apiKey.findMany({
            where: {userId},
            orderBy: {createdAt: "desc"},
        }),
        prisma.importSchedule.findMany({
            where: {userId},
            orderBy: {createdAt: "desc"},
        }),
    ])

    const userData = {
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        emailVerified: formatOptionalDate(user.emailVerified),
    }

    const accountsData = accounts.map((account) => ({
        id: account.id,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refreshToken: account.refresh_token,
        accessToken: account.access_token,
        expiresAt: account.expires_at,
        tokenType: account.token_type,
        scope: account.scope,
        idToken: account.id_token,
        sessionState: account.session_state,
    }))

    const categoriesData = categories.map((category) => ({
        id: category.id,
        name: category.name,
        color: category.color,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
    }))

    const categoryLimitsData = categoryLimits.map((limit) => ({
        id: limit.id,
        categoryId: limit.categoryId,
        categoryName: limit.category.name,
        categoryColor: limit.category.color,
        limit: decryptNumber(limit.limitAmountEncrypted),
        createdAt: limit.createdAt.toISOString(),
        updatedAt: limit.updatedAt.toISOString(),
    }))

    const expenseGroupsData = expenseGroups.map((group) => ({
        id: group.id,
        title: decryptString(group.titleEncrypted),
        notes: normalizeText(decryptString(group.notesEncrypted)),
        splitBy: group.splitBy ?? 1,
        createdAt: group.createdAt.toISOString(),
        updatedAt: group.updatedAt.toISOString(),
    }))

    const expensesData = expenses.map((expense) => {
        const amount = decryptNumber(expense.amountEncrypted)
        const splitBy = expense.group?.splitBy ?? expense.splitBy ?? 1
        const impactAmount = calculateImpactShare(amount, splitBy)
        return {
            id: expense.id,
            amount,
            impactAmount,
            description: decryptString(expense.descriptionEncrypted),
            occurredOn: expense.occurredOn.toISOString(),
            categoryId: expense.categoryId,
            categoryName: expense.category?.name ?? null,
            categoryColor: expense.category?.color ?? null,
            splitBy,
            groupId: expense.groupId,
            recurringSourceId: expense.recurringSourceId,
            createdAt: expense.createdAt.toISOString(),
            updatedAt: expense.updatedAt.toISOString(),
        }
    })

    const recurringExpensesData = recurringExpenses.map((record) => ({
        id: record.id,
        amount: decryptNumber(record.amountEncrypted),
        description: decryptString(record.descriptionEncrypted),
        dueDayOfMonth: record.dueDayOfMonth,
        splitBy: record.splitBy,
        isActive: record.isActive,
        categoryId: record.categoryId,
        categoryName: record.category?.name ?? null,
        categoryColor: record.category?.color ?? null,
        lastGeneratedOn: formatOptionalDate(record.lastGeneratedOn),
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
    }))

    const incomesData = incomes.map((income) => ({
        id: income.id,
        amount: decryptNumber(income.amountEncrypted),
        description: decryptString(income.descriptionEncrypted),
        occurredOn: income.occurredOn.toISOString(),
        recurringSourceId: income.recurringSourceId,
        createdAt: income.createdAt.toISOString(),
        updatedAt: income.updatedAt.toISOString(),
    }))

    const recurringIncomesData = recurringIncomes.map((record) => ({
        id: record.id,
        amount: decryptNumber(record.amountEncrypted),
        description: decryptString(record.descriptionEncrypted),
        dueDayOfMonth: record.dueDayOfMonth,
        isActive: record.isActive,
        lastGeneratedOn: formatOptionalDate(record.lastGeneratedOn),
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
    }))

    const monthlyOverridesData = monthlyOverrides.map((override) => ({
        id: override.id,
        month: override.month.toISOString(),
        amount: decryptNumber(override.amountEncrypted),
        createdAt: override.createdAt.toISOString(),
        updatedAt: override.updatedAt.toISOString(),
    }))

    const apiKeysData = apiKeys.map((key) => ({
        id: key.id,
        prefix: key.prefix,
        hashedSecret: key.hashedSecret,
        scopes: key.scopes,
        expiresAt: formatOptionalDate(key.expiresAt),
        revokedAt: formatOptionalDate(key.revokedAt),
        createdAt: key.createdAt.toISOString(),
        tokenLastUsedAt: formatOptionalDate(key.tokenLastUsedAt),
        description: key.description,
    }))

    const importSchedulesData = importSchedules.map((schedule) => ({
        id: schedule.id,
        name: schedule.name,
        mode: schedule.mode,
        template: schedule.template,
        frequency: schedule.frequency,
        sourceUrl: schedule.sourceUrl,
        lastRunAt: formatOptionalDate(schedule.lastRunAt),
        nextRunAt: formatOptionalDate(schedule.nextRunAt),
        createdAt: schedule.createdAt.toISOString(),
        updatedAt: schedule.updatedAt.toISOString(),
    }))

    const counts = {
        accounts: accountsData.length,
        categories: categoriesData.length,
        categoryLimits: categoryLimitsData.length,
        expenseGroups: expenseGroupsData.length,
        expenses: expensesData.length,
        recurringExpenses: recurringExpensesData.length,
        incomes: incomesData.length,
        recurringIncomes: recurringIncomesData.length,
        monthlyIncomeOverrides: monthlyOverridesData.length,
        apiKeys: apiKeysData.length,
        importSchedules: importSchedulesData.length,
    }

    const metadata = {
        version: 1,
        generatedAt: new Date().toISOString(),
        userId,
        counts,
    }

    const zip = new JSZip()
    addJsonFile(zip, "metadata.json", metadata)

    const dataFolder = zip.folder("data")
    if (!dataFolder) {
        throw new Error("Unable to create archive structure")
    }

    addJsonFile(dataFolder, "user.json", userData)
    addJsonFile(dataFolder, "accounts.json", accountsData)
    addJsonFile(dataFolder, "categories.json", categoriesData)
    addJsonFile(dataFolder, "category-limits.json", categoryLimitsData)
    addJsonFile(dataFolder, "expense-groups.json", expenseGroupsData)
    addJsonFile(dataFolder, "expenses.json", expensesData)
    addJsonFile(dataFolder, "recurring-expenses.json", recurringExpensesData)
    addJsonFile(dataFolder, "income.json", incomesData)
    addJsonFile(dataFolder, "recurring-income.json", recurringIncomesData)
    addJsonFile(dataFolder, "monthly-income-overrides.json", monthlyOverridesData)
    addJsonFile(dataFolder, "api-keys.json", apiKeysData)
    addJsonFile(dataFolder, "import-schedules.json", importSchedulesData)

    const stamp = metadata.generatedAt.replace(/[:.]/g, "-")
    const filename = `expense-flow-account-export-${stamp}.zip`
    const buffer = await zip.generateAsync({
        type: "arraybuffer",
        compression: "DEFLATE",
        compressionOptions: {level: 9},
    })

    return {filename, buffer, counts}
}
