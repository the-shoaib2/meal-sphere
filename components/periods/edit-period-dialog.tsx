import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { PeriodCalendar } from './period-calendar';
import { cn } from '@/lib/utils';
import { CreatePeriodData } from '@/hooks/use-periods';
import { MealPeriod } from '@prisma/client';

interface EditPeriodDialogProps {
    period: MealPeriod;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: Partial<CreatePeriodData>) => Promise<void>;
}

export function EditPeriodDialog({
    period,
    open,
    onOpenChange,
    onSubmit,
}: EditPeriodDialogProps) {
    const [formData, setFormData] = useState<Partial<CreatePeriodData>>({
        name: period.name,
        startDate: new Date(period.startDate),
        endDate: period.endDate ? new Date(period.endDate) : null,
        openingBalance: period.openingBalance || 0,
        carryForward: period.carryForward || false,
        notes: period.notes || '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setFormData({
                name: period.name,
                startDate: new Date(period.startDate),
                endDate: period.endDate ? new Date(period.endDate) : null,
                openingBalance: period.openingBalance || 0,
                carryForward: period.carryForward || false,
                notes: period.notes || '',
            });
        }
    }, [open, period]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await onSubmit(formData);
            onOpenChange(false);
        } catch (error) {
            console.error('Error updating period:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInputChange = (field: keyof CreatePeriodData, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Meal Period</DialogTitle>
                    <DialogDescription>
                        Update the details for this meal period.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-name">Period Name</Label>
                        <Input
                            id="edit-name"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            placeholder="e.g., January 2024"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <PeriodCalendar
                                title="Start Date"
                                selected={formData.startDate}
                                onSelect={(date) => date && handleInputChange('startDate', date)}
                                align="start"
                            />
                        </div>

                        <div className="space-y-2">
                            <PeriodCalendar
                                title="End Date"
                                selected={formData.endDate || undefined}
                                onSelect={(date) => handleInputChange('endDate', date)}
                                align="end"
                                placeholder="End Date"
                                disabledDays={(date) =>
                                    !!formData.startDate && (date <= formData.startDate)
                                }
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-openingBalance">Opening Balance</Label>
                        <Input
                            id="edit-openingBalance"
                            type="number"
                            step="0.01"
                            value={formData.openingBalance}
                            onChange={(e) => handleInputChange('openingBalance', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="edit-carryForward"
                            checked={formData.carryForward}
                            onCheckedChange={(checked) => handleInputChange('carryForward', checked)}
                        />
                        <Label htmlFor="edit-carryForward">Carry forward balance</Label>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-notes">Notes (Optional)</Label>
                        <Textarea
                            id="edit-notes"
                            value={formData.notes || ''}
                            onChange={(e) => handleInputChange('notes', e.target.value)}
                            placeholder="Any additional notes..."
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !formData.name}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
