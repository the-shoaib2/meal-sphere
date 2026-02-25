"use server";

export async function getPublicDataAction(endpoint: string) {
  try {
    // No artificial delay for ultra-fast performance

    switch (endpoint) {
      case "hero":
        return {
          title: "Simplify Your Meal Management",
          subtitle: "Track meals, calculate costs, and manage payments with ease. Perfect for roommates, hostels, and shared living spaces.",
          ctaPrimary: { text: "Get Started", href: "/register" },
          ctaSecondary: { text: "Learn More", href: "/about" },
          backgroundImage: "/banner.jpg",
        };
      case "about":
        return {
          hero: {
            title: "Building Better Communities",
            subtitle: "MealSphere was born from a simple observation: shared living can be challenging, but it doesn't have to be. We're on a mission to make roommates' lives easier, one meal at a time.",
            ctaPrimary: { text: "Join Our Mission", href: "/register" },
            ctaSecondary: { text: "Learn More", href: "#story" },
          },
          stats: [
            { number: "50K+", label: "Active Users" },
            { number: "10K+", label: "Households" },
            { number: "1M+", label: "Meals Planned" },
            { number: "95%", label: "Satisfaction Rate" },
          ],
          story: {
            title: "Our Story",
            content: [
              "In 2023, our founders were struggling with the same problem millions of roommates face: coordinating meals, splitting grocery bills, and managing shared expenses. What started as a simple spreadsheet quickly evolved into something bigger.",
              "We realized that shared living doesn't have to be complicated. With the right tools, roommates can not only survive together but thrive together. That's why we built MealSphere - to transform the way people live together.",
              "Today, we're proud to serve thousands of households across the globe, helping them build stronger relationships through better meal management.",
            ],
          },
          mission: {
            title: "Our Mission",
            description: "To simplify shared living by providing intuitive tools that help roommates coordinate meals, manage expenses, and build stronger communities. We believe that when people can easily share resources and responsibilities, everyone benefits.",
          },
          vision: {
            title: "Our Vision",
            description: "A world where shared living is not just a necessity but a choice people make because it's better than living alone. We envision communities where roommates become friends, neighbors become family, and shared resources create abundance for everyone.",
          },
          values: [
            { title: "Community First", description: "We believe in the power of community and building connections through shared experiences.", icon: "Heart" },
            { title: "Collaboration", description: "Every feature is designed to bring people together and make collaboration seamless.", icon: "Users" },
            { title: "Simplicity", description: "Complex problems deserve simple solutions that anyone can use and understand.", icon: "Target" },
            { title: "Trust & Security", description: "Your data and privacy are our top priorities, always protected and never compromised.", icon: "Shield" },
            { title: "Innovation", description: "Constantly pushing boundaries to create better experiences for shared living.", icon: "Zap" },
            { title: "Inclusivity", description: "Building for everyone, regardless of background, dietary preferences, or living situation.", icon: "Globe" },
          ],
          team: [
            { name: "Sarah Johnson", role: "CEO & Co-Founder", bio: "Former product manager at Google, passionate about solving real-world problems through technology.", image: "/placeholder.jpg", linkedin: "#" },
            { name: "Michael Chen", role: "CTO & Co-Founder", bio: "Full-stack developer with 10+ years experience building scalable applications.", image: "/placeholder.jpg", linkedin: "#" },
            { name: "Emily Rodriguez", role: "Head of Product", bio: "UX designer turned product manager, focused on creating intuitive user experiences.", image: "/placeholder.jpg", linkedin: "#" },
            { name: "David Kim", role: "Head of Engineering", bio: "Backend specialist with expertise in distributed systems and cloud architecture.", image: "/placeholder.jpg", linkedin: "#" },
          ],
          cta: {
            title: "Join Us in Building Better Communities",
            subtitle: "Whether you're a roommate, landlord, or just someone who believes in the power of community, we'd love to hear from you.",
            ctaPrimary: { text: "Get Started", href: "/register" },
            ctaSecondary: { text: "Contact Us", href: "/contact" },
          },
        };
      case "contact":
        return {
          hero: {
            title: "We'd Love to Hear from You",
            subtitle: "Have questions, feedback, or need help? Our team is here to support you. Reach out and we'll get back to you as soon as possible.",
          },
          contactMethods: [
            { title: "Email Support", description: "Get help via email within 24 hours", contact: "support@mealsphere.com", icon: "Mail" },
            { title: "Phone Support", description: "Speak with our team directly", contact: "+1 (555) 123-4567", icon: "Phone" },
            { title: "Live Chat", description: "Chat with us in real-time", contact: "Available 9AM-6PM EST", icon: "MessageCircle" },
          ],
          officeLocations: [
            { city: "San Francisco", address: "123 Innovation Drive, San Francisco, CA 94105", phone: "+1 (555) 123-4567", hours: "Mon-Fri 9AM-6PM PST" },
            { city: "New York", address: "456 Tech Avenue, New York, NY 10001", phone: "+1 (555) 987-6543", hours: "Mon-Fri 9AM-6PM EST" },
          ],
          faqs: [
            { question: "How do I invite my roommates to join?", answer: "Simply create a group and share the invite link with your roommates. They can join using the link or by searching for your group name." },
            { question: "Can I use MealSphere for free?", answer: "Yes! We offer a free plan that supports up to 3 roommates with basic meal planning features. Upgrade to Pro for more features." },
            { question: "How do you handle payments and expenses?", answer: "Our expense tracking feature helps you split bills, track payments, and manage shared expenses transparently with your roommates." },
            { question: "Is my data secure?", answer: "Absolutely. We use industry-standard encryption and security practices to protect your personal information and data." },
            { question: "Can I export my meal plans and data?", answer: "Yes, you can export your meal plans, shopping lists, and expense reports in various formats for your convenience." },
            { question: "Do you support dietary restrictions?", answer: "Yes! You can set dietary preferences and restrictions for each roommate, and our recipe suggestions will respect these preferences." },
          ],
          supportChannels: [
            { title: "Live Chat", description: "Get instant help from our support team", icon: "MessageCircle", cta: "Start Chat" },
            { title: "Community Forum", description: "Connect with other MealSphere users", icon: "Users", cta: "Join Forum" },
            { title: "Help Center", description: "Browse our comprehensive documentation", icon: "HelpCircle", cta: "Visit Help Center" },
          ],
          cta: {
            title: "Ready to Get Started?",
            subtitle: "Join thousands of roommates who are already using MealSphere to simplify their shared living experience.",
            ctaPrimary: { text: "Start Free Trial", href: "/register" },
            ctaSecondary: { text: "Schedule Demo", href: "/contact" },
          },
        };
      case "features":
        return {
          title: "Key Features",
          subtitle: "Everything you need to manage meals and costs in shared living spaces",
          features: [
            { id: 1, title: "Meal Tracking", description: "Track daily meals with ease. Mark your breakfast, lunch, and dinner with a simple click.", icon: "Utensils" },
            { id: 2, title: "Room Management", description: "Create rooms, add members, and elect managers through a democratic voting system.", icon: "Users" },
            { id: 3, title: "Payment Integration", description: "Integrated Bkash payment system for seamless meal cost settlements.", icon: "CreditCard" },
            { id: 4, title: "Notifications", description: "Get timely reminders for meal inputs, voting, and payment deadlines.", icon: "Bell" },
            { id: 5, title: "Cost Calculation", description: "Automatic calculation of meal rates, individual costs, and monthly summaries.", icon: "TrendingUp" },
            { id: 6, title: "Role-Based Access", description: "Different access levels for admins, managers, and members with customizable permissions.", icon: "Shield" },
          ],
        };
      case "meal-plans":
        return {
          hero: {
            title: "Plan Meals Together Smarter",
            subtitle: "Coordinate meals with your roommates, save money on groceries, and never wonder what's for dinner again. Our collaborative meal planning makes shared living delicious and efficient.",
            ctaPrimary: { text: "Start Planning", href: "/register" },
            ctaSecondary: { text: "Invite Roommates", href: "/register" },
          },
          features: [
            { title: "Collaborative Planning", description: "Plan meals together with your roommates in real-time", icon: "Users" },
            { title: "Smart Shopping Lists", description: "Automatically generate shopping lists from your meal plans", icon: "ShoppingCart" },
            { title: "Recipe Integration", description: "Access thousands of recipes and add them to your plans", icon: "ChefHat" },
            { title: "Time Management", description: "Plan cooking times and coordinate kitchen schedules", icon: "Clock" },
            { title: "Quick Setup", description: "Get started in minutes with our guided setup process", icon: "Zap" },
            { title: "Personalization", description: "Customize plans based on dietary preferences and budgets", icon: "Star" },
          ],
          mealPlanTypes: [
            { name: "Weekly Planner", description: "Plan meals for the entire week with your roommates", icon: "Calendar", features: ["7-day meal planning", "Shopping list generation", "Recipe suggestions", "Collaborative editing"] },
            { name: "Monthly Planner", description: "Long-term meal planning with budget tracking", icon: "Calendar", features: ["30-day meal planning", "Budget optimization", "Bulk shopping lists", "Nutrition tracking"] },
            { name: "Special Occasions", description: "Plan meals for parties, holidays, and special events", icon: "Star", features: ["Event planning", "Guest management", "Portion calculations", "Timeline management"] },
          ],
          pricingTiers: [
            { name: "Free", price: "$0", period: "forever", description: "Perfect for small groups getting started", features: ["Up to 3 roommates", "Basic meal planning", "Recipe library access", "Shopping list generation", "Email support"], popular: false },
            { name: "Pro", price: "$9.99", period: "per month", description: "Ideal for active households", features: ["Up to 8 roommates", "Advanced meal planning", "Nutrition tracking", "Budget optimization", "Recipe sharing", "Priority support", "Custom meal categories"], popular: true },
            { name: "Team", price: "$19.99", period: "per month", description: "For large households and communities", features: ["Unlimited roommates", "Advanced analytics", "Custom integrations", "White-label options", "Dedicated support", "API access", "Advanced reporting"], popular: false },
          ],
          cta: {
            title: "Ready to Transform Your Meal Planning?",
            subtitle: "Join thousands of roommates who are already saving time and money with collaborative meal planning",
            ctaPrimary: { text: "Start Free Trial", href: "/register" },
            ctaSecondary: { text: "Schedule Demo", href: "/contact" },
          },
        };
      case "recipes":
        return {
          hero: {
            title: "Discover Amazing Recipes",
            subtitle: "Explore our curated collection of delicious recipes perfect for roommates and shared living spaces. From quick breakfasts to elaborate dinners, find inspiration for every meal.",
            ctaPrimary: { text: "Browse Recipes", href: "/recipes" },
            ctaSecondary: { text: "View Meal Plans", href: "/meal-plans" },
          },
          recipeCategories: [
            { name: "Breakfast", icon: "/images/hero-section/Breakfast.svg", count: 45 },
            { name: "Lunch", icon: "/images/hero-section/Lunch.svg", count: 67 },
            { name: "Dinner", icon: "/images/hero-section/Dinner.svg", count: 89 },
            { name: "Snacks", icon: "/images/hero-section/Snacks.svg", count: 34 },
            { name: "Desserts", icon: "/images/hero-section/Desserts.svg", count: 23 },
            { name: "Special", icon: "/images/hero-section/Special.svg", count: 28 },
          ],
          featuredRecipes: [
            { id: 1, title: "Spicy Chicken Biryani", description: "Aromatic rice dish with tender chicken and fragrant spices", time: "45 min", servings: 4, difficulty: "Medium", rating: 4.8, image: "/placeholder.jpg", tags: ["Indian", "Rice", "Spicy"] },
            { id: 2, title: "Mediterranean Salad", description: "Fresh vegetables with olive oil and herbs", time: "15 min", servings: 2, difficulty: "Easy", rating: 4.6, image: "/placeholder.jpg", tags: ["Healthy", "Vegetarian", "Quick"] },
            { id: 3, title: "Chocolate Lava Cake", description: "Decadent chocolate cake with molten center", time: "25 min", servings: 2, difficulty: "Hard", rating: 4.9, image: "/placeholder.jpg", tags: ["Dessert", "Chocolate", "Romantic"] },
          ],
          cta: {
            title: "Ready to Start Cooking?",
            subtitle: "Join thousands of roommates who are already enjoying better meals together",
            ctaPrimary: { text: "Get Started Free", href: "/register" },
            ctaSecondary: { text: "Learn More", href: "/about" },
          },
        };
      case "showcase":
        return {
          title: "See MealSphere in Action",
          subtitle: "Experience a seamless interface on both desktop and mobile. Designed for clarity, speed, and ease of use.",
          screenshots: {
            desktop: {
              image: "/Screenshot-desktop.png",
              alt: "Desktop view screenshot",
              label: "Desktop View",
            },
            mobile: {
              image: "/Screenshot-phone.png",
              alt: "Phone view screenshot",
              label: "Phone View",
            },
          },
        };
      default:
        throw new Error(`Public data endpoint not found: ${endpoint}`);
    }
  } catch (error: any) {
    console.error(`Error fetching public data (${endpoint}):`, error);
    return null;
  }
}

export async function getLegalDataAction(type: string) {
  try {
    switch (type) {
      case "terms":
        return {
          title: "Terms of Service",
          lastUpdated: "January 15, 2025",
          sections: [
            { id: 1, title: "Introduction", icon: "Shield", content: ["Welcome to MealSphere (\"we,\" \"our,\" or \"us\"). These Terms of Service (\"Terms\") govern your use of our meal planning and shared living management platform, including our website, mobile applications, and related services (collectively, the \"Service\").", "By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of these terms, then you may not access the Service."] },
            { id: 2, title: "Service Description", content: ["MealSphere provides a platform for roommates and shared living communities to:", ["Plan and coordinate meals together", "Manage shared expenses and payments", "Track grocery shopping and meal preparation", "Access recipes and meal suggestions", "Communicate and collaborate on household management"], "We reserve the right to modify, suspend, or discontinue any part of the Service at any time with reasonable notice."] },
            { id: 3, title: "User Accounts", content: ["To use certain features of the Service, you must create an account. You are responsible for:", ["Providing accurate and complete information", "Maintaining the security of your account credentials", "All activities that occur under your account", "Notifying us immediately of any unauthorized use"], "You must be at least 18 years old to create an account. If you are under 18, you may only use the Service with the involvement of a parent or guardian."] },
            { id: 4, title: "Acceptable Use", content: ["You agree not to use the Service to:", ["Violate any applicable laws or regulations", "Infringe on the rights of others", "Upload or share harmful, offensive, or inappropriate content", "Attempt to gain unauthorized access to our systems", "Interfere with the proper functioning of the Service", "Use the Service for commercial purposes without permission"]] },
            { id: 5, title: "Privacy and Data Protection", content: ["Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference.", "By using the Service, you consent to the collection and use of your information as described in our Privacy Policy.", "We implement appropriate security measures to protect your data, but no method of transmission over the internet is 100% secure."] },
            { id: 6, title: "Intellectual Property", content: ["The Service and its original content, features, and functionality are owned by MealSphere and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.", "You retain ownership of any content you submit to the Service, but you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and distribute your content in connection with the Service."] },
            { id: 7, title: "Payment Terms", content: ["Some features of the Service may require payment. All payments are processed securely through third-party payment processors.", "Subscription fees are billed in advance on a recurring basis. You may cancel your subscription at any time, but no refunds will be provided for partial billing periods.", "We reserve the right to change our pricing with 30 days' notice to existing customers."] },
            { id: 8, title: "Limitation of Liability", content: ["To the maximum extent permitted by law, MealSphere shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.", "Our total liability to you for any claims arising from these Terms or your use of the Service shall not exceed the amount you paid us in the 12 months preceding the claim."] },
            { id: 9, title: "Termination", content: ["You may terminate your account at any time by contacting us or using the account deletion feature in your settings.", "We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.", "Upon termination, your right to use the Service will cease immediately, and we may delete your account and data."] },
            { id: 10, title: "Contact Us", content: ["If you have any questions about these Terms of Service, please contact us:", { email: "legal@mealsphere.com", address: "123 Innovation Drive, San Francisco, CA 94105", phone: "+1 (555) 123-4567" }, "We will respond to your inquiry within 30 days of receipt."] }
          ]
        };
      case "privacy":
        return {
          title: "Privacy Policy",
          lastUpdated: "January 15, 2025",
          sections: [
            { id: 1, title: "Introduction", icon: "Shield", content: ["MealSphere (\"we,\" \"our,\" or \"us\") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our meal planning and shared living management platform.", "By using our service, you consent to the data practices described in this policy."] },
            { id: 2, title: "Information We Collect", content: ["We collect several types of information from and about users of our platform:", { personalInfo: ["Name and email address", "Profile information and preferences", "Payment information (processed securely by third parties)", "Communication preferences"], usageInfo: ["Meal plans and recipes you create or save", "Shopping lists and expense tracking data", "Group membership and collaboration activities", "App usage patterns and preferences"], technicalInfo: ["Device information and IP addresses", "Browser type and version", "Operating system", "Usage analytics and performance data"] }] },
            { id: 3, title: "How We Use Your Information", content: ["We use the information we collect to:", ["Provide and maintain our meal planning services", "Process payments and manage subscriptions", "Enable collaboration between roommates and group members", "Personalize your experience and provide relevant content", "Send important updates and notifications", "Improve our platform and develop new features", "Ensure security and prevent fraud", "Comply with legal obligations"]] },
            { id: 5, title: "Data Security", content: ["We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.", "Our security measures include:", ["Encryption of data in transit and at rest", "Regular security assessments and updates", "Access controls and authentication", "Secure data centers and infrastructure", "Employee training on data protection"], "However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security."] },
            { id: 8, title: "Contact Us", content: ["If you have any questions about this Privacy Policy or our data practices, please contact us:", { email: "privacy@mealsphere.com", address: "123 Innovation Drive, San Francisco, CA 94105", phone: "+1 (555) 123-4567" }, "We will respond to your inquiry within 30 days of receipt."] }
          ]
        };
      case "cookies":
        return {
          title: "Cookie Policy",
          lastUpdated: "January 15, 2025",
          sections: [
            { id: 1, title: "What Are Cookies?", icon: "Shield", content: ["Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit our website. They help us provide you with a better experience by remembering your preferences and analyzing how you use our platform.", "Cookies can be set by us (first-party cookies) or by third-party services we use (third-party cookies)."] },
            { id: 2, title: "Types of Cookies We Use", content: [{ essential: { title: "Essential Cookies", description: "These cookies are necessary for the website to function properly. They enable basic functions like:", items: ["User authentication and login sessions", "Security features and fraud prevention", "Basic website functionality", "Remembering your language preferences"], note: "These cookies cannot be disabled as they are essential for the website to work." }, analytics: { title: "Analytics Cookies", description: "These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously:", items: ["Pages visited and time spent on each page", "Navigation patterns and user journeys", "Performance and error monitoring", "Feature usage and popularity"], note: "This information helps us improve our platform and user experience." }, preference: { title: "Preference Cookies", description: "These cookies remember your choices and preferences to provide a personalized experience:", items: ["Theme and appearance settings", "Dietary preferences and restrictions", "Meal planning preferences", "Notification settings"] }, marketing: { title: "Marketing Cookies", description: "These cookies are used to deliver relevant advertisements and track marketing campaign performance:", items: ["Ad personalization and targeting", "Campaign effectiveness measurement", "Cross-site tracking for advertising", "Social media integration"], note: "These cookies are only set with your explicit consent." } }] },
            { id: 5, title: "Contact Us", content: ["If you have any questions about our use of cookies or this Cookie Policy, please contact us:", { email: "privacy@mealsphere.com", address: "123 Innovation Drive, San Francisco, CA 94105", phone: "+1 (555) 123-4567" }, "We will respond to your inquiry within 30 days of receipt."] }
          ]
        };
      default:
        return null;
    }
  } catch (error) {
    console.error(`Error fetching legal data (${type}):`, error);
    return null;
  }
}
