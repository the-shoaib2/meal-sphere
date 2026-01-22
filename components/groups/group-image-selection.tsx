"use client";

import { useState } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImagePicker } from "@/components/shared/image-picker";
import { cn } from "@/lib/utils";

import { ImageViewDialog } from "../shared/image-view-dialog";

interface GroupImageSelectionProps {
    selectedImage: string;
    onSelect: (image: string) => void;
    isEditing?: boolean;
}

interface ImageItem {
    id: string;
    src: string;
    alt: string;
    category: string;
}

export function GroupImageSelection({ selectedImage, onSelect, isEditing = false }: GroupImageSelectionProps) {
    const [open, setOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);

    const handleImageClick = () => {
        if (!isEditing && selectedImage) {
            setViewOpen(true);
        }
    };

    return (
        <div className="space-y-4">
            <Label>Group Image</Label>

            <div className="flex items-center gap-4">
                {/* Circular Preview Area - Persistent Camera Icon */}
                <div
                    className={cn(
                        "group relative h-20 w-20 rounded-full overflow-hidden border-2 border-muted bg-muted shrink-0",
                        !isEditing && selectedImage && "cursor-pointer"
                    )}
                    onClick={handleImageClick}
                >
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

                    {/* Always Visible Camera Icon Button - Only in Edit Mode */}
                    {isEditing && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="bg-black/40 text-white hover:bg-black/60 hover:text-white rounded-full h-8 w-8 transition-all hover:scale-110"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpen(true);
                                }}
                            >
                                <Camera className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>

                <ImagePicker
                    open={open}
                    onOpenChange={setOpen}
                    selectedImage={selectedImage}
                    onSelect={onSelect}
                    title="Select Group Photo"
                    description="Choose a suggested image for your group."
                />

                <ImageViewDialog
                    open={viewOpen}
                    onOpenChange={setViewOpen}
                    imageSrc={selectedImage}
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
