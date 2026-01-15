
import { PrismaClient } from '@prisma/client'
import * as xlsx from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
    const exportDir = path.join(process.cwd(), 'exports')

    if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir)
    }

    console.log(`Exporting data to ${exportDir}...`)

    // List of models to export
    // We can't easily iterate Prisma.dmmf at runtime effectively without generated client internals,
    // so we'll list the key models explicitly to be safe and type-checked somewhat.
    // Order matters if we cared about dependencies, but for CSV dump it doesn't.

    const models = [
        'User',
        'Account',
        'Session',
        'VerificationToken',
        'Room',
        'RoomMember',
        'Meal',
        'Payment',
        'ShoppingItem',
        'ExtraExpense',
        'GuestMeal',
        'MarketDate',
        'AccountTransaction',
        'MealPeriod',
        'Vote',
        'Notification',
        'Invitation',
        'JoinRequest',
        'GroupMessage',
        'GroupActivityLog',
        'Announcement',
        'GroupNotificationSettings',
        'MealSettings',
        'AutoMealSettings',
        'BkashPayment',
        'InviteToken',
    ]

    for (const modelName of models) {
        try {
            console.log(`Fetching ${modelName}...`)
            // @ts-ignore - dynamic access to prisma models
            const data = await prisma[modelName.charAt(0).toLowerCase() + modelName.slice(1)].findMany()

            if (data.length === 0) {
                console.log(`No data for ${modelName}, skipping.`)
                continue
            }

            // Convert raw data to worksheet
            // Flatten objects if needed? simple JSON dump is usually enough for CSV
            // Dates to strings
            const cleanData = data.map((row: any) => {
                const newRow: any = {}
                for (const key in row) {
                    if (row[key] instanceof Date) {
                        newRow[key] = row[key].toISOString()
                    } else if (typeof row[key] === 'object' && row[key] !== null) {
                        newRow[key] = JSON.stringify(row[key])
                    } else {
                        newRow[key] = row[key]
                    }
                }
                return newRow
            })

            const worksheet = xlsx.utils.json_to_sheet(cleanData)
            const csvContent = xlsx.utils.sheet_to_csv(worksheet)

            const filePath = path.join(exportDir, `${modelName}.csv`)
            fs.writeFileSync(filePath, csvContent)
            console.log(`Exported ${data.length} records to ${modelName}.csv`)

        } catch (error) {
            console.error(`Error exporting ${modelName}:`, error)
        }
    }

    console.log('Export complete.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
