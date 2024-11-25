import { json, type LoaderFunction } from "@remix-run/node";
import { useLoaderData, Link, useParams } from "@remix-run/react";
import {
  Bell,
  Phone,
  Settings,
  Search,
  Download,
  ArrowUp,
  ArrowDown,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { supabase } from "~/utils/supabase.server";
import { Area, Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "~/components/ui/chart";
import BottomNav from "~/components/BottomNav";

interface FinancialMetrics {
  totalReceived: number;
  pendingPayment: number;
}

interface Transaction {
  id: number;
  user: string;
  amount: number;
  timestamp: string;
}

interface TransactionStats {
  received: number;
  pending: number;
}

interface Income {
  today: number;
  yesterday: number;
  percentageChange: number;
}

interface EarningSummary {
  date: string;
  amount: number;
}

export const loader: LoaderFunction = async ({ params }) => {
  const facilityId = params.facilityId;

  // Fetch total received amount from transactions
  const { data: totalReceivedData, error: totalReceivedError } = await supabase
    .from('transactions')
    .select('amount')
    .eq('facility_id', facilityId)
    .eq('type', 'payment')
    .gt('amount', 0);

  if (totalReceivedError) throw new Error('Failed to fetch total received amount');

  const totalReceived = totalReceivedData.reduce((sum, transaction) => sum + transaction.amount, 0);

  // Fetch pending payments from members
  const { data: pendingPaymentData, error: pendingPaymentError } = await supabase
    .from('members')
    .select('balance')
    .eq('facility_id', facilityId)
    .gt('balance', 0);

  if (pendingPaymentError) throw new Error('Failed to fetch pending payments');

  const pendingPayment = pendingPaymentData.reduce((sum, member) => sum + member.balance, 0);

  // Calculate transaction stats
  const totalAmount = totalReceived + pendingPayment;
  const transactionStats: TransactionStats = {
    received: (totalReceived / totalAmount) * 100,
    pending: (pendingPayment / totalAmount) * 100,
  };

  // Fetch recent transactions
  const { data: recentTransactions, error: recentTransactionsError } = await supabase
    .from('transactions')
    .select('id, amount, created_at, members (full_name)')
    .eq('facility_id', facilityId)
    .order('created_at', { ascending: false })
    .limit(3);

  if (recentTransactionsError) throw new Error('Failed to fetch recent transactions');

  // Fetch income data
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const { data: todayIncome, error: todayIncomeError } = await supabase
    .from('transactions')
    .select('amount')
    .eq('facility_id', facilityId)
    .eq('type', 'payment')
    .gte('created_at', now.toISOString().split('T')[0]);

  if (todayIncomeError) throw new Error('Failed to fetch today\'s income');

  const { data: yesterdayIncome, error: yesterdayIncomeError } = await supabase
    .from('transactions')
    .select('amount')
    .eq('facility_id', facilityId)
    .eq('type', 'payment')
    .gte('created_at', yesterday.toISOString().split('T')[0])
    .lt('created_at', now.toISOString().split('T')[0]);

  if (yesterdayIncomeError) throw new Error('Failed to fetch yesterday\'s income');

  const todayTotal = todayIncome.reduce((sum, t) => sum + t.amount, 0);
  const yesterdayTotal = yesterdayIncome.reduce((sum, t) => sum + t.amount, 0);
  const percentageChange = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;

  // Fetch earning summary for the last 7 days
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const { data: earningSummaryData, error: earningSummaryError } = await supabase
    .from('transactions')
    .select('amount, created_at')
    .eq('facility_id', facilityId)
    .eq('type', 'payment')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: true });

  if (earningSummaryError) throw new Error('Failed to fetch earning summary');

  const earningSummary: EarningSummary[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateString = date.toISOString().split('T')[0];
    const amount = earningSummaryData
      .filter(t => t.created_at.startsWith(dateString))
      .reduce((sum, t) => sum + t.amount, 0);
    return { date: dateString, amount };
  }).reverse();

  const metrics: FinancialMetrics = {
    totalReceived,
    pendingPayment,
  };

  const income: Income = {
    today: todayTotal,
    yesterday: yesterdayTotal,
    percentageChange,
  };

  return json({
    metrics,
    transactions: recentTransactions.map(t => ({
      id: t.id,
      user: t.members.full_name,
      amount: t.amount,
      timestamp: new Date(t.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    })),
    transactionStats,
    income,
    earningSummary,
  });
};

export default function ReportPage() {
  const params = useParams();
  const { metrics, transactions, transactionStats, income, earningSummary } = useLoaderData<typeof loader>();

  // Calculate total amount and percentages for the pie chart
  const totalAmount = metrics.totalReceived + metrics.pendingPayment;
  const receivedPercentage = (metrics.totalReceived / totalAmount) * 100;
  const pendingPercentage = (metrics.pendingPayment / totalAmount) * 100;

  // Calculate stroke-dasharray and stroke-dashoffset for each segment
  const circumference = 2 * Math.PI * 45;
  const receivedDash = (receivedPercentage / 100) * circumference;
  const pendingDash = (pendingPercentage / 100) * circumference;

  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      {/* Header */}
      <header className="bg-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-xl font-bold ml-6">Report</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Bell className="h-6 w-6 text-purple-500" />
          <Phone className="h-6 w-6 text-purple-500" />
          <Link to="/settings">
            <Settings className="h-6 w-6 text-purple-500" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4">
      {/* Search */}
      <div className="p-4">
        <div className="relative flex items-center">
          <Input
            type="text"
            placeholder="Search by name or number"
            className="pl-10 pr-20 py-2 w-full bg-white rounded-full"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <div className="absolute right-3 flex space-x-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-purple-500"
            >
              <Filter className="text-purple-500">✓</Filter>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-purple-500"
            >
              <Download className="h-5 w-5 text-purple-500" />
            </Button>
          </div>
        </div>
      </div>

        {/* Financial Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <CardContent>
              <p className="text-blue-500 text-xl font-bold">₹{metrics.totalReceived.toFixed(2)}</p>
              <p className="text-sm text-gray-500">Total received</p>
            </CardContent>
          </Card>
          <Card className="p-4">
            <CardContent>
              <p className="text-red-500 text-xl font-bold">₹{metrics.pendingPayment.toFixed(2)}</p>
              <p className="text-sm text-gray-500">Pending payment</p>
            </CardContent>
          </Card>
        </div>

        <div className="p-0 space-y-4">
        {/* Transactions and Income */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Transactions Chart */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Transactions</CardTitle>
                {/* <Badge variant="secondary">Total</Badge> */}
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative w-48 h-48 mx-auto mb-4">
                <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="10" />
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
                    {transactionStats.received.toFixed(1)}% {transactionStats.received > 50 ? <ArrowUp className="inline h-4 w-4" /> : <ArrowDown className="inline h-4 w-4" />}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    <span className="w-3 h-3 bg-red-500 rounded-full mr-2" />
                    Total Pending
                  </span>
                  <span className={transactionStats.pending > 50 ? "text-green-500" : "text-red-500"}>
                    {transactionStats.pending.toFixed(1)}% {transactionStats.pending > 50 ? <ArrowUp className="inline h-4 w-4" /> : <ArrowDown className="inline h-4 w-4" />}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Income Summary */}
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
                    {income.percentageChange >= 0 ? <ArrowUp className="inline h-4 w-4" /> : <ArrowDown className="inline h-4 w-4" />}
                    {" "}
                    {Math.abs(income.percentageChange).toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Compared to ₹{income.yesterday.toFixed(2)} yesterday
                </p>
                <div className="flex justify-between text-sm">
                  <span>Last week incomes</span>
                  <span className="font-semibold">₹{earningSummary.reduce((sum: number, day: EarningSummary) => sum + day.amount, 0).toFixed(2)}</span>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold">Earning Summary</h4>
                </div>
                <Card className="p-4">
                  <CardContent className="p-0">
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
                        <LineChart data={earningSummary} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                          <XAxis
                            dataKey="date"
                            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })}
                            tickLine={false}
                            axisLine={{ stroke: 'black' }}
                            tick={{ fill: 'black' }}
                          />
                          <YAxis
                            tickFormatter={(value) => `₹${value}`}
                            tickLine={false}
                            axisLine={{ stroke: 'black' }}
                            tick={{ fill: 'black' }}
                            tickCount={6}
                            domain={[0, 50000]}
                            ticks={[0, 10000, 30000, 50000 ]}
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
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>

        {/* Recent Transactions */}
        <Card className="p-4">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.map((transaction: { id: number; user: string; amount: number; timestamp: string }) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between bg-purple-100 p-3 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${transaction.user}`} alt={transaction.user} />
                      <AvatarFallback>{transaction.user[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{transaction.user}</p>
                      <p className="text-sm text-gray-500">
                        {transaction.timestamp}
                      </p>
                    </div>
                  </div>
                  <span className={`font-semibold ${transaction.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {transaction.amount > 0 ? '+' : '-'}₹{Math.abs(transaction.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}