import { unstable_cache } from 'next/cache';

// Static Data Definitions (could be moved to a CMS or DB later)
const HERO_DATA = {
    title: "Simplify Your Meal Management",
    subtitle: "Track meals, calculate costs, and manage payments with ease. Perfect for roommates, hostels, and shared living spaces.",
    ctaPrimary: {
        text: "Get Started",
        href: "/register"
    },
    ctaSecondary: {
        text: "Learn More",
        href: "/about"
    },
    backgroundImage: "/banner-v2.png"
};

const FEATURES_DATA = {
    title: "Key Features",
    subtitle: "Everything you need to manage meals and costs in shared living spaces",
    features: [
        {
            id: 1,
            title: "Meal Tracking",
            description: "Track daily meals with ease. Mark your breakfast, lunch, and dinner with a simple click.",
            icon: "Utensils"
        },
        {
            id: 2,
            title: "Room Management",
            description: "Create rooms, add members, and elect managers through a democratic voting system.",
            icon: "Users"
        },
        {
            id: 3,
            title: "Payment Integration",
            description: "Integrated Bkash payment system for seamless meal cost settlements.",
            icon: "CreditCard"
        },
        {
            id: 4,
            title: "Notifications",
            description: "Get timely reminders for meal inputs, voting, and payment deadlines.",
            icon: "Bell"
        },
        {
            id: 5,
            title: "Cost Calculation",
            description: "Automatic calculation of meal rates, individual costs, and monthly summaries.",
            icon: "TrendingUp"
        },
        {
            id: 6,
            title: "Role-Based Access",
            description: "Different access levels for admins, managers, and members with customizable permissions.",
            icon: "Shield"
        }
    ]
};

export async function fetchHeroData() {
    return unstable_cache(
        async () => HERO_DATA,
        ['public-hero-data'],
        { revalidate: 3600, tags: ['public-content'] } // 1 hour cache
    )();
}

export async function fetchFeaturesData() {
    return unstable_cache(
        async () => FEATURES_DATA,
        ['public-features-data'],
        { revalidate: 3600, tags: ['public-content'] }
    )();
}

// Add other public fetchers as needed (About, Legal, etc.)
