import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Simulate API delay for realistic loading
    await new Promise(resolve => setTimeout(resolve, 400))

    const contactData = {
      hero: {
        title: "We'd Love to Hear from You",
        subtitle: "Have questions, feedback, or need help? Our team is here to support you. Reach out and we'll get back to you as soon as possible."
      },
      contactMethods: [
        {
          title: "Email Support",
          description: "Get help via email within 24 hours",
          contact: "support@mealsphere.com",
          icon: "Mail"
        },
        {
          title: "Phone Support",
          description: "Speak with our team directly",
          contact: "+1 (555) 123-4567",
          icon: "Phone"
        },
        {
          title: "Live Chat",
          description: "Chat with us in real-time",
          contact: "Available 9AM-6PM EST",
          icon: "MessageCircle"
        }
      ],
      officeLocations: [
        {
          city: "San Francisco",
          address: "123 Innovation Drive, San Francisco, CA 94105",
          phone: "+1 (555) 123-4567",
          hours: "Mon-Fri 9AM-6PM PST"
        },
        {
          city: "New York",
          address: "456 Tech Avenue, New York, NY 10001",
          phone: "+1 (555) 987-6543",
          hours: "Mon-Fri 9AM-6PM EST"
        }
      ],
      faqs: [
        {
          question: "How do I invite my roommates to join?",
          answer: "Simply create a group and share the invite link with your roommates. They can join using the link or by searching for your group name."
        },
        {
          question: "Can I use MealSphere for free?",
          answer: "Yes! We offer a free plan that supports up to 3 roommates with basic meal planning features. Upgrade to Pro for more features."
        },
        {
          question: "How do you handle payments and expenses?",
          answer: "Our expense tracking feature helps you split bills, track payments, and manage shared expenses transparently with your roommates."
        },
        {
          question: "Is my data secure?",
          answer: "Absolutely. We use industry-standard encryption and security practices to protect your personal information and data."
        },
        {
          question: "Can I export my meal plans and data?",
          answer: "Yes, you can export your meal plans, shopping lists, and expense reports in various formats for your convenience."
        },
        {
          question: "Do you support dietary restrictions?",
          answer: "Yes! You can set dietary preferences and restrictions for each roommate, and our recipe suggestions will respect these preferences."
        }
      ],
      supportChannels: [
        {
          title: "Live Chat",
          description: "Get instant help from our support team",
          icon: "MessageCircle",
          cta: "Start Chat"
        },
        {
          title: "Community Forum",
          description: "Connect with other MealSphere users",
          icon: "Users",
          cta: "Join Forum"
        },
        {
          title: "Help Center",
          description: "Browse our comprehensive documentation",
          icon: "HelpCircle",
          cta: "Visit Help Center"
        }
      ],
      cta: {
        title: "Ready to Get Started?",
        subtitle: "Join thousands of roommates who are already using MealSphere to simplify their shared living experience.",
        ctaPrimary: {
          text: "Start Free Trial",
          href: "/register"
        },
        ctaSecondary: {
          text: "Schedule Demo",
          href: "/contact"
        }
      }
    }

    return NextResponse.json(contactData)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch contact data' },
      { status: 500 }
    )
  }
} 