'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Vote, Check, Users, Clock, BarChart2 } from 'lucide-react';
import { format, isAfter, isBefore } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type VoteOption = {
  id: string;
  text: string;
  votes: number;
  voted: boolean;
};

type Vote = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  endsAt: string | null;
  createdBy: {
    id: string;
    name: string | null;
    image: string | null;
  };
  options: VoteOption[];
  totalVotes: number;
  hasVoted: boolean;
  isMultipleChoice: boolean;
  isAnonymous: boolean;
};

type GroupVotesProps = {
  groupId: string;
  isAdmin: boolean;
  currentUserId?: string;
};

export function GroupVotes({ groupId, isAdmin, currentUserId }: GroupVotesProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  const [votes, setVotes] = useState<Vote[]>([
    {
      id: '1',
      title: 'What should we cook this weekend?',
      description: 'Vote for your favorite meal option for our weekend gathering.',
      createdAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      createdBy: {
        id: '1',
        name: 'John Doe',
        image: null,
      },
      options: [
        { id: '1', text: 'Pasta Carbonara', votes: 5, voted: false },
        { id: '2', text: 'Vegetable Stir Fry', votes: 3, voted: true },
        { id: '3', text: 'Grilled Salmon', votes: 2, voted: false },
      ],
      totalVotes: 10,
      hasVoted: true,
      isMultipleChoice: false,
      isAnonymous: false,
    },
    {
      id: '2',
      title: 'Best day for our next potluck',
      description: 'Please vote for the day that works best for everyone.',
      createdAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      createdBy: {
        id: '2',
        name: 'Jane Smith',
        image: null,
      },
      options: [
        { id: '1', text: 'Friday Evening', votes: 8, voted: false },
        { id: '2', text: 'Saturday Afternoon', votes: 12, voted: false },
        { id: '3', text: 'Sunday Brunch', votes: 5, voted: false },
      ],
      totalVotes: 25,
      hasVoted: false,
      isMultipleChoice: false,
      isAnonymous: true,
    },
  ]);

  const activeVotes = votes.filter(
    (vote) => !vote.endsAt || isAfter(new Date(vote.endsAt), new Date())
  );

  const pastVotes = votes.filter(
    (vote) => vote.endsAt && isBefore(new Date(vote.endsAt), new Date())
  );

  const displayedVotes = activeTab === 'active' ? activeVotes : pastVotes;

  const handleVote = async (voteId: string, optionId: string) => {
    // TODO: Implement vote submission to API
    setVotes(
      votes.map((vote) => {
        if (vote.id !== voteId) return vote;

        const updatedOptions = vote.options.map((option) => {
          if (option.id === optionId) {
            const newVoteCount = option.voted ? option.votes - 1 : option.votes + 1;
            return { ...option, voted: !option.voted, votes: newVoteCount };
          }

          // For single choice votes, unselect other options
          if (!vote.isMultipleChoice && option.voted) {
            return { ...option, voted: false, votes: option.votes - 1 };
          }

          return option;
        });

        const totalVotes = updatedOptions.reduce((sum, opt) => sum + opt.votes, 0);

        return {
          ...vote,
          options: updatedOptions,
          totalVotes,
          hasVoted: updatedOptions.some((opt) => opt.voted),
        };
      })
    );
  };

  const getVoteStatus = (vote: Vote) => {
    if (!vote.endsAt) return 'No end date';

    if (isAfter(new Date(), new Date(vote.endsAt))) {
      return 'Ended';
    }

    return `Ends in ${Math.ceil(
      (new Date(vote.endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )} days`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Group Votes</CardTitle>
        <div className="flex items-center space-x-2">
          <Button
            variant={activeTab === 'active' ? 'default' : 'outline'}

            onClick={() => setActiveTab('active')}
          >
            Active
          </Button>
          <Button
            variant={activeTab === 'past' ? 'default' : 'outline'}

            onClick={() => setActiveTab('past')}
          >
            Past
          </Button>
          <Button >
            <Plus className="mr-2 h-4 w-4" />
            New Vote
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {displayedVotes.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Vote className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">
              {activeTab === 'active' ? 'No active votes' : 'No past votes'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {activeTab === 'active'
                ? 'Create a new vote to get started.'
                : 'Past votes will appear here.'}
            </p>
            {activeTab === 'active' && (
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create Vote
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {displayedVotes.map((vote) => (
              <div
                key={vote.id}
                className="rounded-lg border p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      {vote.title}
                      {vote.isAnonymous && (
                        <Badge variant="outline" className="text-xs">
                          Anonymous
                        </Badge>
                      )}
                    </h3>
                    {vote.description && (
                      <p className="text-muted-foreground mt-1">
                        {vote.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{getVoteStatus(vote)}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {vote.options.map((option) => {
                    const percentage =
                      vote.totalVotes > 0
                        ? Math.round((option.votes / vote.totalVotes) * 100)
                        : 0;

                    return (
                      <div key={option.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">
                            {option.text}
                          </label>
                          <div className="text-xs text-muted-foreground">
                            {percentage}% • {option.votes} vote{option.votes !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={percentage}
                            className={cn(
                              'h-2',
                              option.voted && 'bg-primary/20'
                            )}
                          />
                          {vote.hasVoted && option.voted && (
                            <Check className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-3 border-t flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>{vote.totalVotes} votes</span>
                  </div>
                  {!vote.hasVoted && activeTab === 'active' ? (
                    <div className="flex space-x-2">
                      {vote.options.map((option) => (
                        <Button
                          key={option.id}
                          variant={option.voted ? 'default' : 'outline'}

                          onClick={() => handleVote(vote.id, option.id)}
                        >
                          {option.text}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <BarChart2 className="h-4 w-4 mr-1" />
                      <span>Results</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
