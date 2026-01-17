import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/services/email-utils'

export const dynamic = 'force-dynamic';


// Contact form data type
type ContactFormData = {
  firstName: string
  lastName: string
  email: string
  subject: string
  message: string
  captchaId: string
  captchaText: string
  userInput: string
}

// Contact email template
const contactEmailTemplate = (data: ContactFormData) => ({
  subject: `New Contact Form Submission: ${data.subject}`,
  text: `
New contact form submission from MealSphere website:

Name: ${data.firstName} ${data.lastName}
Email: ${data.email}
Subject: ${data.subject}
Message: ${data.message}

Submitted on: ${new Date().toLocaleString()}
  `,
  html: `
    <div style="
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    ">
      <div style="
        text-align: center;
        margin-bottom: 30px;
      ">
        <h1 style="
          color: #333;
          margin: 0;
          font-size: 24px;
        ">MealSphere</h1>
        <p style="color: #666; margin-top: 8px;">New Contact Form Submission</p>
      </div>

      <div style="
        background: #f8f9fa;
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 24px;
        border: 1px solid #e9ecef;
      ">
        <h2 style="color: #333; margin-bottom: 16px; font-size: 20px;">Contact Details</h2>
        
        <div style="margin-bottom: 16px;">
          <strong style="color: #333;">Name:</strong>
          <span style="color: #495057; margin-left: 8px;">${data.firstName} ${data.lastName}</span>
        </div>
        
        <div style="margin-bottom: 16px;">
          <strong style="color: #333;">Email:</strong>
          <span style="color: #495057; margin-left: 8px;">${data.email}</span>
        </div>
        
        <div style="margin-bottom: 16px;">
          <strong style="color: #333;">Subject:</strong>
          <span style="color: #495057; margin-left: 8px;">${data.subject}</span>
        </div>
        
        <div style="margin-bottom: 16px;">
          <strong style="color: #333;">Message:</strong>
          <div style="
            color: #495057;
            margin-top: 8px;
            padding: 12px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e9ecef;
            white-space: pre-wrap;
            line-height: 1.6;
          ">${data.message}</div>
        </div>
        
        <div style="
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #e9ecef;
          color: #666;
          font-size: 14px;
        ">
          <p style="margin: 0;">Submitted on: ${new Date().toLocaleString()}</p>
        </div>
      </div>

      <div style="
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #eee;
        text-align: center;
        color: #666;
        font-size: 12px;
      ">
        <p>This is an automated message from the MealSphere contact form.</p>
        <p>&copy; ${new Date().getFullYear()} MealSphere. All rights reserved.</p>
      </div>
    </div>
  `
})

// Auto-reply email template
const autoReplyTemplate = (data: ContactFormData) => ({
  subject: "Thank you for contacting MealSphere",
  text: `
Dear ${data.firstName},

Thank you for reaching out to us. We have received your message and will get back to you as soon as possible.

Your message details:
Subject: ${data.subject}
Message: ${data.message}

We typically respond within 24 hours during business days.

Best regards,
The MealSphere Team
  `,
  html: `
    <div style="
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    ">
      <div style="
        text-align: center;
        margin-bottom: 30px;
      ">
        <h1 style="
          color: #333;
          margin: 0;
          font-size: 24px;
        ">MealSphere</h1>
      </div>

      <h2 style="color: #333; margin-bottom: 20px;">Thank you for contacting us!</h2>
      
      <p>Dear ${data.firstName},</p>
      
      <p>Thank you for reaching out to us. We have received your message and will get back to you as soon as possible.</p>
      
      <div style="
        background: #f8f9fa;
        border-radius: 8px;
        padding: 16px;
        margin: 20px 0;
        border: 1px solid #e9ecef;
      ">
        <h3 style="color: #333; margin: 0 0 12px 0; font-size: 16px;">Your message details:</h3>
        <p style="margin: 0 0 8px 0;"><strong>Subject:</strong> ${data.subject}</p>
        <p style="margin: 0;"><strong>Message:</strong> ${data.message}</p>
      </div>
      
      <p>We typically respond within 24 hours during business days.</p>
      
      <p>If you have any urgent questions, you can also:</p>
      <ul style="color: #495057; line-height: 1.6;">
        <li>Check our <a href="${process.env.NEXTAUTH_URL}/help" style="color: #007bff;">Help Center</a></li>
        <li>Visit our <a href="${process.env.NEXTAUTH_URL}/faq" style="color: #007bff;">FAQ page</a></li>
        <li>Contact us via phone: +1 (555) 123-4567</li>
      </ul>
      
      <p>Best regards,<br>The MealSphere Team</p>

      <div style="
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #eee;
        text-align: center;
        color: #666;
        font-size: 12px;
      ">
        <p>This is an automated message, please do not reply.</p>
        <p>&copy; ${new Date().getFullYear()} MealSphere. All rights reserved.</p>
      </div>
    </div>
  `
})

export async function POST(request: NextRequest) {
  try {
    const body: ContactFormData = await request.json()
    
    // Validate required fields
    const { firstName, lastName, email, subject, message, captchaId, captchaText, userInput } = body
    
    if (!firstName || !lastName || !email || !subject || !message || !captchaId || !captchaText || !userInput) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate CAPTCHA
    const isValidCaptcha = userInput.toUpperCase() === captchaText.toUpperCase()
    if (!isValidCaptcha) {
      return NextResponse.json(
        { error: 'Invalid CAPTCHA' },
        { status: 400 }
      )
    }

    // Get admin email from environment variable
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_FROM
    if (!adminEmail) {
      console.error('Admin email not configured')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Send notification email to admin
    const notificationTemplate = contactEmailTemplate(body)
    await sendEmail(adminEmail, notificationTemplate)

    // Send auto-reply to user
    const autoReply = autoReplyTemplate(body)
    await sendEmail(email, autoReply)

    return NextResponse.json({
      success: true,
      message: 'Thank you for your message! We will get back to you soon.'
    })

  } catch (error) {
    console.error('Contact form error:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to send message. Please try again later.' },
      { status: 500 }
    )
  }
} 
