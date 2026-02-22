import { PageHeader } from "@/components/shared/page-header"
import { JoinGroupForm } from "@/components/groups/join-group-form"
import { Metadata } from 'next';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { JoinTip } from "@/components/groups/join-tip";
import { PublicGroupsDiscovery } from "@/components/groups/public-groups-discovery";

export const metadata: Metadata = {
    title: 'Join Group | Meal Sphere',
    description: 'Join a group to start sharing meals and expenses',
};

export default async function JoinLandingPage() {
    const session = await getServerSession(authOptions);

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-20 px-4 sm:px-6">
            <PageHeader
                heading="Community Discovery"
                description="Connect with your roommates or find a new community to share your journey."
                showBackButton
                backHref="/groups"
                collapsible={false}
                className="pt-4"
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                {/* Left Side: Join Form */}
                <div className="lg:col-span-12 xl:col-span-5 lg:sticky lg:top-24">
                    <JoinGroupForm />
                    <JoinTip />
                </div>

                {/* Right Side: Public Groups */}
                <div className="lg:col-span-12 xl:col-span-7">
                    <PublicGroupsDiscovery userId={session?.user?.id} />
                </div>
            </div>
        </div>
    )
}
