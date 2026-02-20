"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function AddBalanceButton() {
    const handleOpenDialog = () => {
        // Dispatch an event to instantly open the dialog without server delays
        window.dispatchEvent(new Event("open-add-transaction-dialog"));
    };

    return (
        <Button
            size="sm"
            onClick={handleOpenDialog}
            className="w-full sm:w-auto shadow-sm transition-all hover:shadow-md active:scale-95"
        >
            <Plus className="h-4 w-4 mr-2" /> Add Balance
        </Button>
    );
}
