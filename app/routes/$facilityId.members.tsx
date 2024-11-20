import { useState, useEffect, useTransition } from 'react';
import { json, type LoaderFunction } from "@remix-run/node";
import { Outlet, useLoaderData, Link, useParams, useFetcher, useNavigate, useSearchParams } from "@remix-run/react";
import {
  Bell,
  Phone,
  Settings,
  Search,
  UserPlus,
  Download,
  Filter,
  ChevronDown,
  X,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Card } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";

import { supabase } from "~/utils/supabase.server";
import BottomNav from "~/components/BottomNav";

interface Member {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  status: "active" | "expired" | "expiring";
}

interface Facility {
  name: string;
}

export const loader: LoaderFunction = async ({ params, request }) => {
  const facilityId = params.facilityId;
  const url = new URL(request.url);
  const filter = url.searchParams.get('filter');

  const { data: facility, error: facilityError } = await supabase
    .from('facilities')
    .select('name')
    .eq('id', facilityId)
    .single();

  if (facilityError) {
    throw new Response("Facility not found", { status: 404 });
  }

  let query = supabase
    .from("members")
    .select("id, full_name, email, phone, memberships(status, end_date)")
    .eq("facility_id", facilityId);

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (filter) {
    switch (filter) {
      case 'active':
        query = query.eq('memberships.status', 'active');
        break;
      case 'expired':
        query = query.lt('memberships.end_date', now.toISOString());
        break;
      case 'expiring':
        query = query.gte('memberships.end_date', now.toISOString()).lte('memberships.end_date', thirtyDaysFromNow.toISOString());
        break;
    }
  }

  const { data: members, error } = await query.order("full_name", { ascending: true });

  if (error) {
    console.error("Error fetching members:", error);
    throw new Response("Error fetching members", { status: 500 });
  }

  const processedMembers = members.map(member => ({
    ...member,
    status: member.memberships[0]?.status === 'active'
      ? (new Date(member.memberships[0].end_date) <= thirtyDaysFromNow ? 'expiring' : 'active')
      : 'expired'
  }));

  return json({ members: processedMembers, facility, currentFilter: filter });
};

export default function MembersPage() {
  const { members, facility, currentFilter } = useLoaderData<{ members: Member[], facility: Facility, currentFilter: string | null }>();
  const [cachedMembers, setCachedMembers] = useState<Member[]>(members);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<'name' | 'status'>('name');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const params = useParams();
  const fetcher = useFetcher();
  const [isPending, startTransition] = useTransition();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (members.length > 0) {
      setCachedMembers(members);
    }
    if (currentFilter) {
      setStatusFilter([currentFilter]);
    }
  }, [members, currentFilter]);

  useEffect(() => {
    fetcher.load(`/${params.facilityId}/members?index`);
  }, [params.facilityId]);

  useEffect(() => {
    if (fetcher.data && fetcher.data.members) {
      setCachedMembers(fetcher.data.members);
    }
  }, [fetcher.data]);

  const filteredAndSortedMembers = cachedMembers
    .filter(member => 
      (member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone.includes(searchTerm)) &&
      (statusFilter.length === 0 || statusFilter.includes(member.status))
    )
    .sort((a, b) => {
      if (sortOption === 'name') {
        return a.full_name.localeCompare(b.full_name);
      } else {
        return a.status.localeCompare(b.status);
      }
    });

  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    startTransition(() => {
      setSearchTerm(e.target.value);
    });
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
    setSearchParams({ filter: status });
  };

  const clearFilter = () => {
    setStatusFilter([]);
    setSearchParams({});
  };

  const handleMemberClick = (memberId: number) => {
    navigate(`${memberId}`, { state: { member: cachedMembers.find(m => m.id === memberId) } });
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20 relative">
      <header className="bg-white p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold ml-6">Members - {facility.name}</h1>
        <div className="flex items-center space-x-4">
          <Bell className="h-6 w-6 text-purple-500" />
          <Phone className="h-6 w-6 text-purple-500" />
          <Link to="/settings">
            <Settings className="h-6 w-6 text-purple-500" />
          </Link>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <div className="p-4">
          <div className="relative flex items-center">
            <Input
              type="text"
              placeholder="Search by name or number"
              className="pl-10 pr-20 py-2 w-full bg-white rounded-full"
              value={searchTerm}
              onChange={handleSearch}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <div className="absolute right-3 flex space-x-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-purple-500"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                <Filter className="text-purple-500" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-purple-500"
                  >
                    <ChevronDown className="h-5 w-5 text-purple-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setSortOption('name')}>
                    Sort by Name
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSortOption('status')}>
                    Sort by Status
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        
        {isFilterOpen && (
          <Card className="p-4 bg-white">
            <h3 className="font-semibold mb-2">Filter by Status</h3>
            <div className="space-y-2">
              {['active', 'expired', 'expiring'].map((status) => (
                <div key={status} className="flex items-center">
                  <Checkbox
                    id={status}
                    checked={statusFilter.includes(status)}
                    onCheckedChange={() => handleStatusFilter(status)}
                  />
                  <Label htmlFor={status} className="ml-2">
                    {capitalizeFirstLetter(status)}
                  </Label>
                </div>
              ))}
            </div>
          </Card>
        )}

        {statusFilter.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Filtered by:</span>
            {statusFilter.map(filter => (
              <Badge key={filter} variant="secondary" className="text-xs">
                {capitalizeFirstLetter(filter)}
                <button onClick={() => handleStatusFilter(filter)} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={clearFilter}>Clear all</Button>
          </div>
        )}
        
        <h2 className="text-lg font-semibold mb-4">All members</h2>
        
        <Card className="bg-purple-100 p-4">
          <div className="bg-purple-100 rounded-3xl p-4 space-y-4">
            {isPending ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 pb-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-2 w-2 rounded-full" />
                </div>
              ))
            ) : (
              filteredAndSortedMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => handleMemberClick(member.id)}
                  className="flex items-center gap-3 border-b border-purple-200 last:border-0 pb-4 last:pb-0 cursor-pointer"
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
                    <p className="text-sm text-muted-foreground">{member.email}</p>
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
                </div>
              ))
            )}
          </div>
        </Card>

        <Outlet />
      </main>

      <Link to={`/${params.facilityId}/members/new`} className="fixed right-6 bottom-[7rem]">
        <Button className="w-14 h-14 rounded-full bg-purple-500 hover:bg-purple-600 text-white shadow-lg">
          <UserPlus className="h-6 w-6" />
        </Button>
      </Link>

      <BottomNav />
    </div>
  );
}