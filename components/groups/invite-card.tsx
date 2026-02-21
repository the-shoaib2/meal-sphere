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
} from "@/components/ui/dialog";
import { Copy, Loader2, Lock, Mail, Share2, UserPlus, X, Check, AlertCircle, Users, Settings, Shield, UserCog, ChefHat, BadgeDollarSign, ShoppingCart, Scale, Ban, RefreshCw } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";


interface InviteTokenData {
  token: string;
  expiresAt: string | null;
  role: string;
  inviteUrl: string;
}

interface InviteCardProps {
  groupId: string;
  group?: any;
  className?: string;
  initialTokens?: any[];
  canInvite?: boolean;
}

interface InviteStatus {
  success: boolean;
  message: string;
  details?: {
    existingMembers: string[];
    pendingInvitations: string[];
  };
}

const ROLE_OPTIONS = [
  {
    value: 'MEMBER',
    label: 'Member',
    description: 'Can view and participate in group activities',
    icon: Users,
    color: 'text-blue-500'
  },
  {
    value: 'ADMIN',
    label: 'Admin',
    description: 'Full access to group settings and management',
    icon: Shield,
    color: 'text-red-500'
  },
  {
    value: 'MODERATOR',
    label: 'Moderator',
    description: 'Can manage members and content',
    icon: UserCog,
    color: 'text-amber-500'
  },
  {
    value: 'MANAGER',
    label: 'Manager',
    description: 'Can manage group operations',
    icon: Scale,
    color: 'text-indigo-500'
  },
  {
    value: 'LEADER',
    label: 'Leader',
    description: 'Can lead group activities',
    icon: UserPlus,
    color: 'text-emerald-500'
  },
  {
    value: 'MEAL_MANAGER',
    label: 'Meal Manager',
    description: 'Can manage group meals',
    icon: ChefHat,
    color: 'text-orange-500'
  },
  {
    value: 'ACCOUNTANT',
    label: 'Accountant',
    description: 'Can manage group finances',
    icon: BadgeDollarSign,
    color: 'text-green-500'
  },
  {
    value: 'MARKET_MANAGER',
    label: 'Market Manager',
    description: 'Can manage group markets',
    icon: ShoppingCart,
    color: 'text-purple-500'
  }
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

import { useGroups } from "@/hooks/use-groups";

export function InviteCard({ groupId, group: initialGroup, className = '', initialTokens = [], canInvite = true }: InviteCardProps) {
  const { useGroupDetails } = useGroups();
  const { data: group, isLoading } = useGroupDetails(groupId, initialGroup);


  const [isOpen, setIsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('MEMBER');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [isGenerating, setIsGenerating] = useState(false);

  // Use first valid initial token if available
  const [inviteToken, setInviteToken] = useState<InviteTokenData | null>(() => {
    if (initialTokens && initialTokens.length > 0) {
      return initialTokens[0];
    }
    return null;
  });

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'custom' | 'email'>('link');
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState<InviteStatus | null>(null);
  const [customExpiry, setCustomExpiry] = useState(7);

  const { toast: uiToast } = useToast();

  const generateInviteToken = useCallback(async () => {
    try {
      setLoading(true);

      // Use the appropriate expiry time based on active tab
      const expiryTime = activeTab === 'custom' ? customExpiry : expiresInDays;

      // Replacing API call with Server Action
      const response = await fetch(`/api/groups/${groupId}/invites/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole }) // Default role or selected
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to generate link');
      }

      const data = await response.json();

      setInviteToken({
        token: data.token,
        expiresAt: data.expiresAt,
        role: data.role,
        inviteUrl: data.url
      });

      uiToast({
        title: "Success",
        description: "Invite token generated successfully",
      });
    } catch (error: any) {
      console.error('Error generating invite token:', error);
      uiToast({
        title: "Error",
        description: error.message || "Failed to generate invite token",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [groupId, selectedRole, customExpiry, expiresInDays, activeTab, uiToast]);


  // Auto-generate invite token when dialog opens on link tab
  useEffect(() => {
    const hasValidToken = initialTokens && initialTokens.length > 0;

    if (isOpen && activeTab === 'link' && !inviteToken && !loading && !hasValidToken) {
      generateInviteToken();
    }
  }, [isOpen, activeTab, inviteToken, loading, generateInviteToken, initialTokens]);

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

      // Sending via Server Action
      const response = await fetch(`/api/groups/${group.id}/invites/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails,
          role: 'MEMBER'
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to send invitations');
      }

      const data = await response.json();

      setInviteStatus({
        success: true,
        message: data.message,
        details: data.skipped
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

  if (!group && !isLoading) return null;
  if (!canInvite) return null;

  const name = group?.name || "Group";
  const memberCount = group?.memberCount;
  const members = group?.members;
  const maxMembers = group?.maxMembers;

  // Use the actual members array length if available (safest guard against desync), otherwise fallback to the cached memberCount
  const currentCount = (Array.isArray(members) && members.length > 0) ? members.length : (memberCount ?? 0);
  const isGroupFull = maxMembers ? currentCount >= maxMembers : false;
  const isInitialLoading = !group && isLoading;


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button

          variant="default"
          className={className}
          disabled={isGroupFull || isInitialLoading}
        >
          {isInitialLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <UserPlus className="h-4 w-4 mr-2" />
          )}
          Invite Members
          {isGroupFull && <span className="ml-1 text-xs">(Full)</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto rounded-lg sm:rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Invite to {name}</DialogTitle>
          <DialogDescription className="text-sm">
            Invite others to join your group via link, custom token, or email invitation.
          </DialogDescription>
        </DialogHeader>

        {(isInitialLoading || (loading && activeTab === 'link' && !inviteToken)) ? (
          <div className="flex flex-col items-center justify-center p-12 min-h-[300px]">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground animate-pulse font-medium">
              {isInitialLoading ? "Loading group details..." : "Generating invitation link..."}
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto p-1">
              <TabsTrigger value="link" className="text-xs sm:text-sm py-2 px-1 sm:px-3">Invite Link</TabsTrigger>
              <TabsTrigger value="custom" className="text-xs sm:text-sm py-2 px-1 sm:px-3">Custom Invite</TabsTrigger>
              <TabsTrigger value="email" className="text-xs sm:text-sm py-2 px-1 sm:px-3">Email Invite</TabsTrigger>
            </TabsList>

            <TabsContent value="link" className="space-y-6 pt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="invite-link" className="text-sm font-semibold">
                      Invitation Link
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="invite-link"
                        value={inviteToken?.inviteUrl || ''}
                        readOnly
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCopyLink}
                        disabled={loading || !inviteToken}
                      >
                        {copied ? (
                          <><Check className="h-4 w-4 mr-2" />Copied</>
                        ) : (
                          <><Copy className="h-4 w-4 mr-2" />Copy Link</>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleShare}
                        disabled={loading || !inviteToken}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 border rounded-xl bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Permissions:</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tight">
                        {inviteToken?.role || 'MEMBER'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Expires:</span>
                      <span className="font-medium">
                        {inviteToken?.expiresAt ? new Date(inviteToken.expiresAt).toLocaleDateString() : 'Never'}
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="default"
                      onClick={generateInviteToken}
                      disabled={loading}
                      className="w-full"
                    >
                      <RefreshCw className={cn("h-3 w-3 mr-2", loading && "animate-spin")} />
                      Regenerate Link
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-3 p-6 border rounded-xl bg-white dark:bg-zinc-900 shadow-sm relative group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50 pointer-events-none" />

                  <div className="relative z-10 p-2 bg-white rounded-lg shadow-inner ring-1 ring-black/5">
                    {inviteToken ? (
                      <QRCodeSVG
                        value={inviteToken.inviteUrl}
                        size={140}
                        level="H"
                        includeMargin={false}
                      />
                    ) : (
                      <div className="h-[140px] w-[140px] flex items-center justify-center border-2 border-dashed rounded-lg">
                        <AlertCircle className="h-8 w-8 text-muted-foreground/20" />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-muted-foreground text-center max-w-[160px] relative z-10">
                    Scan this QR code to join <span className="text-foreground">{group?.name}</span>
                  </p>
                </div>
              </div>

              <div className="flex gap-2 p-3 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">Safety Tip</p>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-normal">
                    Only share this link with people you trust. {group?.isPrivate ? "Admins must approve each join request." : "Anyone with the link can join directly."}
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="custom" className="space-y-6 pt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="custom-role" className="text-sm font-semibold">New Token Role</Label>
                    <Select value={selectedRole} onValueChange={(value: string) => setSelectedRole(value)}>
                      <SelectTrigger className="h-10 bg-muted/30 hover:bg-muted/50 transition-colors rounded-md cursor-pointer">
                        <SelectValue placeholder="Select role">
                          {selectedRole && (
                            <div className="flex items-center gap-2">
                              {(() => {
                                const role = ROLE_OPTIONS.find(r => r.value === selectedRole);
                                const Icon = role?.icon || Users;
                                return <Icon className={cn("h-4 w-4", role?.color)} />;
                              })()}
                              <span className="text-sm">{ROLE_OPTIONS.find(r => r.value === selectedRole)?.label}</span>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-md">
                        <div className="p-1">
                          {ROLE_OPTIONS.map((role) => {
                            const Icon = role.icon;
                            return (
                              <SelectItem
                                key={role.value}
                                value={role.value}
                                className="focus:bg-primary/5 focus:text-primary rounded-sm py-2 px-2 cursor-pointer"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={cn("p-1 rounded-sm bg-muted", role.color.replace('text-', 'bg-').split(' ')[0] + '/10')}>
                                    <Icon className={cn("h-3.5 w-3.5", role.color)} />
                                  </div>
                                  <div className="flex flex-col gap-0">
                                    <span className="text-xs font-semibold">{role.label}</span>
                                    <span className="text-[10px] text-muted-foreground leading-tight line-clamp-1">
                                      {role.description}
                                    </span>
                                  </div>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </div>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom-expiry" className="text-sm font-semibold">Expiration Time</Label>
                    <Select value={customExpiry.toString()} onValueChange={(value) => setCustomExpiry(parseFloat(value))}>
                      <SelectTrigger className="h-10">
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

                  <Button
                    type="button"
                    variant="default"
                    onClick={generateInviteToken}
                    disabled={loading}
                    className="w-full"
                  >
                    <RefreshCw className={cn("h-3 w-3 mr-2", loading && "animate-spin")} />
                    Regenerate
                  </Button>
                </div>

                <div className="space-y-4">
                  <Label className="text-sm font-semibold">Current Active Token</Label>
                  {inviteToken ? (
                    <div className="p-5 border rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 space-y-4 relative overflow-hidden group shadow-sm border-primary/10">
                      <div className="absolute -top-6 -right-6 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity rotate-12">
                        <Lock className="h-24 w-24" />
                      </div>

                      <div className="space-y-4 relative z-10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const role = ROLE_OPTIONS.find(r => r.value === inviteToken.role);
                              const Icon = role?.icon || Users;
                              return (
                                <div className={cn("p-1.5 rounded-lg bg-white dark:bg-zinc-800 shadow-sm", role?.color)}>
                                  <Icon className="h-3.5 w-3.5" />
                                </div>
                              );
                            })()}
                            <span className="text-xs font-bold uppercase tracking-wider">{ROLE_OPTIONS.find(r => r.value === inviteToken.role)?.label}</span>
                          </div>
                          <Badge variant="secondary" className="px-2 py-0 h-5 text-[10px] font-medium bg-primary/10 text-primary border-none">
                            {inviteToken.expiresAt ? 'Temporary' : 'Permanent'}
                          </Badge>
                        </div>

                        <div className="grid gap-2 text-xs">
                          <div className="flex items-center text-muted-foreground bg-white/50 dark:bg-black/20 p-2 rounded-lg">
                            <Settings className="h-3.5 w-3.5 mr-2 text-primary" />
                            <span className="font-medium">Expires:</span>
                            <span className="ml-auto">{inviteToken.expiresAt ? new Date(inviteToken.expiresAt).toLocaleDateString() : 'Never'}</span>
                          </div>
                        </div>

                        <div className="pt-2 flex gap-2">
                          <Button
                            type="button"

                            onClick={handleCopyLink}
                            className="h-9 flex-1 text-xs font-semibold shadow-sm"
                          >
                            {copied ? (
                              <><Check className="h-3.5 w-3.5 mr-2" />Copied</>
                            ) : (
                              <><Copy className="h-3.5 w-3.5 mr-2" />Copy Link</>
                            )}
                          </Button>
                          <Button
                            type="button"

                            variant="outline"
                            onClick={handleShare}
                            className="h-9 w-9 p-0 hover:bg-primary/5 hover:text-primary transition-colors"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative flex flex-col items-center justify-center h-[200px] p-8 text-center border-2 border-dashed rounded-2xl bg-muted/5 group/placeholder overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover/placeholder:opacity-100 transition-opacity" />
                      <div className="p-4 rounded-full bg-muted/50 mb-4 group-hover/placeholder:scale-110 transition-transform duration-300">
                        <Lock className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                      <h4 className="text-sm font-semibold mb-1">No Active Token</h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[180px]">
                        Configure a role and expiration time on the left to generate your custom invite token.
                      </p>
                    </div>
                  )}

                  <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20">
                    <div className="flex items-start gap-2 text-blue-800 dark:text-blue-200">
                      <Users className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] leading-normal">
                        Custom tokens allow you to control access levels and expiration times for specific invitees.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="email" className="space-y-6 pt-4">
              <form onSubmit={handleGenerateInvite} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-sm font-semibold">Invite via Email</Label>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      type="email"
                      value={currentEmail}
                      onChange={(e) => setCurrentEmail(e.target.value)}
                      placeholder="Enter email address"
                      disabled={isGenerating}
                      className="h-10 px-4 bg-muted/30 border-dashed"
                    />
                    <Button
                      type="button"
                      onClick={handleAddEmail}
                      disabled={isGenerating || !currentEmail || emails.length >= 10}
                      className="h-10 px-6 font-semibold"
                    >
                      Add
                    </Button>
                  </div>

                  {emails.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {emails.map((email) => {
                        const isPending = inviteStatus?.details?.pendingInvitations.includes(email);
                        const isMember = inviteStatus?.details?.existingMembers.includes(email);

                        return (
                          <Badge
                            key={email}
                            variant={isPending || isMember ? "outline" : "secondary"}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${isPending ? "border-amber-500/50 bg-amber-500/5 text-amber-600 dark:text-amber-400" :
                              isMember ? "border-green-500/50 bg-green-500/5 text-green-600 dark:text-green-400" :
                                "bg-muted/50 border-transparent"
                              }`}
                          >
                            {isPending ? (
                              <AlertCircle className="h-3 w-3" />
                            ) : isMember ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Mail className="h-3 w-3" />
                            )}
                            <span className="text-[11px] font-medium truncate max-w-[150px]">{email}</span>
                            {!isPending && !isMember && (
                              <button
                                type="button"
                                onClick={() => handleRemoveEmail(email)}
                                disabled={isGenerating}
                                className="ml-1 text-muted-foreground hover:text-red-500 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  {emails.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-xl bg-muted/5">
                      <Mail className="h-8 w-8 text-muted-foreground/20 mb-2" />
                      <p className="text-xs text-muted-foreground">Add up to 10 email addresses to send invitations</p>
                    </div>
                  )}
                </div>

                {inviteStatus && (
                  <div className={`p-4 rounded-xl border text-sm animate-in fade-in slide-in-from-top-1 duration-300 ${inviteStatus.success
                    ? "bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-900/20"
                    : "bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/20"
                    }`}>
                    <div className="flex items-start">
                      {inviteStatus.success ? (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="space-y-1">
                        <p className={`font-semibold text-xs ${inviteStatus.success ? "text-green-900 dark:text-green-200" : "text-amber-900 dark:text-amber-200"
                          }`}>
                          {inviteStatus.message}
                        </p>
                        {inviteStatus.details && (
                          <div className="flex flex-col gap-0.5 opacity-80">
                            {inviteStatus.details.pendingInvitations.length > 0 && (
                              <p className="text-[10px]">
                                • {inviteStatus.details.pendingInvitations.length} already have pending invites
                              </p>
                            )}
                            {inviteStatus.details.existingMembers.length > 0 && (
                              <p className="text-[10px]">
                                • {inviteStatus.details.existingMembers.length} are already members
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
                  className="w-full h-11 font-bold rounded-xl shadow-sm"
                  disabled={isGenerating || emails.length === 0}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Invitations...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Invitations ({emails.length})
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
