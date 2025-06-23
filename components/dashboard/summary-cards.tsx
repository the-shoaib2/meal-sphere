"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Utensils, CreditCard, ShoppingBag, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useGroups } from "@/hooks/use-groups";
import { useEffect, useState } from "react";

interface DashboardSummary {
  totalMeals: number;
  currentRate: number;
  myBalance: number;
  activeRooms: number;
  totalMembers: number;
}

export default function DashboardSummaryCards() {
  const { data: groups = [], isLoading: isGroupsLoading } = useGroups();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      setLoading(true);
      try {
        // Example: Fetch summary from a new API endpoint (to be implemented)
        const res = await fetch("/api/dashboard/summary");
        if (!res.ok) throw new Error("Failed to fetch dashboard summary");
        const data = await res.json();
        setSummary(data);
      } catch (e) {
        // fallback: calculate from groups if API not ready
        setSummary({
          totalMeals: 0,
          currentRate: 0,
          myBalance: 0,
          activeRooms: groups.length,
          totalMembers: groups.reduce((acc, g) => acc + (g.members?.length || 0), 0),
        });
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, [groups]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">Total Meals</CardTitle>
          <Utensils className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-20 mb-2" />
          ) : (
            <div className="text-2xl font-bold">{summary?.totalMeals ?? 0}</div>
          )}
          <p className="text-xs text-muted-foreground">+2.5% from last month</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">Current Rate</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-20 mb-2" />
          ) : (
            <div className="text-2xl font-bold">৳{summary?.currentRate?.toFixed(2) ?? "-"}</div>
          )}
          <p className="text-xs text-muted-foreground">Per meal</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">My Balance</CardTitle>
          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-24 mb-2" />
          ) : (
            <div className="text-2xl font-bold">৳{summary?.myBalance?.toLocaleString() ?? "-"}</div>
          )}
          <p className="text-xs text-muted-foreground">+1,250 this month</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">Active Rooms</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-8 mb-2" />
          ) : (
            <div className="text-2xl font-bold">{summary?.activeRooms ?? 0}</div>
          )}
          <p className="text-xs text-muted-foreground">{loading ? <Skeleton className="h-4 w-16" /> : `${summary?.totalMembers ?? 0} members total`}</p>
        </CardContent>
      </Card>
    </div>
  );
} 