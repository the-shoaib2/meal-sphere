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
import { Copy, Loader2, Lock, Mail, Share2, UserPlus, X, Check, AlertCircle, Users, Settings } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sendGroupInviteEmail } from "@/lib/services/email-utils";

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

interface InviteTokenData {
  token: string;
  expiresAt: string | null;
  role: Role;
  inviteUrl: string;
}

interface InviteCardProps {
  groupId: string;
  className?: string;
}

interface InviteStatus {
  success: boolean;
  message: string;
  details?: {
    existingMembers: string[];
    pendingInvitations: string[];
  };
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

const EXPIRATION_OPTIONS = [
  { value: 1 / 24, label: '1 hour' },
  { value: 3 / 24, label: '3 hours' },
  { value: 6 / 24, label: '6 hours' },
  { value: 12 / 24, label: '12 hours' },
  { value: 1, label: '1 day' },
  { value: 3, label: '3 days' },
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 0, label: 'Never expire' }
];

export function InviteCard({ groupId, className = '' }: InviteCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>('MEMBER');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inviteToken, setInviteToken] = useState<InviteTokenData | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'custom' | 'email'>('link');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState<InviteStatus | null>(null);
  const [customExpiry, setCustomExpiry] = useState(7);

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

  const generateInviteToken = useCallback(async () => {
    try {
      setLoading(true);

      // Use the appropriate expiry time based on active tab
      const expiryTime = activeTab === 'custom' ? customExpiry : expiresInDays;

      const response = await fetch(`/api/groups/${groupId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: selectedRole,
          expiresInDays: expiryTime === 0 ? null : expiryTime,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate invite token');
      }

      const data = await response.json();

      if (!data.success || !data.data?.token) {
        throw new Error('Invalid response from server');
      }

      setInviteToken({
        token: data.data.token,
        expiresAt: data.data.expiresAt,
        role: data.data.role,
        inviteUrl: data.data.inviteUrl
      });

      uiToast({
        title: "Success",
        description: "Invite token generated successfully",
      });
    } catch (error) {
      console.error('Error generating invite token:', error);
      uiToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate invite token",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [groupId, selectedRole, customExpiry, expiresInDays, activeTab, uiToast]);

  // Clear token when custom tab is opened
  useEffect(() => {
    if (isOpen && activeTab === 'custom') {
      setInviteToken(null);
    }
  }, [isOpen, activeTab]);

  // Auto-generate invite token when dialog opens on link tab
  useEffect(() => {
    if (isOpen && activeTab === 'link' && !inviteToken && !loading) {
      generateInviteToken();
    }
  }, [isOpen, activeTab, inviteToken, loading, generateInviteToken]);

  // Handle tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value as 'link' | 'custom' | 'email');
  };

  const handleCopyLink = useCallback(() => {
    if (!inviteToken?.inviteUrl) return;
    navigator.clipboard.writeText(inviteToken.inviteUrl);
    setCopied(true);
    uiToast({
      title: 'Link copied!',
      description: 'The invitation link has been copied to your clipboard.',
    });
    setTimeout(() => setCopied(false), 2000);
  }, [inviteToken?.inviteUrl, uiToast]);

  const handleShare = async () => {
    if (!inviteToken?.inviteUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${group?.name} on MealSphere`,
          text: `You've been invited to join ${group?.name} on MealSphere. Click the link to join!`,
          url: inviteToken.inviteUrl,
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      setInviteStatus({
        success: true,
        message: data.message,
        details: data.details || data.skipped
      });

      uiToast({
        title: 'Success',
        description: data.message,
      });

      // Only clear emails that were successfully sent
      if (data.invitations?.length > 0) {
        setEmails(emails.filter(email =>
          data.skipped?.existingMembers.includes(email) ||
          data.skipped?.pendingInvitations.includes(email)
        ));
      }
      setCurrentEmail('');
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
        <Skeleton className="h-10 w-[120px]" />
      </div>
    );
  }

  const { name, isPrivate, memberCount, maxMembers } = group;
  const isGroupFull = maxMembers ? memberCount >= maxMembers : false;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={className}
          disabled={isGroupFull}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Members
          {isGroupFull && <span className="ml-2 text-xs">(Full)</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto rounded-lg sm:rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Invite to {name}</DialogTitle>
          <DialogDescription className="text-sm">
            Invite others to join your group via link, custom token, or email invitation.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1">
            <TabsTrigger value="link" className="text-xs sm:text-sm py-2 px-1 sm:px-3">Invite Link</TabsTrigger>
            <TabsTrigger value="custom" className="text-xs sm:text-sm py-2 px-1 sm:px-3">Custom Invite</TabsTrigger>
            <TabsTrigger value="email" className="text-xs sm:text-sm py-2 px-1 sm:px-3">Email Invite</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
              <div className="grid flex-1 gap-1 w-full">
                <Label htmlFor="invite-link" className="text-sm font-medium">
                  Invitation Link
                </Label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                  {loading ? (
                    <Skeleton className="h-8 w-full" />
                  ) : (
                    <Input
                      id="invite-link"
                      value={inviteToken?.inviteUrl || ''}
                      readOnly
                      className="h-8 text-xs"
                    />
                  )}
                  <div className="flex space-x-2 justify-center sm:justify-start">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleCopyLink}
                            className="h-8 px-3"
                            disabled={loading || !inviteToken}
                          >
                            {copied ? (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4 mr-1" />
                                Copy
                              </>
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
                            size="sm"
                            variant="outline"
                            onClick={handleShare}
                            className="h-8 px-3"
                            disabled={loading || !inviteToken}
                          >
                            <Share2 className="h-4 w-4 mr-1" />
                            Share
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-3">QR Code</p>
                <div className="p-4 border rounded-lg bg-white dark:bg-gray-800 flex flex-col items-center">
                  {loading ? (
                    <Skeleton className="h-[120px] w-[120px] rounded-lg" />
                  ) : inviteToken ? (
                    <QRCodeSVG
                      value={inviteToken.inviteUrl}
                      size={120}
                      level="H"
                      includeMargin={false}
                      className="p-1 bg-white rounded-lg"
                    />
                  ) : (
                    <div className="h-[120px] w-[120px] flex items-center justify-center text-muted-foreground rounded-lg border">
                      No link available
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Scan to join {group.name}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {inviteToken && (
                  <div className="text-xs text-muted-foreground space-y-2">
                    <div className="flex justify-between">
                      <span>Role:</span>
                      <span className="font-medium">{ROLE_OPTIONS.find(r => r.value === inviteToken.role)?.label}</span>
                    </div>
                    {inviteToken.expiresAt && (
                      <div className="flex justify-between">
                        <span>Expires:</span>
                        <span className="font-medium">{new Date(inviteToken.expiresAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateInviteToken}
                    disabled={loading}
                    className="flex-1"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Regenerate
                  </Button>
                </div>

                {group?.isPrivate && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm">
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

                {!group?.isPrivate && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm">
                    <div className="flex items-start">
                      <Users className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-200">Public Group</p>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                          Anyone with the link can join this group directly.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="custom-role">Default Role</Label>
                  <Select value={selectedRole} onValueChange={(value: Role) => setSelectedRole(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <div>
                            <div className="font-medium">{role.label}</div>
                            <div className="text-xs text-muted-foreground">{role.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom-expiry">Expiration Time</Label>
                  <Select value={customExpiry.toString()} onValueChange={(value) => setCustomExpiry(parseFloat(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select expiration" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPIRATION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {inviteToken && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Invite URL</Label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                      <Input
                        value={inviteToken.inviteUrl}
                        readOnly
                        className="text-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleCopyLink}
                        className="sm:w-auto"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {inviteToken ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Current Settings</Label>
                      <div className="p-3 bg-muted rounded-lg space-y-2">
                        <div>
                          <span className="text-sm font-medium">Role: </span>
                          <span className="text-sm">{ROLE_OPTIONS.find(r => r.value === inviteToken.role)?.label}</span>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Expires: </span>
                          <span className="text-sm">
                            {inviteToken.expiresAt
                              ? new Date(inviteToken.expiresAt).toLocaleString()
                              : 'Never expires'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                      <div className="flex items-start">
                        <AlertCircle className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-blue-800 dark:text-blue-200">Custom Settings</p>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                            Configure the role and expiration time for your invite token before generating.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm">
                      <div className="flex items-start">
                        <Users className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-green-800 dark:text-green-200">Multiple Joins</p>
                          <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                            The same invite link can be used by multiple people until it expires or the group is full.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {inviteToken ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateInviteToken}
                    disabled={loading || !selectedRole || customExpiry === undefined}
                    className="flex-1"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Generate Token
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleShare}
                    disabled={loading}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </>
              ) : (
                <div className="text-center w-full py-6">
                  <div className="text-muted-foreground mb-4">
                    <Settings className="h-10 w-10 mx-auto mb-2" />
                    <p className="text-sm">Select role and expiry time to generate invite token</p>
                  </div>
                  <Button
                    type="button"
                    onClick={generateInviteToken}
                    disabled={loading || !selectedRole || customExpiry === undefined}
                    className="w-full sm:w-auto"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Settings className="mr-2 h-4 w-4" />
                        Generate Token
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <form onSubmit={handleGenerateInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Addresses (up to 10)</Label>
                <div className="flex flex-col sm:flex-row gap-2">
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
                    className="sm:w-auto"
                  >
                    Add
                  </Button>
                </div>
                {emails.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {emails.map((email) => {
                      const isPending = inviteStatus?.details?.pendingInvitations.includes(email);
                      const isMember = inviteStatus?.details?.existingMembers.includes(email);

                      return (
                        <Badge
                          key={email}
                          variant={isPending || isMember ? "outline" : "secondary"}
                          className={`flex items-center gap-1 px-3 py-1.5 text-xs ${isPending ? "border-amber-500 text-amber-500" :
                            isMember ? "border-green-500 text-green-500" : ""
                            }`}
                        >
                          {isPending ? (
                            <AlertCircle className="h-3 w-3" />
                          ) : isMember ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Mail className="h-3 w-3" />
                          )}
                          <span className="text-xs truncate max-w-[120px] sm:max-w-none">{email}</span>
                          {!isPending && !isMember && (
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
                          )}
                        </Badge>
                      );
                    })}
                  </div>
                )}
                {emails.length >= 10 && (
                  <p className="text-sm text-muted-foreground">
                    Maximum 10 email addresses allowed
                  </p>
                )}
              </div>

              {inviteStatus && (
                <div className={`p-3 rounded-md text-sm ${inviteStatus.success
                  ? "bg-green-50 dark:bg-green-900/20"
                  : "bg-amber-50 dark:bg-amber-900/20"
                  }`}>
                  <div className="flex items-start">
                    {inviteStatus.success ? (
                      <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className={`font-medium ${inviteStatus.success
                        ? "text-green-800 dark:text-green-200"
                        : "text-amber-800 dark:text-amber-200"
                        }`}>
                        {inviteStatus.message}
                      </p>
                      {inviteStatus.details && (
                        <div className="mt-1 text-xs">
                          {inviteStatus.details.pendingInvitations.length > 0 && (
                            <p className="text-amber-700 dark:text-amber-300">
                              {inviteStatus.details.pendingInvitations.length} email(s) already have pending invitations
                            </p>
                          )}
                          {inviteStatus.details.existingMembers.length > 0 && (
                            <p className="text-green-700 dark:text-green-300">
                              {inviteStatus.details.existingMembers.length} email(s) are already members
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isGenerating || emails.length === 0}
              >
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
