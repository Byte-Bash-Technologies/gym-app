import { json, type LoaderFunction } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
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
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { supabase } from "~/utils/supabase.server";

interface Transaction {
  id: number;
  user: string;
  amount: number;
  timestamp: string;
  avatar: string;
}

export const loader: LoaderFunction = async () => {
  const today = new Date().toISOString().split('T')[0];

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
    .gte('created_at', today)
    .order('created_at', { ascending: false });

  if (transactionError) {
    console.error("Error fetching transactions:", transactionError);
    throw new Response("Error fetching transactions", { status: 500 });
  }

  // Calculate income
  const income = transactions.reduce((sum, t) => sum + t.amount, 0);

  // Fetch previous day's income
  const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];
  const { data: previousTransactions, error: previousError } = await supabase
    .from('transactions')
    .select('amount')
    .eq('type', 'payment')
    .gte('created_at', yesterday)
    .lt('created_at', today);

  if (previousError) {
    console.error("Error fetching previous transactions:", previousError);
    throw new Response("Error fetching previous transactions", { status: 500 });
  }

  const previousIncome = previousTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Fetch weekly income
  const weekStart = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0];
  const { data: weeklyTransactions, error: weeklyError } = await supabase
    .from('transactions')
    .select('amount')
    .eq('type', 'payment')
    .gte('created_at', weekStart);

  if (weeklyError) {
    console.error("Error fetching weekly transactions:", weeklyError);
    throw new Response("Error fetching weekly transactions", { status: 500 });
  }

  const weeklyIncome = weeklyTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Fetch total pending balance from members table
  const { data: membersBalance, error: membersBalanceError } = await supabase
    .from('members')
    .select('balance')
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
      avatar: `https://api.dicebear.com/6.x/initials/svg?seed=₹{t.members.full_name}`,
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
  });
};

export default function Transactions() {
  const { transactions, income, previousIncome, weeklyIncome, totalPendingBalance, stats } =
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
    }>();

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
              <Badge className="bg-purple-100 text-purple-500">✓</Badge>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-purple-500"
            >
              <Download className="h-5 w-5" />
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
                    strokeDasharray={`₹{stats.received * 2.83} ₹{
                      283 - stats.received * 2.83
                    }`}
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="10"
                    strokeDasharray={`₹{stats.paid * 2.83} ₹{
                      283 - stats.paid * 2.83
                    }`}
                    strokeDashoffset={-stats.received * 2.83}
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="10"
                    strokeDasharray={`₹{stats.pending * 2.83} ₹{
                      283 - stats.pending * 2.83
                    }`}
                    strokeDashoffset={-(stats.received + stats.paid) * 2.83}
                  />
                </svg>
              </div>
              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
                    <span>Total received</span>
                  </div>
                  <span>{stats.received}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                    <span>Total Paid</span>
                  </div>
                  <span>{stats.paid}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
                    <span>Total Pending</span>
                  </div>
                  <span>{totalPendingBalance.toFixed(2)}%</span>
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
                  <div className="h-32 bg-gradient-to-b from-purple-100/50">
                    {/* Placeholder for chart - would need a proper charting library for real implementation */}
                  </div>
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
          <Link to="/home" className="flex flex-col items-center text-gray-500">
            <Home className="h-6 w-6" />
            <span className="text-xs font-bold">Home</span>
          </Link>
          <Link
            to="/transaction"
            className="flex flex-col items-center text-gray-500"
          >
            <div className="bg-purple-500 rounded-full p-3">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs text-purple-500">Transaction</span>
          </Link>
          <Link
            to="/report"
            className="flex flex-col items-center text-gray-500"
          >
            <PieChart className="h-6 w-6" />
            <span className="text-xs">Report</span>
          </Link>
          <Link
            to="/members"
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