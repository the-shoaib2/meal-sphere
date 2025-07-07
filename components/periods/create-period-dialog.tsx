'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CreatePeriodData } from '@/hooks/use-periods';

interface CreatePeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePeriodData) => Promise<void>;
  disabled?: boolean;
}

export function CreatePeriodDialog({ open, onOpenChange, onSubmit, disabled }: CreatePeriodDialogProps) {
  const [formData, setFormData] = useState<CreatePeriodData>({
    name: '',
    startDate: new Date(),
    endDate: null,
    openingBalance: 0,
    carryForward: false,
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
      setFormData({
        name: '',
        startDate: new Date(),
        endDate: null,
        openingBalance: 0,
        carryForward: false,
        notes: '',
      });
    } catch (error) {
      console.error('Error creating period:', error);
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
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <Plus className="h-4 w-4 mr-2" />
          Start New Period
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start New Meal Period</DialogTitle>
          <DialogDescription>
            Create a new meal period with custom start and end dates. All meals, shopping, and expenses will be tracked within this period.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Period Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., January 2024, Q1 2024"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.startDate && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {formData.startDate ? format(formData.startDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={formData.startDate}
                    onSelect={(date) => date && handleInputChange('startDate', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.endDate && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {formData.endDate ? format(formData.endDate, 'PPP') : <span>Pick a date (optional)</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={formData.endDate || undefined}
                    onSelect={(date) => handleInputChange('endDate', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="openingBalance">Opening Balance</Label>
            <Input
              id="openingBalance"
              type="number"
              step="0.01"
              value={formData.openingBalance}
              onChange={(e) => handleInputChange('openingBalance', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="carryForward"
              checked={formData.carryForward}
              onCheckedChange={(checked) => handleInputChange('carryForward', checked)}
            />
            <Label htmlFor="carryForward">Carry forward balance from previous period</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any additional notes about this period..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name}>
              {isSubmitting ? 'Creating...' : 'Start Period'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 