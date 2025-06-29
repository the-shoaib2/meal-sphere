"use client"

import { useActiveGroup } from "@/contexts/group-context"
import { useGroups } from "@/hooks/use-groups"
import MealManagement from "@/components/meal-management"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Users } from "lucide-react"

export default function MealsPage() {
  return (
    <div className="container mx-auto">
      <MealsContent />
    </div>
  )
}

function MealsContent() {
  const { activeGroup, isLoading } = useActiveGroup()
  const { data: groups = [] } = useGroups()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Show skeleton while loading
  if (isLoading) {
    return <MealsSkeleton />
  }

  // Show message if user has no groups
  if (!isLoading && groups.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="p-4 bg-muted/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No Groups Found</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            You need to create or join a group to manage meals. Start by creating your own group or discovering existing ones.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => router.push('/groups/create')}>
              Create Group
            </Button>
            <Button variant="outline" onClick={() => router.push('/groups')}>
              Discover Groups
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Show skeleton if no active group but user has groups (group is being loaded)
  if (!activeGroup) {
    return <MealsSkeleton />
  }

  return (
    <MealManagement 
      roomId={activeGroup.id} 
      groupName={activeGroup.name}
      searchParams={searchParams}
    />
  )
}

function MealsSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="mb-6">
        <Skeleton className="h-10 w-full md:w-1/3 mb-4" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-6 w-32" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-6 w-48" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-8" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-8" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-8" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

