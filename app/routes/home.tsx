import { json, type LoaderFunction } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { Bell, Phone, Settings, ChevronDown, Home, Wallet, PieChart, Users } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

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

export const loader: LoaderFunction = async () => {
  // Mock data
  const gyms: Gym[] = [
    { id: "1", name: "Jain workout zone" },
    { id: "2", name: "Fitness First" },
    { id: "3", name: "Gold's Gym" },
  ];

  const stats: Stats = {
    activeMembers: 120,
    expiringSoon: 130,
    expiredMembers: 120,
    totalMembers: 120
  };

  const birthdays: Birthday[] = [
    { id: 1, name: "Member 1", avatar: "/placeholder.svg" },
    { id: 2, name: "Member 2", avatar: "/placeholder.svg" },
    { id: 3, name: "Member 3", avatar: "/placeholder.svg" },
  ];

  const transactionStats: TransactionStats = {
    received: 54,
    paid: 20,
    pending: 26
  };

  return json({
    gyms,
    currentGym: gyms[0],
    stats,
    birthdays,
    transactionStats,
    income: 5660.00,
    previousIncome: 5240.00,
    weeklyIncome: 22658.00,
  });
};

export default function Index() {
  const { gyms, currentGym,stats, birthdays, transactionStats, income, previousIncome, weeklyIncome } = useLoaderData<typeof loader>();

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
                  <Link to={`/?gymId=${gym.id}`} className="w-full">
                    {gym.name}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem>
                <Link to="/dashboard" className="w-full">
                  Manage Gyms
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
        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <p className="text-gray-600">Active members</p>
            <p className="text-4xl font-bold text-green-500">{stats.activeMembers}</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <p className="text-gray-600">Expiring soon</p>
            <p className="text-4xl font-bold text-yellow-500">{stats.expiringSoon}</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <p className="text-gray-600">Expired members</p>
            <p className="text-4xl font-bold text-red-500">{stats.expiredMembers}</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-sm">
          <CardContent className="p-4">
            <p className="text-gray-600">Total members</p>
            <p className="text-4xl font-bold text-blue-500">{stats.totalMembers}</p>
          </CardContent>
        </Card>
      </div>

      {/* Birthdays Section */}
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">Birthdays Today</h2>
        <div className="flex space-x-4">
            {birthdays.map((birthday: Birthday) => (
            <Avatar key={birthday.id} className="h-16 w-16 ring-2 ring-purple-100">
              <AvatarImage src={birthday.avatar} alt={birthday.name} />
              <AvatarFallback>{birthday.name[0]}</AvatarFallback>
            </Avatar>
            ))}
        </div>
      </div>

      {/* Transactions Section */}
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">Transactions</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-white p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Transcations</h3>
              <Button variant="secondary" size="sm">Today</Button>
            </div>
            <div className="relative w-48 h-48 mx-auto">
              <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
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
                  strokeDasharray={`${transactionStats.received * 2.83} ${283 - transactionStats.received * 2.83}`}
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="10"
                  strokeDasharray={`${transactionStats.paid * 2.83} ${283 - transactionStats.paid * 2.83}`}
                  strokeDashoffset={-transactionStats.received * 2.83}
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="10"
                  strokeDasharray={`${transactionStats.pending * 2.83} ${283 - transactionStats.pending * 2.83}`}
                  strokeDashoffset={-(transactionStats.received + transactionStats.paid) * 2.83}
                />
              </svg>
            </div>
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
                  <span>Total received</span>
                </div>
                <span>{transactionStats.received}% ↑</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                  <span>Total Paid</span>
                </div>
                <span>{transactionStats.paid}% ↑</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
                  <span>Total Pending</span>
                </div>
                <span>{transactionStats.pending}% ↓</span>
              </div>
            </div>
          </Card>

          <Card className="bg-white p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Income</h3>
              <Button variant="secondary" size="sm">Today</Button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center">
                  <h3 className="text-4xl font-bold">${income.toFixed(2)}</h3>
                  <span className="ml-2 text-green-500">↑ 2.5%</span>
                </div>
                <p className="text-sm text-gray-500">Compared to ${previousIncome} yesterday</p>
              </div>
              <div>
                <p className="text-sm font-medium">Last week incomes</p>
                <p className="text-2xl font-bold">${weeklyIncome.toFixed(2)}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-purple-100 p-2 rounded-t-3xl">
        <div className="flex justify-around items-center text-gray-500">
          <Link to="/home" className="flex flex-col items-center">
            <div className="bg-purple-500 rounded-full p-3">
              <Home className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs text-purple-500">Home</span>
          </Link>
          <Link to="/transaction" className="flex flex-col items-center text-gray-500">
            <Wallet className="h-6 w-6" />
            <span className="text-xs">Transaction</span>
          </Link>
          <Link to="/report" className="flex flex-col items-center text-gray-500">
            <PieChart className="h-6 w-6" />
            <span className="text-xs">Report</span>
          </Link>
          <Link to="/members" className="flex flex-col items-center text-gray-500">
            <Users className="h-6 w-6" />
            <span className="text-xs">Members</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}