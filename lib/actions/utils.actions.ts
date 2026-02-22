"use server";

import { sendEmail } from "@/lib/services/email-utils";
import { detectLocation } from "@/lib/utils/location-utils";
import { v4 as uuidv4 } from "uuid";

// --- Contact Types & Logic ---

type ContactFormData = {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
  captchaId: string;
  userInput: string;
};

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
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333; margin: 0; font-size: 24px;">MealSphere</h1>
        <p style="color: #666; margin-top: 8px;">New Contact Form Submission</p>
      </div>
      <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e9ecef;">
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
          <div style="color: #495057; margin-top: 8px; padding: 12px; background: white; border-radius: 6px; border: 1px solid #e9ecef; white-space: pre-wrap; line-height: 1.6;">${data.message}</div>
        </div>
        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e9ecef; color: #666; font-size: 14px;">
          <p style="margin: 0;">Submitted on: ${new Date().toLocaleString()}</p>
        </div>
      </div>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
        <p>This is an automated message from the MealSphere contact form.</p>
        <p>&copy; ${new Date().getFullYear()} MealSphere. All rights reserved.</p>
      </div>
    </div>
  `,
});

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
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #333; margin: 0; font-size: 24px;">MealSphere</h1>
      </div>
      <h2 style="color: #333; margin-bottom: 20px;">Thank you for contacting us!</h2>
      <p>Dear ${data.firstName},</p>
      <p>Thank you for reaching out to us. We have received your message and will get back to you as soon as possible.</p>
      <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #e9ecef;">
        <h3 style="color: #333; margin: 0 0 12px 0; font-size: 16px;">Your message details:</h3>
        <p style="margin: 0 0 8px 0;"><strong>Subject:</strong> ${data.subject}</p>
        <p style="margin: 0;"><strong>Message:</strong> ${data.message}</p>
      </div>
      <p>We typically respond within 24 hours during business days.</p>
      <p>Best regards,<br>The MealSphere Team</p>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
        <p>This is an automated message, please do not reply.</p>
        <p>&copy; ${new Date().getFullYear()} MealSphere. All rights reserved.</p>
      </div>
    </div>
  `,
});

export async function sendContactEmailAction(data: ContactFormData) {
  try {
    const { firstName, lastName, email, subject, message, captchaId, userInput } = data;

    if (!firstName || !lastName || !email || !subject || !message || !captchaId || !userInput) {
      throw new Error("All fields are required");
    }

    // Validate CAPTCHA
    const isCaptchaValid = await verifyCaptcha(captchaId, userInput);
    if (!isCaptchaValid) {
      throw new Error("Invalid CAPTCHA");
    }

    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_FROM;
    if (!adminEmail) throw new Error("Server configuration error: Admin email missing");

    await sendEmail(adminEmail, contactEmailTemplate({ ...data, captchaText: "" } as any));
    await sendEmail(email, autoReplyTemplate({ ...data, captchaText: "" } as any));

    return { success: true, message: "Thank you for your message! We will get back to you soon." };
  } catch (error: any) {
    console.error("Contact form action error:", error);
    return { success: false, error: error.message || "Failed to send message" };
  }
}

// --- Location Action ---

export async function detectLocationAction() {
  try {
    return await detectLocation();
  } catch (error) {
    console.error("Location detection action error:", error);
    return { error: "Failed to detect location" };
  }
}

// --- Captcha Actions ---

import { createCaptcha, verifyCaptcha } from "@/lib/services/captcha-service";

export async function generateCaptchaAction() {
  try {
    const result = await createCaptcha();
    return {
      success: true,
      svg: result.svg,
      captchaId: result.id,
    };
  } catch (error: any) {
    console.error("Error generating CAPTCHA action:", error);
    return { success: false, error: "Failed to generate CAPTCHA" };
  }
}

export async function verifyCaptchaAction(captchaId: string, userInput: string) {
  try {
    const isValid = await verifyCaptcha(captchaId, userInput);
    return {
      valid: isValid,
      message: isValid ? "CAPTCHA verified successfully" : "Invalid CAPTCHA"
    };
  } catch (error: any) {
    console.error("Error verifying CAPTCHA action:", error);
    return { valid: false, error: "Failed to verify CAPTCHA" };
  }
}
