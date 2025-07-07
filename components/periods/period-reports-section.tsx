import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function PeriodReportsSection({ groupName }: { groupName: string }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Period Reports</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Generate and view period-based reports for {groupName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Reports functionality will be implemented here. This will include:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-xs sm:text-sm text-muted-foreground">
            <li>Monthly period summaries</li>
            <li>Member contribution reports</li>
            <li>Expense breakdowns</li>
            <li>Period comparison charts</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
} 