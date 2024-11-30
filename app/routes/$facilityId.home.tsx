import { json, redirect, type LoaderFunction } from "@remix-run/node";
import { useLoaderData, Link, useParams, useNavigate } from "@remix-run/react";
import { Bell, Phone, Settings, ChevronDown } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { supabase } from "~/utils/supabase.server";
import { createServerClient, parse } from "@supabase/ssr";

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
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const facilityId = params.facilityId;

  // Fetch gyms
  const { data: gyms, error: gymsError } = await supabase
    .from("facilities")
    .select("id, name")
    .eq("user_id", user.id);

  if (gymsError) throw new Error("Failed to fetch gyms");

  // Fetch current gym
  const { data: currentGym, error: currentGymError } = await supabase
    .from("facilities")
    .select("id, name")
    .eq("id", facilityId)
    .single();

  if (currentGymError) throw new Error("Failed to fetch current gym");

  // Fetch members and their memberships for the specific facility
  const { data: members, error: membersError } = await supabase
    .from("members")
    .select(
      `
      id,
      full_name,
      balance,
      memberships (
        status,
        end_date
      )
    `
    )
    .eq("facility_id", facilityId);

  if (membersError) throw new Error("Failed to fetch members and memberships");

  const now = new Date();
  const tenDaysFromNow = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

  const statsData: Stats = {
    activeMembers: 0,
    expiringSoon: 0,
    expiredMembers: 0,
    totalMembers: members.length,
  };

  const expiredMembers: Member[] = [];
  const expiringSoonMembers: Member[] = [];
  const membersWithBalance: Member[] = [];

  members.forEach((member) => {
    if (member.balance > 0) {
      membersWithBalance.push(member);
    }

    if (member.memberships && member.memberships.length > 0) {
      let hasActiveMembership = false;
      let isExpiringSoon = false;
      let allMembershipsExpired = true;

      member.memberships.forEach((membership) => {
        const endDate = new Date(membership.end_date);
        if (endDate > now) {
          allMembershipsExpired = false;
          if (membership.status === "active") {
            hasActiveMembership = true;
            if (endDate <= tenDaysFromNow) {
              isExpiringSoon = true;
            }
          }
        }
      });

      if (hasActiveMembership) {
        statsData.activeMembers++;
        if (isExpiringSoon) {
          statsData.expiringSoon++;
          expiringSoonMembers.push(member);
        }
      }

      if (allMembershipsExpired) {
        statsData.expiredMembers++;
        expiredMembers.push(member);
      }
    } else {
      // If a member has no memberships, consider them expired
      statsData.expiredMembers++;
      expiredMembers.push(member);
    }
  });

  // Fetch birthdays
  const today = now.toISOString().split("T")[0];
  const { data: birthdays, error: birthdaysError } = await supabase
    .from("members")
    .select("id, full_name, date_of_birth")
    .eq("facility_id", facilityId);

  if (birthdaysError) throw new Error("Failed to fetch birthdays");

  const todayBirthdays = birthdays.filter((member) => {
    const dob = new Date(member.date_of_birth);
    return dob.getMonth() === now.getMonth() && dob.getDate() === now.getDate();
  });

  return json({
    gyms,
    currentGym,
    stats: statsData,
    birthdays: todayBirthdays.map((b) => ({
      id: b.id,
      name: b.full_name,
      avatar: `https://api.dicebear.com/6.x/initials/svg?seed=${b.full_name}`,
    })),
    expiredMembers,
    expiringSoonMembers,
    membersWithBalance,
    currentDate: now.toISOString(),
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
    expiredMembers,
    expiringSoonMembers,
    membersWithBalance,
    currentDate,
  } = useLoaderData<typeof loader>();

  const handleStatClick = (filter: string) => {
    if (filter === "all") {
      return navigate(`/${params.facilityId}/members`);
    }
    navigate(
      `/${params.facilityId}/members?sortBy=name&sortOrder=asc&status=${filter}`
    );
  };

  const formatExpirationDate = (endDate: string) => {
    const expirationDate = new Date(endDate);
    const now = new Date(currentDate);
    const diffTime = expirationDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return `Expires in ${diffDays} day${diffDays !== 1 ? "s" : ""}`;
    } else if (diffDays < 0) {
      return `Expired ${Math.abs(diffDays)} day${
        Math.abs(diffDays) !== 1 ? "s" : ""
      } ago`;
    } else {
      return "Expires today";
    }
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
          <a href="tel:7010976271">
            <Phone className="h-6 w-6 text-purple-500" />
          </a>
          <a href={`/${params.facilityId}/settings`}>
            <Settings className="h-6 w-6 text-purple-500" />
          </a>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 p-4">
        <Card
          className="bg-white shadow-sm cursor-pointer"
          onClick={() => handleStatClick("active")}
        >
          <CardContent className="p-4">
            <p className="text-gray-600">Active members</p>
            <p className="text-4xl font-bold text-green-500">
              {stats.activeMembers}
            </p>
          </CardContent>
        </Card>
        <Card
          className="bg-white shadow-sm cursor-pointer"
          onClick={() => handleStatClick("expiring")}
        >
          <CardContent className="p-4">
            <p className="text-gray-600">Expiring soon</p>
            <p className="text-4xl font-bold text-yellow-500">
              {stats.expiringSoon}
            </p>
          </CardContent>
        </Card>
        <Card
          className="bg-white shadow-sm cursor-pointer"
          onClick={() => handleStatClick("expired")}
        >
          <CardContent className="p-4">
            <p className="text-gray-600">Expired members</p>
            <p className="text-4xl font-bold text-red-500">
              {stats.expiredMembers}
            </p>
          </CardContent>
        </Card>
        <Card
          className="bg-white shadow-sm cursor-pointer"
          onClick={() => handleStatClick("all")}
        >
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
          <h2 className="text-xl font-bold mb-4">Birthdays Today</h2>
          <div className="flex space-x-4">
            {birthdays.map((birthday: Birthday) => (
              <div key={birthday.id} className="flex flex-col items-center">
                <Avatar className="h-16 w-16 ring-2 ring-purple-100">
                  <AvatarImage src={birthday.avatar} alt={birthday.name} />
                  <AvatarFallback>{birthday.name[0]}</AvatarFallback>
                </Avatar>
                <span className="mt-2 text-sm font-medium text-gray-700">
                  {birthday.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expired Members Section */}
      <div className="p-4">
        <h2 className="text-lg font-bold mb-4">Expired Memberships</h2>
        <Card>
          <CardContent>
            <ul className="divide-y divide-gray-200">
              {expiredMembers.length > 0 ? (
                expiredMembers.slice(0, 5).map((member) => (
                  <li
                    key={member.id}
                    className="py-4 flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage
                          src={`https://api.dicebear.com/6.x/initials/svg?seed=${member.full_name}`}
                          alt={member.full_name}
                        />
                        <AvatarFallback>{member.full_name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-medium">{member.full_name}</span>
                        <p className="text-sm text-gray-500">
                          {member.memberships && member.memberships.length > 0
                            ? formatExpirationDate(
                                member.memberships[0].end_date
                              )
                            : "No active membership"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="destructive">Expired</Badge>
                  </li>
                ))
              ) : (
                <li className="py-4 text-gray-500">No expired memberships</li>
              )}
            </ul>
            {expiredMembers.length > 5 && (
              <Button
                variant="link"
                className="mt-2"
                onClick={() => handleStatClick("expired")}
              >
                View all {expiredMembers.length} expired members
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expiring Soon Section */}
      <div className="p-4">
        <h2 className="text-lg font-bold mb-4">Memberships Expiring Soon</h2>
        <Card>
          <CardContent>
            <ul className="divide-y divide-gray-200">
              {expiringSoonMembers.length > 0 ? (
                expiringSoonMembers.slice(0, 5).map((member) => (
                  <li
                    key={member.id}
                    className="py-4 flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage
                          src={`https://api.dicebear.com/6.x/initials/svg?seed=${member.full_name}`}
                          alt={member.full_name}
                        />
                        <AvatarFallback>{member.full_name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-medium">{member.full_name}</span>
                        <p className="text-sm text-gray-500">
                          {formatExpirationDate(member.memberships[0].end_date)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="warning">Expiring Soon</Badge>
                  </li>
                ))
              ) : (
                <li className="py-4 text-gray-500">
                  No memberships expiring soon
                </li>
              )}
            </ul>
            {expiringSoonMembers.length > 5 && (
              <Button
                variant="link"
                className="mt-2"
                onClick={() => handleStatClick("expiring")}
              >
                View all {expiringSoonMembers.length} members with expiring
                memberships
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Members with Balance Section */}
      <div className="p-4">
        <h2 className="text-lg font-bold mb-4">Members with Balance</h2>
        <Card>
          <CardContent>
            <ul className="divide-y divide-gray-200">
              {membersWithBalance.length > 0 ? (
                membersWithBalance.slice(0, 5).map((member) => (
                  <li
                    key={member.id}
                    className="py-4 flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage
                          src={`https://api.dicebear.com/6.x/initials/svg?seed=${member.full_name}`}
                          alt={member.full_name}
                        />
                        <AvatarFallback>{member.full_name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-medium">{member.full_name}</span>
                        <p className="text-sm text-gray-500">
                          {member.memberships && member.memberships.length > 0
                            ? new Date(
                                member.memberships[0].end_date
                              ).toLocaleDateString("en-GB")
                            : "No active membership"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-red-500">
                      ₹{member.balance}
                    </Badge>
                  </li>
                ))
              ) : (
                <li className="py-4 text-gray-500">No members with balance</li>
              )}
            </ul>
            {membersWithBalance.length > 5 && (
              <Button
                variant="link"
                className="mt-2"
                onClick={() => handleStatClick("balance")}
              >
                View all {membersWithBalance.length} members with balance
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
