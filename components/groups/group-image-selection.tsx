"use client";

import { useState } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImagePicker } from "@/components/shared/image-picker";

interface GroupImageSelectionProps {
    selectedImage: string;
    onSelect: (image: string) => void;
}

interface ImageItem {
    id: string;
    src: string;
    alt: string;
    category: string;
}

export function GroupImageSelection({ selectedImage, onSelect }: GroupImageSelectionProps) {
    const [open, setOpen] = useState(false);


    return (
        <div className="space-y-4">
            <Label>Group Image</Label>

            <div className="flex items-center gap-4">
                {/* Circular Preview Area - Persistent Camera Icon */}
                <div className="group relative h-20 w-20 rounded-full overflow-hidden border-2 border-muted bg-muted shrink-0">
                    {selectedImage ? (
                        <>
                            <Image
                                src={selectedImage}
                                alt="Group Avatar"
                                fill
                                className="object-cover"
                                sizes="80px"
                            />
                            {/* Dark overlay always present slightly to show icon, or just rely on icon */}
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                        </>
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted">
                        </div>
                    )}

                    {/* Always Visible Camera Icon Button */}
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="bg-black/40 text-white hover:bg-black/60 hover:text-white rounded-full h-8 w-8 transition-all hover:scale-110"
                            onClick={() => setOpen(true)}
                        >
                            <Camera className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <ImagePicker
                    open={open}
                    onOpenChange={setOpen}
                    selectedImage={selectedImage}
                    onSelect={onSelect}
                    title="Select Group Photo"
                    description="Choose a suggested image for your group."
                />

                {!selectedImage && (
                    <div className="space-y-1">
                        <p className="text-xs text-destructive font-medium">
                            Required: Select an image
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
