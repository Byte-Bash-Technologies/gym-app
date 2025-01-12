import { json, type LoaderFunction } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { supabase } from "~/utils/supabase.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Users, DollarSign, TrendingUp, Activity, UserPlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

interface DashboardData {
  recentTransactions: Transaction[];
  facilityDetails: Facility[];
  memberStats: MemberStats;
  expiredSubscriptions: ExpiredSubscription[];
}

interface Transaction {
  id: number;
  amount: number | null;
  date: string;
  facilityName: string;
}

interface Facility {
  id: number;
  name: string;
  type: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

interface MemberStats {
  totalUsers: number;
  activeFacilities: number;
  totalRevenue: number;
  expiredFacilities: number;
}

interface ExpiredSubscription {
  id: number;
  facilityName: string;
  expirationDate: string;
}

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const transactionPeriod = url.searchParams.get("transactionPeriod") || "today";

  // Fetch total users count
  const { count: totalUsers } = await supabase
    .from("users")
    .select("id", { count: "exact" });

  // Fetch active facilities count
  const { count: activeFacilities } = await supabase
    .from("facilities")
    .select("id", { count: "exact" })
    .eq("status", "active");

  // Fetch expired facilities count
  const { count: expiredFacilities } = await supabase
    .from("facilities")
    .select("id", { count: "exact" })
    .eq("status", "expired");

  // Fetch total revenue from facility subscriptions
  const { data: revenueData } = await supabase
    .from("facility_subscriptions")
    .select("amount")
    .eq("status", "active");

  const totalRevenue = revenueData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

  // Fetch recent transactions from facility subscriptions
  let transactionQuery = supabase
    .from("facility_subscriptions")
    .select("id, amount, start_date, facilities(name)")
    .order("start_date", { ascending: false });

  const now = new Date();
  switch (transactionPeriod) {
    case "today":
      transactionQuery = transactionQuery.gte("start_date", now.toISOString().split('T')[0]);
      break;
    case "week": {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      transactionQuery = transactionQuery.gte("start_date", oneWeekAgo.toISOString());
      break;
    }
    case "month": {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      transactionQuery = transactionQuery.gte("start_date", oneMonthAgo.toISOString());
      break;
    }
    // "all" case doesn't need any additional filtering
  }

  const { data: transactions } = await transactionQuery.limit(10);

  // Fetch facility details
  const { data: facilityData } = await supabase
    .from("facilities")
    .select(`
      id, 
      name,
      type,
      address,
      phone,
      email
    `)
    .limit(5);

  // Fetch expired subscriptions
  const { data: expiredSubscriptions } = await supabase
    .from("facility_subscriptions")
    .select("id, end_date, facilities(name)")
    .lt("end_date", new Date().toISOString())
    .order("end_date", { ascending: false })
    .limit(10);

  const dashboardData: DashboardData = {
    recentTransactions: transactions?.map((t) => ({
      id: t.id,
      amount: typeof t.amount === 'number' ? t.amount : null,
      date: t.start_date ? new Date(t.start_date).toLocaleDateString() : 'Unknown Date',
      facilityName: t.facilities?.name || 'Unknown Facility',
    })) || [],
    facilityDetails: facilityData?.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      address: f.address,
      phone: f.phone,
      email: f.email,
    })) || [],
    memberStats: {
      totalUsers: totalUsers || 0,
      activeFacilities: activeFacilities || 0,
      totalRevenue,
      expiredFacilities: expiredFacilities || 0,
    },
    expiredSubscriptions: expiredSubscriptions?.map((sub) => ({
      id: sub.id,
      facilityName: sub.facilities?.name || 'Unknown Facility',
      expirationDate: new Date(sub.end_date).toLocaleDateString(),
    })) || [],
  };

  return json(dashboardData);
};

export default function AdminDashboard() {
  const data = useLoaderData<DashboardData>();

  return (
    <div className="container mx-auto pt-4 bg-[#f0ebff] dark:bg-[#212237]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Facility Insights Dashboard</h1>
        <Link to="/signup">
          <Button className="bg-[#886fa6] dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52] dark:text-white">
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.memberStats.totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Facilities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.memberStats.activeFacilities}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{data.memberStats.totalRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired Facilities</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.memberStats.expiredFacilities}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Expired Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.expiredSubscriptions.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{sub.facilityName}</p>
                    <p className="text-sm text-muted-foreground">Expired on: {sub.expirationDate}</p>
                  </div>
                  <Badge variant="destructive">Expired</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between items-center">
            <CardTitle>Recent Transactions</CardTitle>
            <Select defaultValue="today">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent className="dark:bg-[#4A4A62]">
                <SelectItem className="dark:focus:bg-[#3A3A52]/90 dark:hover:bg-[#3A3A52]/90" value="today">Today</SelectItem>
                <SelectItem className="dark:focus:bg-[#3A3A52]/90 dark:hover:bg-[#3A3A52]/90" value="week">This Week</SelectItem>
                <SelectItem className="dark:focus:bg-[#3A3A52]/90 dark:hover:bg-[#3A3A52]/90" value="month">This Month</SelectItem>
                <SelectItem className="dark:focus:bg-[#3A3A52]/90 dark:hover:bg-[#3A3A52]/90" value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={`https://avatar.vercel.sh/${transaction.facilityName}.png`} alt={transaction.facilityName} />
                    <AvatarFallback>{transaction.facilityName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{transaction.facilityName}</p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.date}
                    </p>
                  </div>
                  <div className="ml-auto font-medium">
                    ₹{transaction.amount?.toFixed(2) ?? 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Facility Details</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.facilityDetails.map((facility) => (
              <Link key={facility.id} to={`/admin/facilities/${facility.id}`} className="block">
                <Card className="h-full hover:shadow-md transition-shadow bg-[#f0ebff]">
                  <CardHeader>
                    <CardTitle>{facility.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">{facility.type}</p>
                    <p className="text-sm">{facility.address || 'No address'}</p>
                    <p className="text-sm">{facility.phone || 'No phone number'}</p>
                    <p className="text-sm">{facility.email || 'No email'}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}