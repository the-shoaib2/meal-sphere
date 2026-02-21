import { PageHeader } from "@/components/shared/page-header"
import { JoinGroupForm } from "@/components/groups/join-group-form"
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Join Group | Meal Sphere',
    description: 'Join a group to start sharing meals and expenses',
};

export default function JoinLandingPage() {
    return (
        <div className="space-y-4">
            <PageHeader
                heading="Join Group"
                description="Connect with your roommates by joining an existing group."
                showBackButton
                backHref="/groups"
                collapsible={false}
            />
            <div className="flex justify-center p-4">
                <JoinGroupForm />
            </div>
        </div>
    )
}
