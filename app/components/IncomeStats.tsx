import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { TrendingUp, TrendingDown } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

interface IncomeStatsProps {
  income: number;
  previousIncome: number;
  totalPendingBalance: number;
  dailyEarnings: Array<{ date: string; amount: number }>;
  timelineFilter: string;
}

export function IncomeStats({
  income,
  previousIncome,
  totalPendingBalance,
  dailyEarnings,
  timelineFilter,
}: IncomeStatsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Income</CardTitle>
          <Badge variant="secondary">{timelineFilter}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-center">
              <h3 className="text-4xl font-bold">₹{income.toFixed(2)}</h3>
              <Badge
                variant="secondary"
                className="ml-2 bg-green-100 text-green-600"
              >
                ↑{" "}
                {(
                  ((income - previousIncome) / previousIncome) *
                  100
                ).toFixed(1)}
                %
              </Badge>
            </div>
            <p className="text-sm text-gray-500">
              Compared to ₹{previousIncome.toFixed(2)} in previous period
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Total Pending Balance</p>
            <p className="text-2xl font-bold text-red-500">
              ₹{totalPendingBalance.toFixed(2)}
            </p>
          </div>
          <div className="pt-4">
            <h4 className="text-sm font-medium mb-2">Earning Summary</h4>
            <div className="flex items-center space-x-2 mb-2">
              {dailyEarnings[dailyEarnings.length - 1].amount > dailyEarnings[0].amount ? (
                <>
                  <TrendingUp className="text-green-500" />
                  <span className="text-green-500 font-medium">Upward Trend</span>
                </>
              ) : (
                <>
                  <TrendingDown className="text-red-500" />
                  <span className="text-red-500 font-medium">Downward Trend</span>
                </>
              )}
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyEarnings}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    if (timelineFilter === "today" || timelineFilter === "yesterday") {
                      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }
                    return date.toLocaleDateString("en-US", { weekday: "short" });
                  }}
                />
                <YAxis 
                  tickFormatter={(value) => `₹${value / 1000}k`}
                  domain={[0, 'auto']}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const date = new Date(label);
                      const dateString = timelineFilter === "today" || timelineFilter === "yesterday"
                        ? date.toLocaleString([], { hour: '2-digit', minute: '2-digit' })
                        : date.toLocaleDateString();
                      return (
                        <div className="bg-white dark:bg-[#3A3A52] p-2 border rounded shadow">
                          <p className="text-sm">{dateString}</p>
                          <p className="text-sm font-bold">₹{payload[0].value.toFixed(2)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#8884d8" 
                  fillOpacity={1} 
                  fill="url(#colorAmount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

