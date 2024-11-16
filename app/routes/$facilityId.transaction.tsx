import { json, type LoaderFunction } from "@remix-run/node";
import { useLoaderData, Link, useParams } from "@remix-run/react";
import {
  Bell,
  Phone,
  Settings,
  Search,
  Download,
  Home,
  Wallet,
  PieChart,
  Users,
  Filter,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { supabase } from "~/utils/supabase.server";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "~/components/ui/chart";
import { Line, LineChart, XAxis, YAxis } from "recharts";

interface Transaction {
  id: number;
  user: string;
  amount: number;
  timestamp: string;
  avatar: string;
}

interface DailyEarning {
  date: string;
  amount: number;
}

export const loader: LoaderFunction = async ({ params }) => {
  const facilityId = params.facilityId;
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Fetch transactions for today
  const { data: transactions, error: transactionError } = await supabase
    .from('transactions')
    .select(`
      id,
      amount,
      created_at,
      members (id, full_name, email)
    `)
    .eq('type', 'payment')
    .eq('facility_id', facilityId)
    .gte('created_at', today.toISOString().split('T')[0])
    .order('created_at', { ascending: false });

  if (transactionError) {
    console.error("Error fetching transactions:", transactionError);
    throw new Response("Error fetching transactions", { status: 500 });
  }

  // Calculate income
  const income = transactions.reduce((sum, t) => sum + t.amount, 0);

  // Fetch previous day's income
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const { data: previousTransactions, error: previousError } = await supabase
    .from('transactions')
    .select('amount')
    .eq('type', 'payment')
    .eq('facility_id', facilityId)
    .gte('created_at', yesterday.toISOString().split('T')[0])
    .lt('created_at', today.toISOString().split('T')[0]);

  if (previousError) {
    console.error("Error fetching previous transactions:", previousError);
    throw new Response("Error fetching previous transactions", { status: 500 });
  }

  const previousIncome = previousTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Fetch weekly income and daily earnings
  const { data: weeklyTransactions, error: weeklyError } = await supabase
    .from('transactions')
    .select('amount, created_at')
    .eq('type', 'payment')
    .eq('facility_id', facilityId)
    .gte('created_at', sevenDaysAgo.toISOString());

  if (weeklyError) {
    console.error("Error fetching weekly transactions:", weeklyError);
    throw new Response("Error fetching weekly transactions", { status: 500 });
  }

  const weeklyIncome = weeklyTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Calculate daily earnings for the past week
  const dailyEarnings: DailyEarning[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const dateString = date.toISOString().split('T')[0];
    const amount = weeklyTransactions
      .filter(t => t.created_at.startsWith(dateString))
      .reduce((sum, t) => sum + t.amount, 0);
    return { date: dateString, amount };
  }).reverse();

  // Fetch total pending balance from members table
  const { data: membersBalance, error: membersBalanceError } = await supabase
    .from('members')
    .select('balance')
    .eq('facility_id', facilityId)
    .gt('balance', 0);

  if (membersBalanceError) {
    console.error("Error fetching members balance:", membersBalanceError);
    throw new Response("Error fetching members balance", { status: 500 });
  }

  const totalPendingBalance = membersBalance.reduce((sum, member) => sum + member.balance, 0);

  // Calculate stats
  const totalTransactions = transactions.length;
  const received = Math.round((transactions.filter(t => t.amount > 0).length / totalTransactions) * 100) || 0;
  const paid = Math.round((transactions.filter(t => t.amount < 0).length / totalTransactions) * 100) || 0;
  const pending = 100 - received - paid;

  return json({
    transactions: transactions.map(t => ({
      id: t.id,
      user: t.members.full_name,
      amount: t.amount,
      timestamp: new Date(t.created_at).toLocaleString(),
      avatar: `https://api.dicebear.com/6.x/initials/svg?seed=${t.members.full_name}`,
    })),
    income,
    previousIncome,
    weeklyIncome,
    totalPendingBalance,
    stats: {
      received,
      paid,
      pending,
    },
    dailyEarnings,
  });
};

export default function Transactions() {
  const params = useParams();
  const { transactions, income, previousIncome, weeklyIncome, totalPendingBalance, dailyEarnings } =
    useLoaderData<{
      transactions: Transaction[];
      income: number;
      previousIncome: number;
      weeklyIncome: number;
      totalPendingBalance: number;
      stats: {
        received: number;
        paid: number;
        pending: number;
      };
      dailyEarnings: DailyEarning[];
    }>();

  // Calculate total amount and percentages
  const totalAmount = income + totalPendingBalance;
  const receivedPercentage = (income / totalAmount) * 100;
  const pendingPercentage = (totalPendingBalance / totalAmount) * 100;

  // Calculate stroke-dasharray and stroke-dashoffset for each segment
  const circumference = 2 * Math.PI * 45;
  const receivedDash = (receivedPercentage / 100) * circumference;
  const pendingDash = (pendingPercentage / 100) * circumference;

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <header className="bg-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-xl font-bold ml-6">Transaction</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Bell className="h-6 w-6 text-purple-500" />
          <Phone className="h-6 w-6 text-purple-500" />
          <Link to="/settings">
            <Settings className="h-6 w-6 text-purple-500" />
          </Link>
        </div>
      </header>

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

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Transactions Chart */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Transactions</CardTitle>
                <Badge variant="secondary">Today</Badge>
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

          {/* Income Stats */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Income</CardTitle>
                <Badge variant="secondary">Today</Badge>
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
                      ↑ {((income - previousIncome) / previousIncome * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    Compared to ₹{previousIncome.toFixed(2)} yesterday
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Last week incomes</p>
                  <p className="text-2xl font-bold">
                    ₹{weeklyIncome.toFixed(2)}
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
                  <ChartContainer
                    config={{
                      amount: {
                        label: "Amount",
                        color: "hsl(216, 20%, 80%)",
                      },
                    }}
                    className="h-[300px] w-full"
                  >
                    <LineChart data={dailyEarnings}>
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })}
                      />
                      <YAxis
                        tickFormatter={(value) => `₹${value / 1000}k`}
                        domain={[0, 50000]}
                        ticks={[0, 10000, 20000, 30000, 40000, 50000]}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="var(--color-amount)"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "var(--color-amount)" }}
                      />
                    </LineChart>
                  </ChartContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions List */}
        <Card className="bg-purple-50">
          <CardContent className="p-4">
            {transactions.map((transaction: Transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between bg-white p-4 rounded-lg mb-2 last:mb-0"
              >
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage
                      src={transaction.avatar}
                      alt={transaction.user}
                    />
                    <AvatarFallback>{transaction.user[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{transaction.user}</p>
                    <p className="text-sm text-gray-500">
                      {transaction.timestamp}
                    </p>
                  </div>
                </div>
                <span className="text-green-500 font-medium">
                  +{transaction.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-purple-100 p-2 rounded-t-3xl">
        <div className="flex justify-around items-center">
          <Link to={`/${params.facilityId}/home`} className="flex flex-col items-center text-gray-500">
            <Home className="h-6 w-6" />
            <span className="text-xs font-bold">Home</span>
          </Link>
          <Link
            to={`/${params.facilityId}/transaction`}
            className="flex flex-col items-center text-gray-500"
          >
            <div className="bg-purple-500 rounded-full p-3">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs text-purple-500">Transaction</span>
          </Link>
          <Link
            to={`/${params.facilityId}/report`}
            className="flex flex-col items-center text-gray-500"
          >
            <PieChart className="h-6 w-6" />
            <span className="text-xs">Report</span>
          </Link>
          <Link
            to={`/${params.facilityId}/members`}
            className="flex flex-col items-center text-gray-500"
          >
            <Users className="h-6 w-6" />
            <span className="text-xs">Members</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}