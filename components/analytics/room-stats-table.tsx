import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RoomStatsData } from "@/hooks/use-analytics";
import { Badge } from "@/components/ui/badge";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Users, Utensils, ShoppingCart, Receipt, TrendingUp, Calendar } from "lucide-react";

interface RoomStatsTableProps {
  data: RoomStatsData[];
}

export function RoomStatsTable({ data }: RoomStatsTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-muted/5 rounded-lg border border-dashed">
        <Users className="h-8 w-8 mb-2 opacity-20" />
        <p>No room statistics available for this period.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[180px]">Room Name</TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Users className="h-3 w-3" />
                <span>Members</span>
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Utensils className="h-3 w-3" />
                <span>Regular / Guest</span>
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Utensils className="h-3 w-3 font-bold" />
                <span>Total Meals</span>
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1">
                <ShoppingCart className="h-3 w-3" />
                <span>Shopping</span>
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Receipt className="h-3 w-3" />
                <span>Other</span>
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>Meal Rate</span>
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Calendar className="h-3 w-3" />
                <span>Active Days</span>
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((room) => (
            <TableRow key={room.roomId} className="group hover:bg-muted/40 transition-colors">
              <TableCell className="font-semibold text-primary">{room.roomName}</TableCell>
              <TableCell className="text-right">
                <Badge variant="secondary" className="font-medium">
                  <NumberTicker value={room.memberCount} />
                </Badge>
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <span className="text-sm font-medium">
                  <NumberTicker value={room.regularMealsCount} />
                </span>
                <span className="mx-1 text-muted-foreground">/</span>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  <NumberTicker value={room.guestMealsCount} />
                </span>
              </TableCell>
              <TableCell className="text-right font-bold">
                <NumberTicker value={room.totalMeals} />
              </TableCell>
              <TableCell className="text-right">
                <span className="text-xs text-muted-foreground mr-0.5">৳</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  <NumberTicker value={room.shoppingExpenses} decimalPlaces={2} />
                </span>
              </TableCell>
              <TableCell className="text-right">
                <span className="text-xs text-muted-foreground mr-0.5">৳</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  <NumberTicker value={room.otherExpenses} decimalPlaces={2} />
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Badge variant="outline" className="font-bold border-primary/20 bg-primary/5 text-primary">
                  ৳<NumberTicker value={room.averageMealRate} decimalPlaces={2} />
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium text-muted-foreground">
                <div className="flex items-center justify-end gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" />
                  <NumberTicker value={room.activeDays} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 