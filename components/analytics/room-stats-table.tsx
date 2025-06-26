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

interface RoomStatsTableProps {
  data: RoomStatsData[];
}

export function RoomStatsTable({ data }: RoomStatsTableProps) {
  if (!data || data.length === 0) {
    return <p>No room data available.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Room Name</TableHead>
          <TableHead className="text-right">Members</TableHead>
          <TableHead className="text-right">Total Meals</TableHead>
          <TableHead className="text-right">Total Expenses</TableHead>
          <TableHead className="text-right">Avg. Meal Rate</TableHead>
          <TableHead className="text-right">Active Days</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((room) => (
          <TableRow key={room.roomId}>
            <TableCell className="font-medium">{room.roomName}</TableCell>
            <TableCell className="text-right">
                <Badge variant="secondary">{room.memberCount}</Badge>
            </TableCell>
            <TableCell className="text-right">{room.totalMeals}</TableCell>
            <TableCell className="text-right">৳{room.totalExpenses.toFixed(2)}</TableCell>
            <TableCell className="text-right">
                <Badge variant="outline">৳{room.averageMealRate.toFixed(2)}</Badge>
            </TableCell>
            <TableCell className="text-right">{room.activeDays}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
} 