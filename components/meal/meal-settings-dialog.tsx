// Dialog component for meal settings, extracted from meal-management.tsx
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

interface MealSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealSettings: any;
  updateMealSettings: (settings: Partial<any>) => Promise<void>;
}

const MealSettingsDialog: React.FC<MealSettingsDialogProps> = ({ open, onOpenChange, mealSettings, updateMealSettings }) => {
  // Local state for edits
  const [localSettings, setLocalSettings] = useState(mealSettings);
  const [isSaving, setIsSaving] = useState(false);

  // Sync local state when prop changes or dialog opens
  useEffect(() => {
    if (open) {
      setLocalSettings(mealSettings);
    }
  }, [mealSettings, open]);

  const handleUpdate = (updates: Partial<any>) => {
    setLocalSettings((prev: any) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMealSettings(localSettings);
      // toast.success("Settings updated successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating meal settings:", error);
      toast.error("Failed to update settings");
    } finally {
      setIsSaving(false);
    }
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
              </div>
              <Switch
                checked={localSettings?.autoMealEnabled || false}
                onCheckedChange={(checked) => handleUpdate({ autoMealEnabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Guest Meals</Label>
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

        <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="w-full sm:w-auto hover:text-red-500 hover:bg-red-50/10 transition-colors"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto hover:bg-primary/90 transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MealSettingsDialog;
