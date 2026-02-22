import { Sparkles } from "lucide-react";

export function JoinTip() {
    return (
        <div className="mt-12 p-6 rounded-lg bg-muted/50 border border-muted hidden lg:block">
            <div className="flex items-center gap-3 mb-3 text-primary">
                <Sparkles className="h-5 w-5" />
                <h3 className="font-semibold">Pro Tip</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
                Private groups require an admin's approval. Make sure to include a helpful message when requesting to join.
            </p>
        </div>
    );
}
