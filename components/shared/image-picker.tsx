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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

                <div className="border-b bg-card px-5 py-2">
                    <Tabs value={activeCategory} onValueChange={handleCategoryChange} className="w-full">
                        <TabsList className="w-full justify-start h-9 bg-muted/50 p-1">
                            {categories.map((cat) => (
                                <TabsTrigger
                                    key={cat}
                                    value={cat}
                                    className="text-xs px-4 h-7 transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                >
                                    {cat}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col bg-muted/5">
                    <ScrollArea className="flex-1 p-5">
                        <LoadingWrapper isLoading={isLoading && images.length === 0} minHeight="400px">
                            {images.length > 0 ? (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                    {images.map((image, index) => {
                                        const isLast = index === images.length - 1;
                                        const isSelected = tempSelected === image.src;
                                        return (
                                            <div
                                                key={image.id + index}
                                                ref={isLast ? lastImageRef : null}
                                                onClick={() => setTempSelected(image.src)}
                                                className={cn(
                                                    "group relative aspect-square cursor-pointer overflow-hidden rounded-2xl border-2 transition-all duration-300",
                                                    isSelected
                                                        ? "border-primary ring-4 ring-primary/10 ring-offset-0"
                                                        : "border-transparent hover:border-primary/30 hover:shadow-lg"
                                                )}
                                            >
                                                <Image
                                                    src={image.src}
                                                    alt={image.alt}
                                                    fill
                                                    className={cn(
                                                        "object-cover transition-transform duration-500 group-hover:scale-110",
                                                        isSelected && "scale-105"
                                                    )}
                                                    sizes="(max-width: 640px) 33vw, 120px"
                                                />
                                                <div className={cn(
                                                    "absolute inset-0 bg-black/0 transition-colors duration-300",
                                                    isSelected ? "bg-black/20" : "group-hover:bg-black/10"
                                                )} />
                                                {isSelected && (
                                                    <div className="absolute top-2 right-2 bg-primary text-white p-1 rounded-full shadow-lg animate-in zoom-in-50 duration-300">
                                                        <Check className="h-3 w-3" />
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
                        </LoadingWrapper>
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
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                    >
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                    </Button>
                    <Button
                        size="sm"
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
