'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Search, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function JoinGroupForm() {
    const router = useRouter();
    const [value, setValue] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!value.trim()) {
            toast.error('Please enter a Group ID or Invite Code');
            return;
        }

        setIsSubmitting(true);
        // Redirect to the dynamic join page
        router.push(`/groups/join/${value.trim()}`);
    };

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Join by ID or Code</CardTitle>
                <CardDescription>
                    Paste the Group ID or the 10-character invite code you received.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="id-or-code">Group ID / Invite Code</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="id-or-code"
                                placeholder="e.g. ABCDEFGHIJ or UUID..."
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                disabled={isSubmitting}
                                className="pl-9"
                            />
                        </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Finding Group...
                            </>
                        ) : (
                            'Continue'
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
