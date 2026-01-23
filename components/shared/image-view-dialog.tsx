import Image from "next/image";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";

interface ImageViewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    imageSrc: string;
}

export function ImageViewDialog({ open, onOpenChange, imageSrc }: ImageViewDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-transparent border-none shadow-none text-white">
                <DialogTitle className="sr-only">View Group Image</DialogTitle>
                <div className="relative aspect-square w-full h-full max-h-[80vh] flex items-center justify-center">
                    {imageSrc && (
                        <Image
                            src={imageSrc}
                            alt="Group Avatar View"
                            width={600}
                            height={600}
                            className="object-contain rounded-full"
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
