'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Search, Loader2, ArrowRight, Compass, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

export function JoinGroupForm() {
    const router = useRouter();
    const [value, setValue] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedValue = value.trim();
        if (!trimmedValue) {
            toast.error('Please enter a Group ID or Invite Code');
            return;
        }

        setIsSubmitting(true);
        // Redirect to the dynamic join page
        router.push(`/groups/join/${trimmedValue}`);
    };

    return (
        <Card className="w-full border-muted bg-card shadow-sm">
            <CardHeader className="text-center pb-8 border-b bg-muted/30">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Compass className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl font-bold tracking-tight">Access Your Group</CardTitle>
                <CardDescription className="text-sm">
                    Enter your unique invite code or group identifier to join your community.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label
                            htmlFor="id-or-code"
                            className={cn(
                                "text-sm font-medium transition-colors",
                                isFocused ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            Invite Code or Group ID
                        </Label>
                        <div className="relative group">
                            <div className={cn(
                                "absolute inset-y-0 left-0 flex items-center pl-3 pr-2 text-muted-foreground transition-colors",
                                isFocused && "text-primary"
                            )}>
                                <Search className="h-4 w-4" />
                            </div>
                            <Input
                                id="id-or-code"
                                placeholder="e.g. 5x7h9p2 or UUID..."
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                disabled={isSubmitting}
                                className="pl-9 bg-background"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 border border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/20 text-amber-800 dark:text-amber-300">
                        <ShieldCheck className="h-4 w-4 shrink-0" />
                        <p className="text-[10px] font-medium leading-tight">Invitation codes are case-sensitive.</p>
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Validating...
                            </>
                        ) : (
                            <>
                                Continue
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="pt-0 pb-6 flex flex-col space-y-4">
                <div className="relative w-full">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                        <span className="bg-card px-3">Or Discover</span>
                    </div>
                </div>
            </CardFooter>
        </Card>
    );
}
