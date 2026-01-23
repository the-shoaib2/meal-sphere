'use client';

import VotingSystem from '@/components/groups/voting/voting-system';

interface VotingTabProps {
    group: any;
    initialVotes: any[];
    currentUser: any;
}

export function VotingTab({
    group,
    initialVotes,
    currentUser
}: VotingTabProps) {
    return (
        <VotingSystem
            activeGroup={group}
            initialVotes={initialVotes}
            currentUser={currentUser}
        />
    );
}
