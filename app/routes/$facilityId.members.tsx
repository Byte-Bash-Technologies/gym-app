import { json, type LoaderFunction } from "@remix-run/node";
import { Outlet, useLoaderData, Link,useParams } from "@remix-run/react";
import {
  Bell,
  Phone,
  Settings,
  Search,
  UserPlus,
  Home,
  Wallet,
  PieChart,
  Users,
  Download,
  Filter,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Card } from "~/components/ui/card";
import { supabase } from "~/utils/supabase.server";

interface Member {
  id: number;
  full_name: string;
  phone: string;
  plan: string;
  status: "active" | "expired" | "expire soon";
}

export const loader: LoaderFunction = async ({params}) => {
  
  const facilityId = params.facilityId;

  const { data: facility, error: facilityError } = await supabase
    .from('facilities')
    .select('name')
    .eq('id', facilityId)
    .single();

  if (facilityError) {
    throw new Response("Facility not found", { status: 404 });
  }
  const { data: members, error } = await supabase
    .from("members")
    .select("id, full_name, email, phone, status")
    .eq("facility_id", facilityId)
    .order("full_name", { ascending: true });
  if (error) {
    console.error("Error fetching members:", error);
    throw new Response("Error fetching members", { status: 500 });
  }

  return json({ members,facility });
};

export default function MembersPage() {
  const { members } = useLoaderData<{ members: Member[] }>();
  const capitalizeFirstLetter = (string: string) => {
  
    return string.charAt(0).toUpperCase() + string.slice(1);
};
const params= useParams();
  return (
    <div className="min-h-screen bg-gray-100 pb-20 relative">
      {/* Header */}
      <header className="bg-white p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold ml-6">Members</h1>
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
        
        <h2 className="text-lg font-semibold mb-4">All members</h2>
        
        {/* Members List */}
        <Card className="bg-purple-100 p-4">
          <div className="bg-purple-100 rounded-3xl p-4 space-y-4">
            {members.map((member, index) => (
              <Link
                key={index}
                to={`${member.id}`}
                className="flex items-center gap-3 border-b border-purple-200 last:border-0 pb-4 last:pb-0"
              >
                <Avatar className="h-12 w-12">
                <AvatarImage
                  src={`https://api.dicebear.com/6.x/initials/svg?seed=${member.full_name}`}
                  alt={member.full_name}
                />
                  <AvatarFallback>{member.full_name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold">{member.full_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {member.phone}
                  </p>
                  <p className="text-sm text-muted-foreground">{member.plan}</p>
                </div>
                <div
                  className={`
                  h-2 w-2 rounded-full
                  ${
                    member.status === "active"
                      ? "bg-green-500"
                      : member.status === "expired"
                      ? "bg-red-500"
                      : "bg-yellow-500"
                  }
                `}
                />
                {capitalizeFirstLetter(member.status)}
              </Link>
            ))}
          </div>
        </Card>

        <Outlet />
      </main>

      {/* Floating Action Button */}
      <Link to={`/${params.facilityId}/members/new`} className="fixed right-6 bottom-[7rem]">
        <Button className="w-14 h-14 rounded-full bg-purple-500 hover:bg-purple-600 text-white shadow-lg">
          <UserPlus className="h-6 w-6" />
        </Button>
      </Link>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-purple-100 p-2 rounded-t-3xl">
        <div className="flex justify-around items-center">
          <Link to={`/${params.facilityId}/home`} className="flex flex-col items-center text-gray-500">
            <Home className="h-6 w-6 text-grey " />

            <span className="text-xs font-bold ">Home</span>
          </Link>
          <Link
            to={`/${params.facilityId}/transaction`}
            className="flex flex-col items-center text-gray-500"
          >
            <Wallet className="h-6 w-6" />
            <span className="text-xs">Transaction</span>
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
            <div className="bg-purple-500 rounded-full p-3">
              <Users className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs text-purple-500">Members</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
