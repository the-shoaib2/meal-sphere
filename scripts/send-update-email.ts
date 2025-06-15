import { PrismaClient } from '@prisma/client'
import { sendEmail } from '../lib/email-utils'
import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env')
dotenv.config({ path: envPath })

const prisma = new PrismaClient()

// Update message template
const updateTemplate = (name: string) => ({
  subject: "MealSphere Update: New Features and Improvements",
  text: `Hello ${name},\n\nWe're excited to share some updates about MealSphere!\n\nNew Features:\n- Enhanced email notifications\n- Improved user interface\n- Better meal tracking\n\nThank you for being part of our community!\n\nRegards,\nMealSphere Team`,
  html: `
    <h2 style="color: #333; margin-bottom: 20px;">MealSphere Update: New Features and Improvements</h2>
    <p>Hello ${name},</p>
    <p>We're excited to share some updates about MealSphere!</p>
    
    <h3 style="color: #4CAF50; margin-top: 20px;">New Features</h3>
    <ul style="color: #666; line-height: 1.6;">
      <li>Enhanced email notifications</li>
      <li>Improved user interface</li>
      <li>Better meal tracking</li>
    </ul>

    <p>We're constantly working to improve your experience with MealSphere. Thank you for being part of our community!</p>
    
    <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 4px;">
      <p style="margin: 0; color: #666;">If you have any questions or feedback, please don't hesitate to reach out to us.</p>
    </div>
  `
})

async function sendUpdateEmails() {
  try {
    console.log('Starting to send update emails...')

    // Get all users with verified emails
    const users = await prisma.user.findMany({
      where: {
        emailVerified: {
          not: null
        }
      },
      select: {
        email: true,
        name: true
      }
    })

    console.log(`Found ${users.length} users to send emails to`)

    // Send emails in batches to avoid overwhelming the email server
    const batchSize = 10
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize)
      
      // Send emails in parallel for each batch
      await Promise.all(
        batch.map(async (user) => {
          try {
            await sendEmail(user.email, updateTemplate(user.name || 'User'))
            console.log(`✅ Sent update email to ${user.email}`)
          } catch (error) {
            console.error(`❌ Failed to send email to ${user.email}:`, error instanceof Error ? error.message : error)
          }
        })
      )

      // Add a small delay between batches
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    console.log('Finished sending update emails!')
  } catch (error) {
    console.error('Error sending update emails:', error instanceof Error ? error.message : error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
sendUpdateEmails() 