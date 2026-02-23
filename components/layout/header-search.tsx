"use client"

import * as React from "react"
import { Search, Loader2, X, User, Home, ShoppingBag, Receipt, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useDebounce } from "@/hooks/use-debounce"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface SearchResult {
    id: string
    type: 'user' | 'room' | 'shopping' | 'expense'
    title: string
    subtitle: string
    image?: string
    url: string
}

interface HeaderSearchProps {
    isMobile?: boolean
    isExpanded?: boolean
    onToggleExpand?: (expanded: boolean) => void
}

export function HeaderSearch({ isMobile, isExpanded, onToggleExpand }: HeaderSearchProps) {
    const router = useRouter()
    const [query, setQuery] = React.useState("")
    const [results, setResults] = React.useState<SearchResult[]>([])
    // If controlled (via props), use props.details; otherwise local state
    const [localOpen, setLocalOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Derived open state: controlled vs uncontrolled logic
    // For dropdown results visibility:
    const isOpen = localOpen

    // For mobile input expansion:
    const showInput = !isMobile || isExpanded

    const debouncedQuery = useDebounce(query, 300)

    React.useEffect(() => {
        if (debouncedQuery.length >= 2) {
            setLoading(true)
            import('@/lib/actions/search.actions').then(({ globalSearchAction }) => {
                globalSearchAction(debouncedQuery)
                    .then(res => {
                        setResults((res.results || []) as SearchResult[])
                        setLoading(false)
                        setLocalOpen(true)
                    })
                    .catch(() => setLoading(false))
            }).catch(() => setLoading(false))
        } else {
            setResults([])
            setLocalOpen(false)
        }
    }, [debouncedQuery])

    const handleSelect = (url: string) => {
        router.push(url)
        setLocalOpen(false)
        setQuery("")
        if (isMobile && onToggleExpand) {
            onToggleExpand(false)
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (query) {
            router.push(`/search?q=${encodeURIComponent(query)}`)
            setLocalOpen(false)
            setQuery("")
            if (isMobile && onToggleExpand) {
                onToggleExpand(false)
            }
        }
    }

    // Click outside to close
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (inputRef.current && !inputRef.current.contains(event.target as Node) && !(event.target as Element).closest('.search-results')) {
                setLocalOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    if (!showInput) {
        return (
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onToggleExpand?.(true)}
                className="relative group rounded-full active:scale-95"
                aria-label="Open search"
            >
                <Search className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="sr-only">Search</span>
            </Button>
        )
    }

    return (
        <div className={`relative w-full ${isMobile ? 'flex-1' : 'max-w-[450px] md:w-[300px] lg:w-[450px]'}`} ref={inputRef as any}>
            <form onSubmit={handleSubmit} className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    ref={inputRef}
                    type="search"
                    placeholder="Search..."
                    className="w-full appearance-none bg-background pl-9 pr-10 shadow-none transition-all duration-200 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary rounded-full"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        if (e.target.value.length === 0) setLocalOpen(false)
                    }}
                    onFocus={() => {
                        if (query.length >= 2 && results.length > 0) setLocalOpen(true)
                    }}
                    autoFocus={isMobile && isExpanded}
                />
                {loading ? (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : (
                    <button
                        type="button"
                        onClick={() => {
                            setQuery("");
                            setLocalOpen(false);
                            inputRef.current?.focus();
                            if (isMobile && onToggleExpand && !query) {
                                // If query is empty, close the expanded view
                                onToggleExpand(false);
                            }
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    >
                        {query ? <X className="h-4 w-4" /> : (isMobile ? <X className="h-4 w-4" /> : null)}
                    </button>
                )}
            </form>

            {isOpen && results.length > 0 && (
                <div className="search-results absolute top-full mt-2 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 overflow-hidden z-50">
                    <div className="max-h-[300px] overflow-y-auto p-1">
                        {results.slice(0, 5).map((result) => (
                            <div
                                key={result.id}
                                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 cursor-pointer overflow-hidden"
                                onClick={() => handleSelect(result.url)}
                            >
                                <Avatar className="h-8 w-8 mr-2">
                                    {result.type === 'user' && result.image && (
                                        <AvatarImage src={result.image} alt={result.title} />
                                    )}
                                    <AvatarFallback>
                                        {result.type === 'user' && <User className="h-4 w-4" />}
                                        {result.type === 'room' && <Home className="h-4 w-4" />}
                                        {result.type === 'shopping' && <ShoppingBag className="h-4 w-4" />}
                                        {result.type === 'expense' && <Receipt className="h-4 w-4" />}
                                        {/* Fallback for unknown types */}
                                        {!['user', 'room', 'shopping', 'expense'].includes(result.type) && <Search className="h-4 w-4" />}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 overflow-hidden">
                                    <p className="truncate font-medium">{result.title}</p>
                                    <p className="truncate text-xs text-muted-foreground">{result.subtitle}</p>
                                </div>
                            </div>
                        ))}
                        <div
                            className="border-t p-2 text-center text-sm text-primary hover:bg-muted cursor-pointer font-medium flex items-center justify-center gap-1"
                            onClick={() => {
                                router.push(`/search?q=${encodeURIComponent(query)}`)
                                setLocalOpen(false)
                                setQuery("")
                                if (isMobile && onToggleExpand) {
                                    onToggleExpand(false)
                                }
                            }}
                        >
                            View all {results.length} results <ChevronRight className="h-3 w-3" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
