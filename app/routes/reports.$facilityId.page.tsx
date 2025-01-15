import { memo, useMemo } from "react";
import { Link, useParams } from "@remix-run/react";
import { Phone, Settings, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import {
  Area,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";

// Memoized components for better performance
const Header = memo(function Header() {
  const params = useParams();
  return (
    <header className="bg-background dark:bg-[#4A4A62] p-4 flex items-center justify-between">
      <div className="flex items-center">
        <h1 className="text-xl font-bold ml-6">Report</h1>
      </div>
      <div className="flex items-center space-x-4">
        <a href="tel:7010976271">
          <Phone className="h-6 w-6 text-[#886fa6]" />
        </a>
        <a href={`/${params.facilityId}/settings`}>
          <Settings className="h-6 w-6 text-[#886fa6]" />
        </a>
      </div>
    </header>
  );
});

const SearchBar = memo(function SearchBar({ value, onChange }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div>
      <div className="relative flex items-center">
        <Input
          type="text"
          placeholder="Search by name or number"
          className="pl-10 pr-20 py-2 w-full bg-background rounded-full dark:bg-[#4A4A62]"
          value={value}
          onChange={onChange}
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
      </div>
    </div>
  );
});

const TransactionChart = memo(function TransactionChart({ 
  receivedDash, 
  circumference, 
  pendingDash, 
  transactionStats 
}: { 
  receivedDash: number;
  circumference: number;
  pendingDash: number;
  transactionStats: { received: number; pending: number };
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Transactions</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative w-48 h-48 mx-auto mb-4">
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
              stroke="#F44336"
              strokeWidth="10"
              strokeDasharray={`${pendingDash} ${circumference}`}
              strokeDashoffset={-receivedDash}
            />
          </svg>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="flex items-center">
              <span className="w-3 h-3 bg-blue-500 rounded-full mr-2" />
              Total received
            </span>
            <span className={transactionStats.received > 50 ? "text-green-500" : "text-red-500"}>
              {(transactionStats.received ?? 0).toFixed(1)}%{" "}
              {transactionStats.received > 50 ? (
                <ArrowUp className="inline h-4 w-4" />
              ) : (
                <ArrowDown className="inline h-4 w-4" />
              )}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center">
              <span className="w-3 h-3 bg-red-500 rounded-full mr-2" />
              Total Pending
            </span>
            <span className={transactionStats.pending > 50 ? "text-green-500" : "text-red-500"}>
              {(transactionStats.pending ?? 0).toFixed(1)}%{" "}
              {transactionStats.pending > 50 ? (
                <ArrowUp className="inline h-4 w-4" />
              ) : (
                <ArrowDown className="inline h-4 w-4" />
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

const RecentTransactions = memo(function RecentTransactions({ 
  transactions 
}: { 
  transactions: Array<{ 
    id: string; 
    user: string; 
    member_id: string;
    amount: number; 
    timestamp: string; 
  }> 
}) {
  const params = useParams();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div>
          {transactions.map((transaction) => (
            <Link
              key={transaction.id}
              to={`/${params.facilityId}/members/${transaction.member_id}`}
              className="block"
            >
              <div className="flex items-center justify-between bg-background dark:bg-[#3A3A52] p-2 hover:bg-violet-50 dark:hover:bg-[#212237] rounded-xl mb-2 last:mb-2">
                <div className="flex items-center space-x-2">
                  <Avatar>
                    <AvatarImage
                      src={`https://api.dicebear.com/6.x/initials/svg?seed=${transaction.user}`}
                      alt={transaction.user}
                    />
                    <AvatarFallback>{transaction.user[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{transaction.user}</p>
                    <p className="text-sm text-gray-500">{transaction.timestamp}</p>
                  </div>
                </div>
                <span className={`font-semibold ${transaction.amount > 0 ? "text-green-500" : "text-red-500"}`}>
                  {transaction.amount > 0 ? "+" : "-"}₹{Math.abs(transaction.amount).toFixed(2)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

export default memo(function ReportPage({ 
  metrics, 
  transactions, 
  transactionStats, 
  income, 
  earningSummary 
}: {
  metrics: { totalReceived: number; pendingPayment: number };
  transactions: Array<{ id: string; user: string; member_id: string; amount: number; timestamp: string }>;
  transactionStats: { received: number; pending: number };
  income: { today: number; yesterday: number; percentageChange: number };
  earningSummary: Array<{ date: string; amount: number }>;
}) {
  // Memoize complex calculations
  const { circumference, receivedDash, pendingDash } = useMemo(() => {
    const totalAmount = metrics.totalReceived + metrics.pendingPayment;
    const receivedPercentage = (metrics.totalReceived / totalAmount) * 100;
    const pendingPercentage = (metrics.pendingPayment / totalAmount) * 100;
    const circumference = 2 * Math.PI * 45;
    const receivedDash = (receivedPercentage / 100) * circumference;
    const pendingDash = (pendingPercentage / 100) * circumference;
    return { circumference, receivedDash, pendingDash };
  }, [metrics.totalReceived, metrics.pendingPayment]);

  return (
    <div className="min-h-screen bg-[#f0ebff] dark:bg-[#212237] pb-16">
      <Header />

      <main className="p-4 space-y-4 dark:bg-[#212237]">
        <SearchBar value="" onChange={() => {}} />

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <CardContent>
              <p className="text-blue-500 text-xl font-bold">
                ₹{(metrics.totalReceived ?? 0).toFixed(2)}
              </p>
              <p className="text-sm text-gray-800">Total received</p>
            </CardContent>
          </Card>
          <Card className="p-4">
            <CardContent>
              <p className="text-red-500 text-xl font-bold">
                ₹{(metrics.pendingPayment ?? 0).toFixed(2)}
              </p>
              <p className="text-sm text-gray-800">Pending payment</p>
            </CardContent>
          </Card>
        </div>

        <div className="p-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TransactionChart
              receivedDash={receivedDash}
              circumference={circumference}
              pendingDash={pendingDash}
              transactionStats={transactionStats}
            />

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Income</CardTitle>
                  <Badge variant="secondary">Today</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-bold">₹{income.today.toFixed(2)}</span>
                    <span className={income.percentageChange >= 0 ? "text-green-500" : "text-red-500"}>
                      {income.percentageChange >= 0 ? (
                        <ArrowUp className="inline h-4 w-4" />
                      ) : (
                        <ArrowDown className="inline h-4 w-4" />
                      )}{" "}
                      {Math.abs(income.percentageChange).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">Compared to ₹{income.yesterday.toFixed(2)} yesterday</p>
                  <div className="flex justify-between text-sm">
                    <span>Last week incomes</span>
                    <span className="font-semibold">
                      ₹{earningSummary.reduce((sum, day) => sum + day.amount, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold">Earning Summary</h4>
                  </div>
                  <Card className="p-4">
                    <CardContent className="p-0">
                      <div style={{ width: 276, height: 160 }}>
                        <ChartContainer
                          config={{
                            amount: {
                              label: "Amount",
                              color: "black",
                            },
                          }}
                          className="h-40 w-full"
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={earningSummary}
                              margin={{
                                top: 20,
                                right: 30,
                                left: 0,
                                bottom: 0,
                              }}
                            >
                              <XAxis
                                dataKey="date"
                                tickFormatter={(value) =>
                                  new Date(value).toLocaleDateString("en-US", {
                                    weekday: "short",
                                  })
                                }
                                tickLine={false}
                                axisLine={{ stroke: "black" }}
                                tick={{ fill: "black" }}
                              />
                              <YAxis
                                tickFormatter={(value) => `₹${value}`}
                                tickLine={false}
                                axisLine={{ stroke: "black" }}
                                tick={{ fill: "black" }}
                                tickCount={6}
                                domain={[0, 50000]}
                                ticks={[0, 10000, 30000, 50000]}
                              />
                              <CartesianGrid strokeDasharray="3 3" />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Area
                                type="monotone"
                                dataKey="amount"
                                stroke="hsl(var(--purple-500))"
                                fill="rgba(142, 216, 255, 0.4)"
                                strokeWidth={2}
                                fillOpacity={1}
                              />
                              <Line
                                type="monotone"
                                dataKey="amount"
                                stroke="lightblue"
                                strokeWidth={2}
                                dot={true}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <RecentTransactions transactions={transactions} />
      </main>
    </div>
  );
});

