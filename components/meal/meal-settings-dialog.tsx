// Dialog component for meal settings, extracted from meal-management.tsx
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import React from "react";

interface MealSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealSettings: any;
  updateMealSettings: (settings: Partial<any>) => void;
}

const MealSettingsDialog: React.FC<MealSettingsDialogProps> = ({ open, onOpenChange, mealSettings, updateMealSettings }) => {
  // Local state for optimistic updates
  const [localSettings, setLocalSettings] = React.useState(mealSettings);

  // Sync local state when prop changes
  React.useEffect(() => {
    setLocalSettings(mealSettings);
  }, [mealSettings]);

  const handleUpdate = (updates: Partial<any>) => {
    // Optimistically update local state
    setLocalSettings((prev: any) => ({ ...prev, ...updates }));
    // Trigger actual update
    updateMealSettings(updates);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-lg">
        <DialogHeader>
          <DialogTitle>Meal Settings</DialogTitle>
          <DialogDescription>
            Configure meal times and settings for the group
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Breakfast Time</Label>
              <Input
                type="time"
                value={localSettings?.breakfastTime || "08:00"}
                onChange={(e) => handleUpdate({ breakfastTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Lunch Time</Label>
              <Input
                type="time"
                value={localSettings?.lunchTime || "13:00"}
                onChange={(e) => handleUpdate({ lunchTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Dinner Time</Label>
              <Input
                type="time"
                value={localSettings?.dinnerTime || "20:00"}
                onChange={(e) => handleUpdate({ dinnerTime: e.target.value })}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Meal System</Label>
                {/* <p className="text-sm text-muted-foreground">
                  Enable automatic meal scheduling
                </p> */}
              </div>
              <Switch
                checked={localSettings?.autoMealEnabled || false}
                onCheckedChange={(checked) => handleUpdate({ autoMealEnabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Guest Meals</Label>
                {/* <p className="text-sm text-muted-foreground">
                  Allow members to add guest meals
                </p> */}
              </div>
              <Switch
                checked={localSettings?.allowGuestMeals || false}
                onCheckedChange={(checked) => handleUpdate({ allowGuestMeals: checked })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max Meals Per Day</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={localSettings?.maxMealsPerDay || 3}
                onChange={(e) => handleUpdate({ maxMealsPerDay: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Guest Meal Limit</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={localSettings?.guestMealLimit || 5}
                onChange={(e) => handleUpdate({ guestMealLimit: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MealSettingsDialog; 