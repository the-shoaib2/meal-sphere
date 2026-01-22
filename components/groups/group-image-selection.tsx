"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Check, Camera, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import axios from "axios";

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
    const [tempSelected, setTempSelected] = useState(selectedImage);
    const [images, setImages] = useState<ImageItem[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const observer = useRef<IntersectionObserver | null>(null);

    // Fetch images from API
    const fetchImages = useCallback(async (pageNum: number, reset = false) => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const response = await axios.get(`/api/images/group-images?page=${pageNum}&limit=15`); // Load more since they are smaller
            const newImages = response.data.images;
            setImages(prev => reset ? newImages : [...prev, ...newImages]);
            setHasMore(response.data.hasMore);
        } catch (error) {
            console.error("Failed to fetch images:", error);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading]);

    // Initial load
    useEffect(() => {
        if (open && images.length === 0) {
            fetchImages(1, true);
        }
    }, [open, fetchImages, images.length]);

    // Infinite scroll observer
    const lastImageRef = useCallback((node: HTMLDivElement) => {
        if (isLoading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prev => {
                    const nextPage = prev + 1;
                    fetchImages(nextPage);
                    return nextPage;
                });
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoading, hasMore, fetchImages]);

    const handleSave = () => {
        onSelect(tempSelected);
        setOpen(false);
    };

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
                            {/* Placeholder background if needed, currently plain muted */}
                        </div>
                    )}

                    {/* Always Visible Camera Icon Button */}
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="bg-black/40 text-white hover:bg-black/60 hover:text-white rounded-full h-8 w-8 transition-all hover:scale-110"
                                    onClick={() => {
                                        setTempSelected(selectedImage);
                                        if (images.length === 0) setPage(1);
                                    }}
                                >
                                    <Camera className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            {/* Compact Dialog */}
                            <DialogContent className="sm:max-w-md md:max-w-lg h-[600px] max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                                <DialogHeader className="px-4 py-3 border-b">
                                    <DialogTitle className="text-lg">Select Profile Photo</DialogTitle>
                                    <DialogDescription className="text-xs">
                                        Choose a suggested image for your group.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="flex-1 overflow-hidden flex flex-col bg-muted/5">
                                    <ScrollArea className="flex-1 p-4">
                                        {/* Smaller Grid Images: grid-cols-4 sm:grid-cols-5 */}
                                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                                            {images.map((image, index) => {
                                                const isLast = index === images.length - 1;
                                                const isSelected = tempSelected === image.src;
                                                return (
                                                    <div
                                                        key={image.id + index}
                                                        ref={isLast ? lastImageRef : null}
                                                        onClick={() => setTempSelected(image.src)}
                                                        className={cn(
                                                            "relative aspect-square cursor-pointer overflow-hidden rounded-full border-2 transition-all hover:opacity-90",
                                                            isSelected
                                                                ? "border-blue-500 ring-2 ring-blue-500 ring-offset-1" // Blue border requested
                                                                : "border-transparent hover:border-gray-300"
                                                        )}
                                                    >
                                                        <Image
                                                            src={image.src}
                                                            alt={image.alt}
                                                            fill
                                                            className="object-cover"
                                                            sizes="(max-width: 640px) 25vw, 80px"
                                                        />
                                                        {isSelected && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                                                <Check className="h-4 w-4 text-white drop-shadow-md" />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {isLoading && (
                                            <div className="py-6 flex justify-center w-full">
                                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                            </div>
                                        )}
                                    </ScrollArea>
                                </div>

                                <DialogFooter className="px-4 py-3 border-t bg-muted/10">
                                    <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                                    <Button size="sm" onClick={handleSave}>Set as Group Photo</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

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
