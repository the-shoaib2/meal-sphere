"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, User, Search, Home, ShoppingBag, Receipt, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface SearchResult {
    id: string
    type: 'user' | 'room' | 'shopping' | 'expense'
    title: string
    subtitle: string
    image?: string
    url: string
}

export default function SearchPage() {
    const searchParams = useSearchParams()
    const query = searchParams?.get("q")
    const [results, setResults] = useState<SearchResult[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        const fetchResults = async () => {
            if (!query) return;
            setIsLoading(true)
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
                const data = await res.json()
                setResults(data.results || [])
            } catch (error) {
                console.error("Search error:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchResults()
    }, [query])

    if (!query) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
                <div className="p-4 rounded-full bg-muted/50">
                    <Search className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-semibold">Search MealSphere</h2>
                <p className="text-muted-foreground">Type something in the header to start searching.</p>
            </div>
        )
    }

    const groupedResults = {
        users: results.filter(r => r.type === 'user'),
        rooms: results.filter(r => r.type === 'room'),
        shopping: results.filter(r => r.type === 'shopping'),
        expenses: results.filter(r => r.type === 'expense'),
    }

    const hasResults = results.length > 0

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Search Results</h1>
                <p className="text-muted-foreground">
                    Found {results.length} results for "{query}"
                </p>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : !hasResults ? (
                <div className="text-center py-12 border rounded-lg bg-muted/10">
                    <p className="text-muted-foreground">No results found.</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

                    {/* People */}
                    {groupedResults.users.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <User className="h-5 w-5" /> People
                            </h2>
                            {groupedResults.users.map(result => (
                                <Link href={result.url} key={result.id}>
                                    <Card className="hover:bg-muted/50 transition-colors mb-4">
                                        <CardHeader className="flex flex-row items-center gap-4 p-4">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                {result.image ? (
                                                    <img src={result.image} alt={result.title} className="h-10 w-10 rounded-full object-cover" />
                                                ) : (
                                                    <User className="h-5 w-5 text-primary" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <CardTitle className="text-base">{result.title}</CardTitle>
                                                <CardDescription>{result.subtitle}</CardDescription>
                                            </div>
                                        </CardHeader>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Groups */}
                    {groupedResults.rooms.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Home className="h-5 w-5" /> Groups
                            </h2>
                            {groupedResults.rooms.map(result => (
                                <Link href={result.url} key={result.id}>
                                    <Card className="hover:bg-muted/50 transition-colors mb-4">
                                        <CardHeader className="p-4 space-y-2">
                                            <CardTitle className="text-base flex justify-between">
                                                {result.title}
                                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                            </CardTitle>
                                            <CardDescription>{result.subtitle}</CardDescription>
                                        </CardHeader>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Items & Expenses */}
                    {(groupedResults.shopping.length > 0 || groupedResults.expenses.length > 0) && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <ShoppingBag className="h-5 w-5" /> Items & Expenses
                            </h2>

                            {groupedResults.shopping.map(result => (
                                <Link href={result.url} key={result.id}>
                                    <Card className="hover:bg-muted/50 transition-colors mb-4 border-l-4 border-l-blue-500">
                                        <CardHeader className="p-4">
                                            <CardTitle className="text-base">{result.title}</CardTitle>
                                            <CardDescription className="flex justify-between">
                                                <span>Shopping Item</span>
                                                <span>{result.subtitle}</span>
                                            </CardDescription>
                                        </CardHeader>
                                    </Card>
                                </Link>
                            ))}

                            {groupedResults.expenses.map(result => (
                                <Link href={result.url} key={result.id}>
                                    <Card className="hover:bg-muted/50 transition-colors mb-4 border-l-4 border-l-amber-500">
                                        <CardHeader className="p-4">
                                            <CardTitle className="text-base">{result.title}</CardTitle>
                                            <CardDescription className="flex justify-between">
                                                <span>Extra Expense</span>
                                                <span>{result.subtitle}</span>
                                            </CardDescription>
                                        </CardHeader>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}

                </div>
            )}
        </div>
    )
}
