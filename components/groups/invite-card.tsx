'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Copy, Loader2, Lock, Mail, Share2, UserPlus, X, Check, AlertCircle } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Role } from "@prisma/client";

import { useGroups } from '@/hooks/use-groups';

interface GroupData {
  id: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  password: string | null;
  maxMembers: number | null;
  memberCount: number;
  members?: Array<{
    id: string;
    role: string;
    joinedAt: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    };
  }>;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface InviteCardProps {
  groupId: string;
  className?: string;
}

const ROLE_OPTIONS: { value: Role; label: string; description: string }[] = [
  { value: 'MEMBER', label: 'Member', description: 'Can view and participate in group activities' },
  { value: 'GUEST', label: 'Guest', description: 'Limited access, can only view basic group info' },
  { value: 'ADMIN', label: 'Admin', description: 'Full access to group settings and management' },
  { value: 'MODERATOR', label: 'Moderator', description: 'Can manage members and content' },
];

export function InviteCard({ groupId, className = '' }: InviteCardProps) {
  // State hooks
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('MEMBER');
  const [isGenerating, setIsGenerating] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'email'>('link');
  const [inviteStatus, setInviteStatus] = useState<{
    success: boolean;
    message: string;
    invitationUrl?: string;
  } | null>(null);

  // Context and other hooks
  const { toast } = useToast();
  const { useGroupDetails } = useGroups();
  const router = useRouter();
  
  // Use React Query to fetch group details
  const { data: group, isLoading, error } = useGroupDetails(groupId);
  
  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load group details',
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  // Set up invite link when group is loaded
  useEffect(() => {
    if (group?.id && typeof window !== 'undefined') {
      const baseUrl = window.location.origin;
      setInviteLink(`${baseUrl}/groups/join/${group.id}`);
    }
  }, [group?.id]);

  // Memoized handlers
  const handleCopyLink = useCallback(() => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast({
      title: 'Link copied!',
      description: 'The invitation link has been copied to your clipboard.',
    });
    setTimeout(() => setCopied(false), 2000);
  }, [inviteLink, toast]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${name} on MealSphere`,
          text: `You've been invited to join ${name} on MealSphere. Click the link to join!`,
          url: inviteLink,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !group?.id) return;

    try {
      setIsGenerating(true);
      setInviteStatus(null);

      const response = await fetch(`/api/groups/${group.id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          role: selectedRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || 'Failed to send invitation'
        );
      }

      const data = await response.json();
      
      setInviteStatus({
        success: true,
        message: `Invitation sent to ${email} with ${selectedRole} role.`,
        invitationUrl: data.invitationUrl,
      });
      
      // Show success toast
      toast({
        title: 'Invitation sent!',
        description: `Invitation sent to ${email} with ${selectedRole} role.`,
      });
      
      // Reset form
      setEmail('');
      setSelectedRole('MEMBER');
    } catch (err) {
      const error = err as Error;
      console.error('Error sending invitation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Loading state
  if (isLoading || !group) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // Destructure group properties after null check
  const { name, isPrivate, password } = group;
  const hasPassword = !!password;
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Members
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite to {name}</DialogTitle>
          <DialogDescription>
            Invite others to join your group via link or email invitation.
          </DialogDescription>
        </DialogHeader>

        <div className="flex border-b mb-2">
          <button
            className={`flex-1 py-2 px-4 text-sm font-medium ${activeTab === 'link' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('link')}
          >
            Invite Link
          </button>
          <button
            className={`flex-1 py-2 px-4 text-sm font-medium ${activeTab === 'email' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('email')}
          >
            Email Invite
          </button>
        </div>

        {activeTab === 'link' ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-1">
                <Label htmlFor="invite-link" className="text-sm font-medium">
                  Invitation Link
                </Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="invite-link"
                    value={inviteLink}
                    readOnly
                    className="h-8 text-xs"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={handleCopyLink}
                          className="h-8 w-8"
                        >
                          {copied ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{copied ? 'Copied!' : 'Copy link'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>

            <div className="flex space-x-2 mt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleShare}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setActiveTab('email')}
              >
                <Mail className="mr-2 h-4 w-4" />
                Email Invite
              </Button>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">QR Code</p>
              <div className="p-4 border rounded-lg bg-white dark:bg-gray-800 flex flex-col items-center">
                <QRCodeSVG 
                  value={inviteLink} 
                  size={120} 
                  level="H" 
                  includeMargin={false}
                  className="p-1 bg-white rounded"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Scan to join {group.name}
                </p>
              </div>
            </div>

            {group.isPrivate && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md text-sm">
                <div className="flex items-start">
                  <Lock className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">Private Group</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                      {group.password 
                        ? 'New members will need to enter the group password to join.'
                        : 'New members will need approval to join.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleGenerateInvite} className="space-y-3">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isGenerating}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as Role)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isGenerating}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {ROLE_OPTIONS.find((r) => r.value === selectedRole)?.description}
                </p>
              </div>
              
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm rounded-md flex items-start">
                  <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                </div>
              )}
              
              {inviteStatus?.success && inviteStatus.invitationUrl && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm rounded-md">
                  <div className="flex items-start">
                    <Check className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Invitation created successfully</p>
                      <p className="mt-1 break-all text-xs">
                        {inviteStatus.invitationUrl}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
              
              <div className="w-full space-y-2 pt-3 border-t mt-3">
                <div>
                  <Label htmlFor="invite-link" className="block text-xs sm:text-sm font-medium mb-1.5">
                    Group Invite Link
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      id="invite-link" 
                      value={inviteLink} 
                      readOnly 
                      className="flex-1 font-mono text-xs h-8"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={handleCopyLink}
                      disabled={!inviteLink}
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground pt-1">
                  {group?.isPrivate
                    ? 'Share this link with people you want to invite. They will need to enter the group password to join.'
                    : 'Share this link with others to invite them to your group.'}
                </p>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
