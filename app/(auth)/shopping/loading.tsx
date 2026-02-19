import { Loader } from "@/components/ui/loader";

export default function Loading() {
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <Loader size="lg" />
        </div>
    );
}
