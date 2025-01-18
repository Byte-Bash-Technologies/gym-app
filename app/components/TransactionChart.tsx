import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

interface TransactionChartProps {
  income: number;
  totalPendingBalance: number;
  timelineFilter: string;
}

export function TransactionChart({ income, totalPendingBalance, timelineFilter }: TransactionChartProps) {
  const totalAmount = income + totalPendingBalance;
  const receivedPercentage = (income / totalAmount) * 100;
  const pendingPercentage = (totalPendingBalance / totalAmount) * 100;
  const circumference = 2 * Math.PI * 45;
  const receivedDash = (receivedPercentage / 100) * circumference;
  const pendingDash = (pendingPercentage / 100) * circumference;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Transactions</CardTitle>
          <Badge variant="secondary">{timelineFilter}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative w-48 h-48 mx-auto">
          <svg
            viewBox="0 0 100 100"
            className="transform -rotate-90 w-full h-full"
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="10"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="10"
              strokeDasharray={`${receivedDash} ${circumference}`}
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#ef4444"
              strokeWidth="10"
              strokeDasharray={`${pendingDash} ${circumference}`}
              strokeDashoffset={-receivedDash}
            />
          </svg>
        </div>
        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
              <span>Total received</span>
            </div>
            <span>₹{income.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
              <span>Total Pending</span>
            </div>
            <span>₹{totalPendingBalance.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

