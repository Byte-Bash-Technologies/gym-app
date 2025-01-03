// app/routes/$facilityId.home.tsx

import { json, redirect, type LoaderFunction } from "@remix-run/node";
import { useLoaderData, Link, useParams, useNavigate } from "@remix-run/react";
import { Bell, Phone, Settings, ChevronDown, ChevronRight } from 'lucide-react';
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
import { getAuthenticatedUser } from "~/utils/currentUser";

interface Gym {
  id: string;
  name: string;
  logo_url: string;
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
  memberships: { status: string; end_date: string; plans: { name: string } }[];
  balance: number;
}

export const loader: LoaderFunction = async ({ params, request }) => {
  const user = await getAuthenticatedUser(request);
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
    .select("id, name, logo_url")
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
      joined_date,
      memberships (
        id,
        start_date,
        end_date,
        status,
        is_disabled,
        plans (name, duration, price)
      )
    `
    )
    .eq("facility_id", facilityId);

  if (membersError) throw new Error("Failed to fetch members and memberships");

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const statsData: Stats = {
    activeMembers: 0,
    expiringSoon: 0,
    expiredMembers: 0,
    totalMembers: members.length,
  };

  const expiredMembers: Member[] = [];
  const expiringSoonMembers: Member[] = [];
  const membersWithBalance: Member[] = [];

  const processedMembers = members.map((member: any) => {
    if (member.balance > 0) {
      membersWithBalance.push(member);
    }

    const sortedMemberships = member.memberships.sort((a: any, b: any) => 
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
    const mostRecentMembership = sortedMemberships[0];
    let status = 'expired';
    let currentPlan = 'No Plan';
    
    if (mostRecentMembership) {
      currentPlan = mostRecentMembership.plans?.name || 'Unknown Plan';
      if (mostRecentMembership.status === "active" && !mostRecentMembership.is_disabled) {
        if (new Date(mostRecentMembership.end_date) <= sevenDaysFromNow) {
          status = "expiring";
          statsData.expiringSoon++;
          expiringSoonMembers.push(member);
        } else {
          status = "active";
          statsData.activeMembers++;
        }
      } else {
        statsData.expiredMembers++;
        expiredMembers.push(member);
      }
    } else {
      statsData.expiredMembers++;
      expiredMembers.push(member);
    }

    return {
      ...member,
      status,
      currentPlan
    };
  });

  // Fetch birthdays
  const today = now.toISOString().split("T")[0];
  const { data: birthdays, error: birthdaysError } = await supabase
    .from("members")
    .select("id, full_name,photo_url, date_of_birth")
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
      avatar:b.photo_url,
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
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
      <header className="bg-card text-card-foreground p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Avatar className="h-10 w-10">
            <AvatarImage src={currentGym.logo_url || `https://api.dicebear.com/9.x/identicon/svg/${currentGym.name[0]}`} alt={currentGym.name} />
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
          <a href="tel:7010976271">
            <Phone className="h-6 w-6 text-[#886fa6]" />
          </a>
          <a href={`/${params.facilityId}/settings`}>
            <Settings className="h-6 w-6 text-[#886fa6]" />
          </a>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 p-4 dark:bg-[#212237]">
        <Card
          className="bg-card text-card-foreground shadow-md cursor-pointer border-none"
          onClick={() => handleStatClick("active")}
        >
          <CardContent className="p-4 flex justify-between gap-2 items-center">
            <p className="text-gray-600">Active members</p>
            <p className="text-4xl font-bold text-green-500">
              {stats.activeMembers}
            </p>
          </CardContent>
        </Card>
        <Card 
          className="bg-card text-card-foreground shadow-md border-none cursor-pointer"
          onClick={() => handleStatClick("expiring")}
        >
          <CardContent className="p-4 flex justify-between gap-2 items-center">
            <p className="text-gray-600">Expiring soon</p>
            <p className="text-4xl font-bold text-yellow-500">
              {stats.expiringSoon}
            </p>
          </CardContent>
        </Card>
        <Card
          className="bg-card text-card-foreground shadow-md border-none cursor-pointer"
          onClick={() => handleStatClick("expired")}
        >
          <CardContent className="p-4 flex justify-between gap-2 items-center">
            <p className="text-gray-600">Expired members</p>
            <p className="text-4xl font-bold text-red-500">
              {stats.expiredMembers}
            </p>
          </CardContent>
        </Card>
        <Card
          className="bg-card text-card-foreground shadow-md border-none cursor-pointer"
          onClick={() => handleStatClick("all")}
        >
          <CardContent className="p-4 flex justify-between gap-2 items-center">
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
      <div className="p-4 dark:bg-[#212237]">
        <h4 className="text-lg font-bold mb-6">Expired Memberships</h4>
        <Card className="shadow-md border-none">
          <CardContent>
            <ul className="divide-y divide-purple-200">
              {expiredMembers.length > 0 ? (
                expiredMembers.slice(0, 5).map((member) => (
                  <li
                    key={member.id}
                    className="py-4 flex items-center justify-between"
                  >
                    <Link
                      to={`/${params.facilityId}/members/${member.id}`}
                      className="p-4 flex items-center justify-between w-full hover:bg-gray-50 dark:hover:bg-[#212237] rounded-xl transition-colors duration-150 ease-in-out"
                    >
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarImage
                            src={`https://api.dicebear.com/9.x/dylan/svg?seed=${member.full_name}`}
                            alt={member.full_name}
                          />
                          <AvatarFallback>{member.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium">
                            {member.full_name}
                          </span>
                          <p className="text-sm text-muted-foreground">
                            {member.memberships && member.memberships.length > 0
                              ? formatExpirationDate(
                                  member.memberships[0].end_date
                                )
                              : "No active membership"}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-destructive">Expired</Badge>
                    </Link>
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
      <div className="p-4 dark:bg-[#212237]">
        <h2 className="text-lg font-bold mb-4">Memberships Expiring Soon</h2>
        <Card className=" shadow-md border-none">
          <CardContent>
            <ul className="divide-y divide-gray-200">
              {expiringSoonMembers.length > 0 ? (
                expiringSoonMembers.slice(0, 5).map((member) => (
                  <li
                    key={member.id}
                    className="py-4 flex items-center justify-between"
                  >
                    <Link
                      to={`/${params.facilityId}/members/${member.id}`}
                      className="p-4 flex items-center justify-between w-full hover:bg-gray-50 dark:hover:bg-[#212237] rounded-xl transition-colors duration-150 ease-in-out"
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
                          <span className="font-medium">
                            {member.full_name}
                          </span>
                          <p className="text-sm text-muted-foreground">
                            {formatExpirationDate(
                              member.memberships[0].end_date
                            )}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-yellow-500">Expiring Soon</Badge>
                    </Link>
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
      <div className="p-4 dark:bg-[#212237]">
        <h2 className="text-lg font-bold mb-4">Members with Balance</h2>
        <Card className=" shadow-md border-none">
          <CardContent>
            <ul className="divide-y divide-gray-200">
              {membersWithBalance.length > 0 ? (
                membersWithBalance.slice(0, 5).map((member) => (
                  <li key={member.id}
                  className="py-4">
                    <Link
                      to={`/${params.facilityId}/members/${member.id}`}
                      className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#212237] rounded-xl transition-colors duration-150 ease-in-out"
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
                          <span className="font-medium">
                            {member.full_name}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-red-500">
                        ₹{member.balance}
                      </Badge>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="py-4 text-gray-500">No members with balance</li>
              )}
            </ul>
            {membersWithBalance.length > 5 && (
              <Button
                variant="link"
                className="mt-2 w-full flex items-center justify-center"
                onClick={() =>
                  navigate(`/${params.facilityId}/members?filter=withBalance`)
                }
              >
                View all {membersWithBalance.length} members with balance
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

