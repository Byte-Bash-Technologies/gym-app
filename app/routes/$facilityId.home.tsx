import { json, redirect, type LoaderFunction } from "@remix-run/node";
import { useLoaderData, Link, useParams, useNavigate } from "@remix-run/react";
import {
  Bell,
  Phone,
  Settings,
  ChevronDown,
  Cake,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { supabase } from "~/utils/supabase.server";
import { createServerClient, parse } from '@supabase/ssr';
import BottomNav from "~/components/BottomNav";

interface Gym {
  id: string;
  name: string;
}

interface Stats {
  activeMembers: number;
  expiringSoon: number;
  expiredMembers: number;
  totalMembers: number;
}

interface Birthday {
  id: number;
  name: string;
  avatar: string;
}

interface TransactionStats {
  received: number;
  paid: number;
  pending: number;
}

interface DailyEarning {
  date: string;
  amount: number;
}

interface Member {
  id: number;
  full_name: string;
  memberships: { status: string; end_date: string }[];
}

export const loader: LoaderFunction = async ({ params,request }) => {
  const supabaseAuth = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => parse(request.headers.get("Cookie") || "")[key],
        set: () => {},
        remove: () => {},
      },
    }
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  

  if (!user) {
    return redirect('/login');
  }

  
  const facilityId = params.facilityId;

  // Fetch gyms
  const { data: gyms, error: gymsError } = await supabase
    .from('facilities')
    .select('id, name')
    .eq('user_id', user.id);

  if (gymsError) throw new Error('Failed to fetch gyms');

  // Fetch current gym
  const { data: currentGym, error: currentGymError } = await supabase
    .from('facilities')
    .select('id, name')
    .eq('id', facilityId)
    .single();

  if (currentGymError) throw new Error('Failed to fetch current gym');

  // Fetch members and their memberships for the specific facility
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select(`
      id,
      full_name,
      memberships (
        status,
        end_date
      )
    `)
    .eq('facility_id', facilityId);

  if (membersError) throw new Error('Failed to fetch members and memberships');

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const statsData: Stats = {
    activeMembers: 0,
    expiringSoon: 0,
    expiredMembers: 0,
    totalMembers: members.length,
  };

  members.forEach(member => {
    if (member.memberships && member.memberships.length > 0) {
      const latestMembership = member.memberships[member.memberships.length - 1];
      if (latestMembership.status === 'active') {
        statsData.activeMembers++;
        const endDate = new Date(latestMembership.end_date);
        if (endDate <= thirtyDaysFromNow && endDate > now) {
          statsData.expiringSoon++;
        }
      } else if (new Date(latestMembership.end_date) < now) {
        statsData.expiredMembers++;
      }
    }
  });

  // Fetch birthdays
  const today = now.toISOString().split('T')[0];
  const { data: birthdays, error: birthdaysError } = await supabase
    .from('members')
    .select('id, full_name, date_of_birth')
    .eq('facility_id', facilityId);

  if (birthdaysError) throw new Error('Failed to fetch birthdays');

  const todayBirthdays = birthdays.filter(member => {
    const dob = new Date(member.date_of_birth);
    return dob.getMonth() === now.getMonth() && dob.getDate() === now.getDate();
  });
  // Fetch transactions
  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select('amount, created_at')
    .eq('type', 'payment')
    .eq('facility_id', facilityId)
    .gte('created_at', now.toISOString().split('T')[0]);

  if (transactionsError) throw new Error('Failed to fetch transactions');

  const income = transactions.reduce((sum, t) => sum + t.amount, 0);

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const { data: previousTransactions, error: previousError } = await supabase
    .from('transactions')
    .select('amount')
    .eq('type', 'payment')
    .eq('facility_id', facilityId)
    .gte('created_at', yesterday.toISOString().split('T')[0])
    .lt('created_at', now.toISOString().split('T')[0]);

  if (previousError) throw new Error('Failed to fetch previous transactions');

  const previousIncome = previousTransactions.reduce((sum, t) => sum + t.amount, 0);

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const { data: weeklyTransactions, error: weeklyError } = await supabase
    .from('transactions')
    .select('amount, created_at')
    .eq('type', 'payment')
    .eq('facility_id', facilityId)
    .gte('created_at', sevenDaysAgo.toISOString());

  if (weeklyError) throw new Error('Failed to fetch weekly transactions');

  const weeklyIncome = weeklyTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Calculate daily earnings for the past week
  const dailyEarnings: DailyEarning[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateString = date.toISOString().split('T')[0];
    const amount = weeklyTransactions
      .filter(t => t.created_at.startsWith(dateString))
      .reduce((sum, t) => sum + t.amount, 0);
    return { date: dateString, amount };
  }).reverse();

  // Calculate transaction stats
  const totalTransactions = transactions.length;
  const transactionStats: TransactionStats = {
    received: Math.round((transactions.filter(t => t.amount > 0).length / totalTransactions) * 100) || 0,
    paid: Math.round((transactions.filter(t => t.amount < 0).length / totalTransactions) * 100) || 0,
    pending: 0,
  };
  transactionStats.pending = 100 - transactionStats.received - transactionStats.paid;

  // Fetch total pending balance from members table
  const { data: membersBalance, error: membersBalanceError } = await supabase
    .from('members')
    .select('balance')
    .eq('facility_id', facilityId)
    .gt('balance', 0);

  if (membersBalanceError) throw new Error('Failed to fetch members balance');

  const totalPendingBalance = membersBalance.reduce((sum, member) => sum + member.balance, 0);

  return json({
    gyms,
    currentGym,
    stats: statsData,
    birthdays: todayBirthdays.map(b => ({
      id: b.id,
      name: b.full_name,
      avatar: `https://api.dicebear.com/6.x/initials/svg?seed=${b.full_name}`,
    })),
    transactionStats,
    income,
    previousIncome,
    weeklyIncome,
    dailyEarnings,
    totalPendingBalance,
  });
};
export default function Index() {
  const params = useParams();
  const navigate = useNavigate();
  const {
    gyms,
    currentGym,
    stats,
    birthdays,
    income,
    previousIncome,
    weeklyIncome,
    totalPendingBalance,
  } = useLoaderData<typeof loader>();

  // Calculate total amount and percentages for the pie chart
  const totalAmount = income + totalPendingBalance;
  const receivedPercentage = (income / totalAmount) * 100;
  const pendingPercentage = (totalPendingBalance / totalAmount) * 100;

  // Calculate stroke-dasharray and stroke-dashoffset for each segment
  const circumference = 2 * Math.PI * 45;
  const receivedDash = (receivedPercentage / 100) * circumference;
  const pendingDash = (pendingPercentage / 100) * circumference;

  const handleStatClick = (filter: string) => {
    navigate(`/${params.facilityId}/members?filter=${filter}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Avatar className="h-10 w-10">
            <AvatarImage src="/placeholder.svg" alt={currentGym.name} />
            <AvatarFallback>{currentGym.name[0]}</AvatarFallback>
          </Avatar>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center">
                <span className="font-bold">{currentGym.name}</span>
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {gyms.map((gym: Gym) => (
                <DropdownMenuItem key={gym.id}>
                  <Link to={`/${gym.id}`} className="w-full">
                    {gym.name}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem>
                <Link to="/" className="w-full">
                  Manage Facilities
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center space-x-4">
          <Bell className="h-6 w-6 text-purple-500" />
          <Phone className="h-6 w-6 text-purple-500" />
          <Link to="/settings">
            <Settings className="h-6 w-6 text-purple-500" />
          </Link>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 p-4">
        <Link to={`/${params.facilityId}/members?filter=active`}>
          <Card className="bg-white shadow-sm cursor-pointer" onClick={() => handleStatClick('active')}>
            <CardContent className="p-4">
              <p className="text-gray-600">Active members</p>
              <p className="text-4xl font-bold text-green-500">
                {stats.activeMembers}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link to={`/${params.facilityId}/members?filter=expired`}>
          <Card className="bg-white shadow-sm cursor-pointer" onClick={() => handleStatClick('expiring')}>
            <CardContent className="p-4">
              <p className="text-gray-600">Expiring soon</p>
              <p className="text-4xl font-bold text-yellow-500">
                {stats.expiringSoon}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link to={`/${params.facilityId}/members?filter=expired`}>
          <Card className="bg-white shadow-sm cursor-pointer" onClick={() => handleStatClick('expired')}>
            <CardContent className="p-4">
              <p className="text-gray-600">Expired members</p>
              <p className="text-4xl font-bold text-red-500">
                {stats.expiredMembers}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link to={`/${params.facilityId}/members`}>
          <Card className="bg-white shadow-sm cursor-pointer" onClick={() => handleStatClick('all')}>
            <CardContent className="p-4">
              <p className="text-gray-600">Total members</p>
              <p className="text-4xl font-bold text-blue-500">
                {stats.totalMembers}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Birthdays Section */}
      {birthdays.length > 0 && (
        <div className="p-4">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <Cake className="mr-2 h-6 w-6 text-purple-500" />
            Birthdays Today
          </h2>
          <div className="flex space-x-4">
            {birthdays.map((birthday: Birthday) => (
              <div key={birthday.id} className="flex flex-col items-center">
                <Avatar className="h-16 w-16 ring-2 ring-purple-100">
                  <AvatarImage src={birthday.avatar} alt={birthday.name} />
                  <AvatarFallback>{birthday.name[0]}</AvatarFallback>
                </Avatar>
                <span className="mt-2 text-sm font-medium text-gray-700">{birthday.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expired Members Section */}
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">Expired Memberships</h2>
        <Card>
          <CardContent>
            <ul className="divide-y divide-gray-200">
              {stats.expiredMembers > 0 ? (
                // This is a placeholder. You'll need to fetch and map over actual expired members data.
                <li className="py-4">
                  <Link to={`/${params.facilityId}/members?filter=expired`} className="text-blue-500 hover:underline">
                    View {stats.expiredMembers} expired members
                  </Link>
                </li>
              ) : (
                <li className="py-4 text-gray-500">No expired memberships</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Expiring Soon Section */}
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">Memberships Expiring Soon</h2>
        <Card>
          <CardContent>
            <ul className="divide-y divide-gray-200">
              {stats.expiringSoon > 0 ? (
                // This is a placeholder. You'll need to fetch and map over actual expiring soon members data.
                <li className="py-4">
                  <Link to={`/${params.facilityId}/members?filter=expiring`} className="text-blue-500 hover:underline">
                    View {stats.expiringSoon} members with expiring memberships
                  </Link>
                </li>
              ) : (
                <li className="py-4 text-gray-500">No memberships expiring soon</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Section */}
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">Transactions</h2>
        <div className="grid md:grid-cols-2 gap-4">
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}