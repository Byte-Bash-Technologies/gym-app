import { json, type LoaderFunction } from "@remix-run/node";
import { Outlet, useLoaderData, Link } from "@remix-run/react";
import { Bell, Phone, Settings, Search, CheckCircle, UserPlus, Home, Wallet, PieChart, Users } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar"
import { Card } from "~/components/ui/card"

interface Member {
  id: number
  name: string
  phone: string
  plan: string
  status: "Active" | "Expired" | "Expire soon"
}

// Mock data
const mockMembers: Member[] = [
  { id: 1, name: "Benston", phone: "+ 91 98765432", plan: "1 month plan", status: "Active" },
  { id: 2, name: "Benny", phone: "+ 91 98765432", plan: "3 months plan", status: "Active" },
  { id: 3, name: "Nithesh", phone: "+ 91 98765432", plan: "1 month plan", status: "Expired" },
  { id: 4, name: "Tony", phone: "+ 91 98765432", plan: "12 months plan", status: "Expire soon" },
  { id: 5, name: "Ragul", phone: "+ 91 98765432", plan: "6 months plan", status: "Active" },
  { id: 6, name: "Maxwel", phone: "+ 91 98765432", plan: "3 months plan", status: "Active" },
];

export const loader: LoaderFunction = async () => {
  return json({ members: mockMembers });
};

export default function MembersPage() {
  const { members } = useLoaderData<{ members: Member[] }>();

  return (
    <div className="min-h-screen bg-gray-100 pb-20 relative">
      {/* Header */}
      <header className="bg-white p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Members</h1>
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
        {/* Search Bar */}
        <div className="relative">
          <Input
            type="text"
            placeholder="Search by name or number"
            className="pl-10 pr-10 py-2 w-full bg-white rounded-full"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-purple-500" />
            <UserPlus className="h-5 w-5 text-purple-500" />
          </div>
        </div>

        {/* Members List */}
        <Card className="bg-purple-50 p-4">
          <h2 className="text-lg font-semibold mb-4">All members</h2>
          <div className="space-y-4">
            {members.map((member) => (
              <Link key={member.id} to={`/members/${member.id}`} className="block">
                <div className="flex items-center justify-between bg-white p-3 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src="/placeholder.svg" alt={member.name} />
                      <AvatarFallback>{member.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.phone}</p>
                      <p className="text-xs text-gray-400">{member.plan}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${
                    member.status === "Active" ? "text-green-500" :
                    member.status === "Expired" ? "text-red-500" :
                    "text-yellow-500"
                  }`}>
                    {member.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Outlet />
      </main>

      {/* Floating Action Button */}
      <Link to="/members/new" className="fixed right-6 bottom-[7rem]">
        <Button 
          className="w-14 h-14 rounded-full bg-purple-500 hover:bg-purple-600 text-white shadow-lg"
        >
          <UserPlus className="h-6 w-6" />
        </Button>
      </Link>

       {/* Bottom Navigation */}
       <nav className="fixed bottom-0 left-0 right-0 bg-purple-100 p-4 rounded-t-3xl">
        <div className="flex justify-around items-center">
          <Link to="/" className="flex flex-col items-center text-gray-500">
           
              <Home className="h-6 w-6 text-grey " />
            
            <span className="text-xs font-bold ">Home</span>
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
          <div className="bg-purple-500 rounded-full p-3">
            <Users className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs text-purple-500">Members</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}