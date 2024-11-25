import { json, redirect, type LoaderFunction } from "@remix-run/node";
import { useLoaderData, Link, useParams, useNavigate } from "@remix-run/react";
import { Bell, Phone, Settings, ChevronDown, Cake, AlertTriangle, Clock, DollarSign } from 'lucide-react';
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
  balance: number;
}

export const loader: LoaderFunction = async ({ params, request }) => {
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
      balance,
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

  const expiredMembers: Member[] = [];
  const expiringSoonMembers: Member[] = [];
  const membersWithBalance: Member[] = [];

  members.forEach(member => {
    if (member.balance > 0) {
      membersWithBalance.push(member);
    }

    if (member.memberships && member.memberships.length > 0) {
      const latestMembership = member.memberships[member.memberships.length - 1];
      if (latestMembership.status === 'active') {
        statsData.activeMembers++;
        const endDate = new Date(latestMembership.end_date);
        if (endDate <= thirtyDaysFromNow && endDate > now) {
          statsData.expiringSoon++;
          expiringSoonMembers.push(member);
        }
      } else if (new Date(latestMembership.end_date) < now) {
        statsData.expiredMembers++;
        expiredMembers.push(member);
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

  // Calculate total pending balance
  const totalPendingBalance = membersWithBalance.reduce((sum, member) => sum + member.balance, 0);

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
    expiredMembers,
    expiringSoonMembers,
    membersWithBalance,
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
    expiredMembers,
    expiringSoonMembers,
    membersWithBalance,
  } = useLoaderData<typeof loader>();

  const handleStatClick = (filter: string) => {
    navigate(`/${params.facilityId}/members?filter=${filter}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Avatar className="h-10 w-10">
            <AvatarImage alt={currentGym.name} />
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
                  <Link to={`/${gym.id}/home`} className="w-full">
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
        <Card className="bg-white shadow-sm cursor-pointer" onClick={() => handleStatClick('active')}>
          <CardContent className="p-4">
            <p className="text-gray-600">Active members</p>
            <p className="text-4xl font-bold text-green-500">
              {stats.activeMembers}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm cursor-pointer" onClick={() => handleStatClick('expiring')}>
          <CardContent className="p-4">
            <p className="text-gray-600">Expiring soon</p>
            <p className="text-4xl font-bold text-yellow-500">
              {stats.expiringSoon}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm cursor-pointer" onClick={() => handleStatClick('expired')}>
          <CardContent className="p-4">
            <p className="text-gray-600">Expired members</p>
            <p className="text-4xl font-bold text-red-500">
              {stats.expiredMembers}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm cursor-pointer" onClick={() => handleStatClick('all')}>
          <CardContent className="p-4">
            <p className="text-gray-600">Total members</p>
            <p className="text-4xl font-bold text-blue-500">
              {stats.totalMembers}
            </p>
          </CardContent>
        </Card>
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
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <AlertTriangle className="mr-2 h-6 w-6 text-red-500" />
          Expired Memberships
        </h2>
        <Card>
          <CardContent>
            <ul className="divide-y divide-gray-200">
              {expiredMembers.length > 0 ? (
                expiredMembers.slice(0, 5).map((member) => (
                  <li key={member.id} className="py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${member.full_name}`} alt={member.full_name} />
                        <AvatarFallback>{member.full_name[0]}</AvatarFallback>
                      </Avatar>
                      <span>{member.full_name}</span>
                    </div>
                    <Badge variant="destructive">Expired</Badge>
                  </li>
                ))
              ) : (
                <li className="py-4 text-gray-500">No expired memberships</li>
              )}
            </ul>
            {expiredMembers.length > 5 && (
              <Button variant="link" className="mt-2" onClick={() => handleStatClick('expired')}>
                View all {expiredMembers.length} expired members
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expiring Soon Section */}
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <Clock className="mr-2 h-6 w-6 text-yellow-500" />
          Memberships Expiring Soon
        </h2>
        <Card>
          <CardContent>
            <ul className="divide-y divide-gray-200">
              {expiringSoonMembers.length > 0 ? (
                expiringSoonMembers.slice(0, 5).map((member) => (
                  <li key={member.id} className="py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${member.full_name}`} alt={member.full_name} />
                        <AvatarFallback>{member.full_name[0]}</AvatarFallback>
                      </Avatar>
                      <span>{member.full_name}</span>
                    </div>
                    <Badge variant="warning">Expiring Soon</Badge>
                  </li>
                ))
              ) : (
                <li className="py-4 text-gray-500">No memberships expiring soon</li>
              )}
            </ul>
            {expiringSoonMembers.length > 5 && (
              <Button variant="link" className="mt-2" onClick={() => handleStatClick('expiring')}>
                View all {expiringSoonMembers.length} members with expiring memberships
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Members with Balance Section */}
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <DollarSign className="mr-2 h-6 w-6 text-green-500" />
          Members with Balance
        </h2>
        <Card>
          <CardContent>
            <ul className="divide-y divide-gray-200">
              {membersWithBalance.length > 0 ? (
                membersWithBalance.slice(0, 5).map((member) => (
                  <li key={member.id} className="py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${member.full_name}`} alt={member.full_name} />
                        <AvatarFallback>{member.full_name[0]}</AvatarFallback>
                      </Avatar>
                      <span>{member.full_name}</span>
                    </div>
                    <Badge variant="secondary">₹{member.balance}</Badge>
                  </li>
                ))
              ) : (
                <li className="py-4 text-gray-500">No members with balance</li>
              )}
            </ul>
            {membersWithBalance.length > 5 && (
              <Button variant="link" className="mt-2" onClick={() => handleStatClick('balance')}>
                View all {membersWithBalance.length} members with balance
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}