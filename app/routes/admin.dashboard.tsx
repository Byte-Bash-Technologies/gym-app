import { json, type LoaderFunction } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { supabase } from "~/utils/supabase.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Users, DollarSign, TrendingUp, Activity, UserPlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

interface DashboardData {
  recentTransactions: Transaction[];
  facilityDetails: Facility[];
  memberStats: MemberStats;
  revenueData: RevenueData[];
  membershipDistribution: MembershipDistribution[];
  facilitySubscriptionRevenue: number;
}

interface Transaction {
  id: number;
  amount: number;
  date: string;
  memberName: string;
}

interface Facility {
  id: number;
  name: string;
  address: string;
  totalMembers: number;
  activeMembers: number;
  revenue: number;
}

interface MemberStats {
  totalMembers: number;
  activeMembers: number;
  newMembersThisMonth: number;
  expiringMemberships: number;
  memberGrowth: number;
}

interface RevenueData {
  date: string;
  revenue: number;
}

interface MembershipDistribution {
  plan: string;
  members: number;
}

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const transactionPeriod = url.searchParams.get("transactionPeriod") || "all";

  // Fetch data from Supabase
  let transactionQuery = supabase
    .from("transactions")
    .select("id, amount, created_at, members(full_name)")
    .order("created_at", { ascending: false });

  const now = new Date();
  switch (transactionPeriod) {
    case "today":
      transactionQuery = transactionQuery.gte("created_at", now.toISOString().split('T')[0]);
      break;
    case "week":
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      transactionQuery = transactionQuery.gte("created_at", oneWeekAgo.toISOString());
      break;
    case "month":
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      transactionQuery = transactionQuery.gte("created_at", oneMonthAgo.toISOString());
      break;
    // "all" case doesn't need any additional filtering
  }

  const { data: transactions } = await transactionQuery.limit(5);

  const { data: facilityData } = await supabase
    .from("facilities")
    .select("id, name, address");

  const { count: totalMembers } = await supabase
    .from("members")
    .select("id", { count: "exact" });

  const { count: activeMembers } = await supabase
    .from("members")
    .select("id", { count: "exact" })
    .eq("status", "active");

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const { count: newMembersThisMonth } = await supabase
    .from("members")
    .select("id", { count: "exact" })
    .gte("joined_date", oneMonthAgo.toISOString());

  const oneMonthFromNow = new Date();
  oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

  const { count: expiringMemberships } = await supabase
    .from("memberships")
    .select("id", { count: "exact" })
    .lt("end_date", oneMonthFromNow.toISOString())
    .gt("end_date", new Date().toISOString());

  const { count: lastMonthMembers } = await supabase
    .from("members")
    .select("id", { count: "exact" })
    .lt("joined_date", oneMonthAgo.toISOString());

  const memberGrowth = ((totalMembers - lastMonthMembers) / lastMonthMembers) * 100;

  // Fetch revenue data for the past 30 days
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const { data: revenueData } = await supabase
    .from("transactions")
    .select("amount, created_at")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: true });

  // Fetch membership distribution data
  const { data: membershipData } = await supabase
    .from("memberships")
    .select("plans(name)")
    .eq("status", "active");

  const membershipDistribution = membershipData.reduce((acc, membership) => {
    const planName = membership.plans.name;
    acc[planName] = (acc[planName] || 0) + 1;
    return acc;
  }, {});

  // Calculate facility subscription revenue (assuming a fixed subscription fee per facility)
  const facilitySubscriptionFee = 100; // Replace with actual subscription fee
  const facilitySubscriptionRevenue = facilityData.length * facilitySubscriptionFee;

  // Prepare facility details with mock revenue (replace with actual data in production)
  const facilityDetails = facilityData.map((facility, index) => ({
    ...facility,
    totalMembers: Math.floor(Math.random() * 1000),
    activeMembers: Math.floor(Math.random() * 800),
    revenue: Math.floor(Math.random() * 10000),
  }));

  const dashboardData: DashboardData = {
    recentTransactions: transactions?.map((t) => ({
      id: t.id,
      amount: t.amount,
      date: new Date(t.created_at).toLocaleDateString(),
      memberName: t.members.full_name,
    })) || [],
    facilityDetails,
    memberStats: {
      totalMembers: totalMembers || 0,
      activeMembers: activeMembers || 0,
      newMembersThisMonth: newMembersThisMonth || 0,
      expiringMemberships: expiringMemberships || 0,
      memberGrowth,
    },
    revenueData: revenueData?.map((r) => ({
      date: new Date(r.created_at).toLocaleDateString(),
      revenue: r.amount,
    })) || [],
    membershipDistribution: Object.entries(membershipDistribution).map(([plan, members]) => ({
      plan,
      members,
    })),
    facilitySubscriptionRevenue,
  };

  return json(dashboardData);
};

export default function AdminDashboard() {
  const data = useLoaderData<DashboardData>();
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Facility Insights Dashboard</h1>
        <Link to="/signup">
          <Button>
        <UserPlus className="mr-2 h-4 w-4" />
        Add User
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.memberStats.totalMembers}</div>
            <p className={`text-xs ${data.memberStats.memberGrowth >= 0 ? "text-green-500" : "text-red-500"}`}>
              {data.memberStats.memberGrowth >= 0 ? "+" : ""}{data.memberStats.memberGrowth.toFixed(2)}% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.memberStats.activeMembers}</div>
            <p className="text-xs text-muted-foreground">
              {data.memberStats.expiringMemberships} expiring soon
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.revenueData.reduce((sum, item) => sum + item.revenue, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired Members</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.memberStats.newMembersThisMonth}</div>
            <p className="text-xs text-muted-foreground">+180.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facility Subscription Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.facilitySubscriptionRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From {data.facilityDetails.length} facilities</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.revenueData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" fillOpacity={1} fill="url(#colorRevenue)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Membership Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.membershipDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="members"
                >
                  {data.membershipDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader className="flex justify-between items-center">
            <CardTitle>Recent Transactions</CardTitle>
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={`https://avatar.vercel.sh/${transaction.memberName}.png`} alt={transaction.memberName} />
                    <AvatarFallback>{transaction.memberName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{transaction.memberName}</p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.date}
                    </p>
                  </div>
                  <div className="ml-auto font-medium">
                    ${transaction.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between items-center">
            <CardTitle>Facility Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.facilityDetails.map((facility) => (
                <div key={facility.id} className="border-b pb-4 last:border-b-0">
                  <h3 className="text-lg font-semibold">{facility.name}</h3>
                  <p className="text-sm text-muted-foreground">{facility.address}</p>
                  <div className="mt-2 flex justify-between items-center">
                    <span>Total Members:</span>
                    <Badge variant="secondary">{facility.totalMembers}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Active Members:</span>
                    <Badge variant="secondary">{facility.activeMembers}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Revenue:</span>
                    <Badge variant="secondary">${facility.revenue.toLocaleString()}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}