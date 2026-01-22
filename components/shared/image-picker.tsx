"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import axios from "axios";

interface ImageItem {
    id: string;
    src: string;
    alt: string;
    category: string;
}

interface ImagePickerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedImage: string;
    onSelect: (image: string) => void;
    title?: string;
    description?: string;
}

export function ImagePicker({
    open,
    onOpenChange,
    selectedImage,
    onSelect,
    title = "Select Image",
    description = "Choose an image from the gallery."
}: ImagePickerProps) {
    const [tempSelected, setTempSelected] = useState(selectedImage);
    const [images, setImages] = useState<ImageItem[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const observer = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        setTempSelected(selectedImage);
    }, [selectedImage, open]);

    const fetchImages = useCallback(async (pageNum: number, reset = false) => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const response = await axios.get(`/api/images/images?page=${pageNum}&limit=15`);
            const newImages = response.data.images;
            setImages(prev => reset ? newImages : [...prev, ...newImages]);
            setHasMore(response.data.hasMore);
        } catch (error) {
            console.error("Failed to fetch images:", error);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading]);

    useEffect(() => {
        if (open && images.length === 0) {
            fetchImages(1, true);
        }
    }, [open, fetchImages, images.length]);

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
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md md:max-w-lg h-[600px] max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-4 py-3 border-b">
                    <DialogTitle className="text-lg">{title}</DialogTitle>
                    <DialogDescription className="text-xs">
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col bg-muted/5">
                    <ScrollArea className="flex-1 p-4">
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
                                                ? "border-blue-500 ring-2 ring-blue-500 ring-offset-1"
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
                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleSave}>Confirm Selection</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
