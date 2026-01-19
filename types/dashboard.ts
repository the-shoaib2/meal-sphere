import { GroupBalanceSummary } from '@/hooks/use-account-balance';

export type DashboardSummary = {
  totalUserMeals: number;
  totalAllMeals: number;
  currentRate: number;
  currentBalance: number;
  availableBalance: number;
  totalCost: number;
  activeRooms: number;
  totalActiveGroups: number;
  totalMembers: number;
  groupId: string;
  groupName: string;
  groupBalance: GroupBalanceSummary | null;
};

export type DashboardActivity = {
  id: string;
  type: 'MEAL' | 'PAYMENT' | 'EXPENSE' | 'GROUP_JOIN' | 'GROUP_LEAVE' | 'SHOPPING' | 'ACTIVITY';
  title: string;
  description: string;
  timestamp: string;
  amount?: number;
  groupName?: string;
  user?: {
    name: string;
    image?: string;
  };
};

export type DashboardChartData = {
  date: string;
  meals: number;
  expenses: number;
  balance: number;
};
