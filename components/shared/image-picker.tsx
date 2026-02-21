"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Check, X, Plus, Image as ImageIcon } from "lucide-react";
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
import { LoadingWrapper, Loader } from "@/components/ui/loader";

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
    const [categories, setCategories] = useState<string[]>(["All"]);
    const [activeCategory, setActiveCategory] = useState("All");
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const observer = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        setTempSelected(selectedImage);
    }, [selectedImage, open]);

    const fetchImages = useCallback(async (pageNum: number, reset = false, category = activeCategory) => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const response = await axios.get(`/api/images/images?page=${pageNum}&limit=15&category=${category}`);
            const newImages = response.data.images;
            setImages(prev => reset ? newImages : [...prev, ...newImages]);
            setHasMore(response.data.hasMore);
            if (response.data.categories) {
                setCategories(response.data.categories);
            }
        } catch (error) {
            console.error("Failed to fetch images:", error);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, activeCategory]);

    useEffect(() => {
        if (open) {
            fetchImages(1, true, activeCategory);
            setPage(1);
        }
    }, [open, activeCategory]);

    const handleCategoryChange = (val: string) => {
        setActiveCategory(val);
        setImages([]);
        setPage(1);
    };

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
            <DialogContent className="sm:max-w-md md:max-w-lg h-[650px] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-5 py-4 border-b bg-muted/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <ImageIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
                            <DialogDescription className="text-sm">
                                {description}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="border-b bg-card px-1">
                    {isLoading && categories.length <= 1 ? (
                        <div className="flex justify-center items-center py-2.5">
                            <Loader />
                        </div>
                    ) : (
                        <div className="flex w-full">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => handleCategoryChange(cat)}
                                    className={cn(
                                        "relative flex-1 text-sm font-medium py-2.5 px-3 transition-colors duration-200",
                                        activeCategory === cat
                                            ? "text-primary"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {cat}
                                    {activeCategory === cat && (
                                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-[3px] rounded-full bg-primary" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-hidden flex flex-col bg-muted/5">
                    <ScrollArea className="flex-1 p-5">
                        {isLoading && images.length === 0 ? (
                            <div className="flex justify-center items-center h-[350px]">
                                <Loader />
                            </div>
                        ) : images.length > 0 ? (
                            <div className="grid p-1 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {images.map((image, index) => {
                                    const isLast = index === images.length - 1;
                                    const isSelected = tempSelected === image.src;
                                    return (
                                        <div
                                            key={image.id + index}
                                            ref={isLast ? lastImageRef : null}
                                            onClick={() => setTempSelected(image.src)}
                                            className={cn(
                                                "group relative aspect-square cursor-pointer overflow-hidden rounded-full border-4 transition-all duration-200",
                                                isSelected
                                                    ? "border-primary ring-4 ring-primary/20 shadow-lg"
                                                    : "border-transparent hover:border-muted-foreground/30"
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
                                                <div className="absolute inset-0 flex items-center justify-center bg-primary/40 backdrop-blur-[1px]">
                                                    <div className="bg-primary text-primary-foreground rounded-full p-1 shadow-md">
                                                        <Check className="h-5 w-5 font-bold" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : !isLoading && (
                            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground gap-3">
                                <ImageIcon className="h-12 w-12 opacity-20" />
                                <p className="text-sm">No images found in this category</p>
                            </div>
                        )}
                        {isLoading && images.length > 0 && (
                            <div className="py-8 flex justify-center w-full">
                                <Loader />
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter className="px-5 py-4 border-t bg-card flex sm:justify-between items-center gap-3">
                    <Button
                        variant="ghost"

                        onClick={() => onOpenChange(false)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                    >
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                    </Button>
                    <Button

                        onClick={handleSave}
                        className="shadow-md hover:shadow-lg transition-all"
                    >
                        <Check className="mr-2 h-4 w-4" />
                        Confirm Selection
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
