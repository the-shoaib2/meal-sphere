// Dialog component for auto meal settings, extracted from meal-management.tsx
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import React from "react";

interface AutoMealSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  autoMealSettings: any;
  updateAutoMealSettings: (settings: Partial<any>) => void;
}

const AutoMealSettingsDialog: React.FC<AutoMealSettingsDialogProps> = ({ open, onOpenChange, autoMealSettings, updateAutoMealSettings }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-[500px] rounded-lg">
      <DialogHeader>
        <DialogTitle>Auto Meal Settings</DialogTitle>
        <DialogDescription>
          Configure your automatic meal preferences
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Auto Meals</Label>
            <p className="text-sm text-muted-foreground">
              Automatically add meals based on your schedule
            </p>
          </div>
          <Switch
            checked={autoMealSettings?.isEnabled || false}
            onCheckedChange={(checked) => updateAutoMealSettings({ isEnabled: checked })}
          />
        </div>
        <Separator />
        {autoMealSettings?.isEnabled && (
          <div className="space-y-3">
            <Label>Meal Types</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Breakfast</Label>
                <Switch
                  checked={autoMealSettings?.breakfastEnabled ?? true}
                  onCheckedChange={(checked) => updateAutoMealSettings({ breakfastEnabled: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Lunch</Label>
                <Switch
                  checked={autoMealSettings?.lunchEnabled ?? true}
                  onCheckedChange={(checked) => updateAutoMealSettings({ lunchEnabled: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Dinner</Label>
                <Switch
                  checked={autoMealSettings?.dinnerEnabled ?? true}
                  onCheckedChange={(checked) => updateAutoMealSettings({ dinnerEnabled: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Auto Guest Meal</Label>
                <Switch
                  checked={autoMealSettings?.guestMealEnabled ?? false}
                  onCheckedChange={(checked) => updateAutoMealSettings({ guestMealEnabled: checked })}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </DialogContent>
  </Dialog>
);

export default AutoMealSettingsDialog; 