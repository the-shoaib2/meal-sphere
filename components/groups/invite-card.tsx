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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { sendGroupInviteEmail } from "@/lib/email-utils";

import { useGroups } from '@/hooks/use-groups';

interface GroupData {
  id: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
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

interface InviteData {
  token: string;
  expiresAt: string;
  role: Role;
  groupId: string;
}

interface InviteCardProps {
  groupId: string;
  className?: string;
}

const ROLE_OPTIONS: { value: Role; label: string; description: string }[] = [
  { value: Role.MEMBER, label: 'Member', description: 'Can view and participate in group activities' },
  { value: Role.ADMIN, label: 'Admin', description: 'Full access to group settings and management' },
  { value: Role.MODERATOR, label: 'Moderator', description: 'Can manage members and content' },
  { value: Role.MANAGER, label: 'Manager', description: 'Can manage group operations' },
  { value: Role.LEADER, label: 'Leader', description: 'Can lead group activities' },
  { value: Role.MEAL_MANAGER, label: 'Meal Manager', description: 'Can manage group meals' },
  { value: Role.ACCOUNTANT, label: 'Accountant', description: 'Can manage group finances' },
  { value: Role.MARKET_MANAGER, label: 'Market Manager', description: 'Can manage group markets' }
];

export function InviteCard({ groupId, className = '' }: InviteCardProps) {
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
  const [loading, setLoading] = useState(false);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [emails, setEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState('');

  const { toast: uiToast } = useToast();
  const { useGroupDetails } = useGroups();
  const router = useRouter();
  
  const { data: group, isLoading, error } = useGroupDetails(groupId);
  
  useEffect(() => {
    if (error) {
      uiToast({
        title: 'Error',
        description: error.message || 'Failed to load group details',
        variant: 'destructive',
      });
    }
  }, [error, uiToast]);

  const generateInviteLink = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/groups/${groupId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: selectedRole,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate invite link');
      }

      const data = await response.json();
      setInvite(data.invitation);
      
      // Generate the invite link with the code
      const baseUrl = window.location.origin;
      const inviteUrl = `${baseUrl}/groups/join?code=${data.invitation.code}&groupId=${groupId}`;
      setInviteLink(inviteUrl);
    } catch (error) {
      uiToast({
        title: "Error",
        description: "Failed to generate invite link",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [groupId, selectedRole, uiToast]);

  useEffect(() => {
    if (isOpen && !invite) {
      generateInviteLink();
    }
  }, [isOpen, invite, generateInviteLink]);

  const handleCopyLink = useCallback(() => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    uiToast({
      title: 'Link copied!',
      description: 'The invitation link has been copied to your clipboard.',
    });
    setTimeout(() => setCopied(false), 2000);
  }, [inviteLink, uiToast]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${group?.name} on MealSphere`,
          text: `You've been invited to join ${group?.name} on MealSphere. Click the link to join!`,
          url: inviteLink,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleAddEmail = () => {
    if (!currentEmail || emails.length >= 10) return;
    if (emails.includes(currentEmail)) {
      uiToast({
        title: "Error",
        description: "This email is already in the list",
        variant: "destructive",
      });
      return;
    }
    setEmails([...emails, currentEmail]);
    setCurrentEmail('');
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setEmails(emails.filter(email => email !== emailToRemove));
  };

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emails.length === 0 || !group?.id) return;

    try {
      setIsGenerating(true);
      setInviteStatus(null);

      const response = await fetch(`/api/groups/${group.id}/send-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emails,
          role: 'MEMBER',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send invitation');
      }

      const data = await response.json();
      const inviteUrl = `${window.location.origin}/groups/join?code=${data.invitations[0].code}&groupId=${group.id}`;
      
      setInviteStatus({
        success: true,
        message: `Invitations sent to ${emails.length} email${emails.length > 1 ? 's' : ''}.`,
        invitationUrl: inviteUrl,
      });
      
      uiToast({
        title: 'Invitations sent!',
        description: `Invitations sent to ${emails.length} email${emails.length > 1 ? 's' : ''}.`,
      });
      
      setEmails([]);
      setCurrentEmail('');
      setInviteLink(inviteUrl);
    } catch (err) {
      const error = err as Error;
      console.error('Error sending invitation:', error);
      uiToast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading || !group) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-[120px]" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[150px]" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <div className="flex space-x-2">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-8 w-1/2" />
          </div>
        </div>
        <div className="pt-4 border-t">
          <Skeleton className="h-4 w-[100px] mb-2" />
          <Skeleton className="h-[120px] w-[120px] rounded-lg" />
        </div>
      </div>
    );
  }

  const { name, isPrivate } = group;
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Members
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to {name}</DialogTitle>
          <DialogDescription>
            Invite others to join your group via link or email invitation.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">Invite Link</TabsTrigger>
            <TabsTrigger value="email">Email Invite</TabsTrigger>
          </TabsList>
          <TabsContent value="link" className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-1">
                <Label htmlFor="invite-link" className="text-sm font-medium">
                  Invitation Link
                </Label>
                <div className="flex items-center space-x-2">
                  {loading ? (
                    <Skeleton className="h-8 w-full" />
                  ) : (
                    <Input
                      id="invite-link"
                      value={inviteLink}
                      readOnly
                      className="h-8 text-xs"
                    />
                  )}
                  <div className="flex space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={handleCopyLink}
                            className="h-8 w-8"
                            disabled={loading}
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
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={handleShare}
                            className="h-8 w-8"
                            disabled={loading}
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Share link</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">QR Code</p>
              <div className="p-4 border rounded-lg bg-white dark:bg-gray-800 flex flex-col items-center">
                {loading ? (
                  <Skeleton className="h-[120px] w-[120px] rounded-lg" />
                ) : (
                  <QRCodeSVG 
                    value={inviteLink} 
                    size={120} 
                    level="H" 
                    includeMargin={false}
                    className="p-1 bg-white rounded"
                  />
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Scan to join {group.name}
                </p>
              </div>
            </div>

            {invite && (
              <div className="text-xs text-muted-foreground text-center">
                Link expires: {new Date(invite.expiresAt).toLocaleString()}
              </div>
            )}

            {group?.isPrivate && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md text-sm">
                <div className="flex items-start">
                  <Lock className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">Private Group</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                      New members will need admin approval to join this group.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="email">
            <form onSubmit={handleGenerateInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Addresses (up to 10)</Label>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    value={currentEmail}
                    onChange={(e) => setCurrentEmail(e.target.value)}
                    placeholder="Enter email address"
                    disabled={isGenerating}
                  />
                  <Button
                    type="button"
                    onClick={handleAddEmail}
                    disabled={isGenerating || !currentEmail || emails.length >= 10}
                  >
                    Add
                  </Button>
                </div>
                {emails.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {emails.map((email) => (
                      <Badge
                        key={email}
                        variant="secondary"
                        className="flex items-center gap-1 px-3 py-1.5"
                      >
                        <Mail className="h-3 w-3" />
                        <span className="text-xs">{email}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveEmail(email)}
                          disabled={isGenerating}
                          className="h-4 w-4 p-0 hover:bg-transparent"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
                {emails.length >= 10 && (
                  <p className="text-sm text-muted-foreground">
                    Maximum 10 email addresses allowed
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isGenerating || emails.length === 0}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  `Send Invitations (${emails.length})`
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
