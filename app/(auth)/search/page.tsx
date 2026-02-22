"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { User, Search, Home, ShoppingBag, Receipt, ArrowRight, SearchX } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared/page-header"
import { LoadingWrapper } from "@/components/ui/loader"
import { EmptyState } from "@/components/shared/empty-state"

interface SearchResult {
    id: string
    type: 'user' | 'room' | 'shopping' | 'expense'
    title: string
    subtitle: string
    image?: string
    url: string
}

const typeConfig = {
    user: {
        icon: User,
        label: "People",
        gradient: "from-blue-500/10 to-indigo-500/10",
        iconColor: "text-blue-600 dark:text-blue-400",
        borderColor: "border-l-blue-500",
        bgColor: "bg-blue-500/10",
    },
    room: {
        icon: Home,
        label: "Groups",
        gradient: "from-emerald-500/10 to-teal-500/10",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        borderColor: "border-l-emerald-500",
        bgColor: "bg-emerald-500/10",
    },
    shopping: {
        icon: ShoppingBag,
        label: "Shopping Items",
        gradient: "from-violet-500/10 to-purple-500/10",
        iconColor: "text-violet-600 dark:text-violet-400",
        borderColor: "border-l-violet-500",
        bgColor: "bg-violet-500/10",
    },
    expense: {
        icon: Receipt,
        label: "Expenses",
        gradient: "from-amber-500/10 to-orange-500/10",
        iconColor: "text-amber-600 dark:text-amber-400",
        borderColor: "border-l-amber-500",
        bgColor: "bg-amber-500/10",
    },
}

function ResultCard({ result }: { result: SearchResult }) {
    const config = typeConfig[result.type]
    const Icon = config.icon

    return (
        <Link href={result.url} className="block group">
            <Card className={`border-l-4 ${config.borderColor} hover:shadow-md transition-all duration-200 hover:-translate-y-0.5`}>
                <CardHeader className="flex flex-row items-center gap-3 p-3 sm:p-4">
                    <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full ${config.bgColor} flex items-center justify-center shrink-0`}>
                        {result.type === 'user' && result.image ? (
                            <img src={result.image} alt={result.title} className="h-9 w-9 sm:h-10 sm:w-10 rounded-full object-cover" />
                        ) : (
                            <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${config.iconColor}`} />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm sm:text-base truncate">{result.title}</CardTitle>
                        <CardDescription className="text-xs sm:text-sm truncate">{result.subtitle}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="text-[10px] sm:text-xs hidden xs:inline-flex">
                            {config.label}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </CardHeader>
            </Card>
        </Link>
    )
}

function ResultSection({ title, icon: Icon, results, gradient }: {
    title: string
    icon: React.ElementType
    results: SearchResult[]
    gradient: string
}) {
    if (results.length === 0) return null

    return (
        <div className="space-y-2 sm:space-y-2">
            <div className={`flex items-center gap-2 px-1`}>
                <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground/80" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-foreground">{title}</h3>
                <Badge variant="outline" className="ml-auto text-[10px] sm:text-xs">
                    {results.length}
                </Badge>
            </div>
            <div className="space-y-2">
                {results.map(result => (
                    <ResultCard key={result.id} result={result} />
                ))}
            </div>
        </div>
    )
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
                const { globalSearchAction } = await import('@/lib/actions/search.actions');
                const res = await globalSearchAction(query);
                setResults(res.results || []);
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
            <EmptyState
                icon={<Search className="h-6 w-6 text-muted-foreground" />}
                title="Search MealSphere"
                description="Type something in the search bar to find people, groups, items, and more."
                className="min-h-[50vh]"
            />
        )
    }

    const groupedResults = {
        users: results.filter(r => r.type === 'user'),
        rooms: results.filter(r => r.type === 'room'),
        shopping: results.filter(r => r.type === 'shopping'),
        expenses: results.filter(r => r.type === 'expense'),
    }

    return (
        <div className="space-y-4 sm:space-y-2">
            <PageHeader
                heading="Search Results"
                description={
                    isLoading
                        ? `Searching for "${query}"...`
                        : `Found ${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`
                }
            />

            <LoadingWrapper isLoading={isLoading} minHeight="300px">
                {results.length === 0 ? (
                    <EmptyState
                        icon={<SearchX className="h-6 w-6 text-muted-foreground" />}
                        title="No results found"
                        description={`We couldn't find anything matching "${query}". Try a different search term.`}
                    />
                ) : (
                    <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                        <ResultSection
                            title="People"
                            icon={User}
                            results={groupedResults.users}
                            gradient={typeConfig.user.gradient}
                        />
                        <ResultSection
                            title="Groups"
                            icon={Home}
                            results={groupedResults.rooms}
                            gradient={typeConfig.room.gradient}
                        />
                        <ResultSection
                            title="Shopping Items"
                            icon={ShoppingBag}
                            results={groupedResults.shopping}
                            gradient={typeConfig.shopping.gradient}
                        />
                        <ResultSection
                            title="Expenses"
                            icon={Receipt}
                            results={groupedResults.expenses}
                            gradient={typeConfig.expense.gradient}
                        />
                    </div>
                )}
            </LoadingWrapper>
        </div>
    )
}
