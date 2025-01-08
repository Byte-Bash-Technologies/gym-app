import { useState, useEffect, useCallback, useMemo } from "react";
import {
  useLoaderData,
  useSearchParams,
  useNavigate,
  useParams,
  Link,
  Outlet,
  useFetcher
} from "@remix-run/react";
import debounce from "lodash.debounce";
import { Bell, Phone, Settings, Search, UserPlus, Filter, ChevronDown, X, SortAsc, SortDesc } from 'lucide-react';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Card } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Badge } from "~/components/ui/badge";
import { json, type LoaderFunction } from "@remix-run/node";
import { supabase } from "~/utils/supabase.server";

interface Member {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  photo_url: string;
  balance: number;
  joined_date: string;
  memberships: Array<{
    status: string;
    end_date: string;
    plan_name: string;
  }>;
  status?: string;
}

interface Plan {
  id: string;
  name: string;
}

interface LoaderData {
  facility: { name: string };
  members: Member[];
  plans: Plan[];
  currentFilters: {
    status: string[];
    plans: string[];
    newMembers: boolean;
    expired30Days: boolean;
    expiringIn1Week: boolean;
  };
  currentSort: {
    by: string;
    order: string;
  };
}

// Cache control helper
function createCacheHeaders(maxAge: number = 60) {
  return {
    "Cache-Control": `private, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
    "Vary": "Cookie",
  };
}

// Data serializer to minimize payload
function serializeMemberData(member: any): Member {
  return {
    id: member.id,
    full_name: member.full_name,
    email: member.email || '',
    phone: member.phone || '',
    photo_url: member.photo_url || '',
    balance: member.balance || 0,
    joined_date: member.joined_date,
    memberships: member.memberships?.map((m: any) => ({
      status: m.status,
      end_date: m.end_date,
      plan_name: m.plans?.name || ''
    })) || []
  };
}

// Error handling helper
function handleError(error: any, status: number = 500) {
  console.error("Error:", error);
  throw new Response(error.message || "An error occurred", { status });
}

export const loader: LoaderFunction = async ({ params, request }) => {
  const facilityId = params.facilityId;
  if (!facilityId) throw new Response("Facility ID is required", { status: 400 });

  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const isPrefetch = request.headers.get("Purpose") === "prefetch";

    // Select fields based on request type
    const select = isPrefetch 
      ? 'id, full_name, photo_url'
      : `
        id, 
        full_name, 
        email, 
        phone,
        photo_url, 
        balance,
        joined_date,
        memberships(status, end_date, plans(name))
      `;

    // Parallel data fetching with error handling
    const [facilityResponse, membersResponse, plansResponse] = await Promise.all([
      supabase
        .from("facilities")
        .select("name")
        .eq("id", facilityId)
        .single()
        .then(res => {
          if (res.error) throw new Error("Failed to fetch facility");
          return res;
        }),

      supabase
        .from("members")
        .select(select)
        .eq("facility_id", facilityId)
        .then(res => {
          if (res.error) throw new Error("Failed to fetch members");
          return res;
        }),

      !isPrefetch ? 
        supabase
          .from("plans")
          .select("id, name")
          .eq("facility_id", facilityId)
          .then(res => {
            if (res.error) throw new Error("Failed to fetch plans");
            return res;
          }) :
        Promise.resolve({ data: [] })
    ]);

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Process members data efficiently
    const processedMembers = membersResponse.data.map((member: any) => {
      const serializedMember = serializeMemberData(member);
      if (!isPrefetch && member.memberships) {
        serializedMember.status = member.memberships.length > 0
          ? member.memberships[0].status === "active"
            ? new Date(member.memberships[0].end_date) <= sevenDaysFromNow
              ? "expiring"
              : "active"
            : "expired"
          : "expired";
      }
      return serializedMember;
    });

    const cacheDuration = isPrefetch ? 60 : 300;

    return json(
      {
        facility: facilityResponse.data,
        members: processedMembers,
        plans: plansResponse.data,
        currentFilters: {
          status: searchParams.getAll("status"),
          plans: searchParams.getAll("plans"),
          newMembers: searchParams.get("newMembers") === "true",
          expired30Days: searchParams.get("expired30Days") === "true",
          expiringIn1Week: searchParams.get("expiringIn1Week") === "true",
        },
        currentSort: { 
          by: searchParams.get("sortBy") || "name",
          order: searchParams.get("sortOrder") || "asc"
        },
      },
      {
        headers: createCacheHeaders(cacheDuration),
      }
    );
  } catch (error) {
    handleError(error);
  }
};

export function headers() {
  return {
    ...createCacheHeaders(300),
    "Vary": "Cookie, Purpose"
  };
}

function PlanFilterQueue({ plans, selectedPlans, onPlanSelect }: {
  plans: Plan[];
  selectedPlans: string[];
  onPlanSelect: (plan: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 px-1 snap-x">
      {plans.map((plan) => {
        const isSelected = selectedPlans.includes(plan.name);
        return (
          <button
            key={plan.id}
            onClick={() => onPlanSelect(plan.name)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap
              transition-all duration-200 snap-start
              ${isSelected 
                ? 'bg-[#886fa6] text-white shadow-lg scale-105' 
                : 'bg-white dark:bg-[#212237] hover:bg-[#f0ebff] dark:hover:bg-[#212237]/70'}
            `}
          >
            <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-[#886fa6]'}`} />
            <span className="text-sm font-medium">{plan.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function StatusFilterQueue({ selectedStatuses, onStatusSelect }: {
  selectedStatuses: string[];
  onStatusSelect: (status: string) => void;
}) {
  const statuses = [
    { id: 'active', color: 'bg-green-500' },
    { id: 'expired', color: 'bg-red-500' },
    { id: 'expiring', color: 'bg-yellow-500' }
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 px-1 snap-x">
      {statuses.map((status) => {
        const isSelected = selectedStatuses.includes(status.id);
        return (
          <button
            key={status.id}
            onClick={() => onStatusSelect(status.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap
              transition-all duration-200 snap-start
              ${isSelected 
                ? 'bg-[#886fa6] text-white shadow-lg scale-105' 
                : 'bg-white dark:bg-[#212237] hover:bg-[#f0ebff] dark:hover:bg-[#212237]/70'}
            `}
          >
            <div className={`w-2 h-2 rounded-full ${status.color}`} />
            <span className="text-sm font-medium capitalize">{status.id}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function MembersPage() {
  const params = useParams();
  const data = useLoaderData<LoaderData>();
  const [searchParams, setSearchParams] = useSearchParams();
  const fetcher = useFetcher();

  const {
    facility,
    members = [],
    plans = [],
    currentFilters,
    currentSort,
  } = data;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>(
    currentFilters.status
  );
  const [planFilter, setPlanFilter] = useState<string[]>(currentFilters.plans);
  const [sortOption, setSortOption] = useState<{
    by: string;
    order: "asc" | "desc";
  }>(currentSort);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showJoinedFirst, setShowJoinedFirst] = useState(false);
  const [showJoinedRecently, setShowJoinedRecently] = useState(false);
  const [showMembersWithNoPlan, setShowMembersWithNoPlan] = useState(false);
  const navigate = useNavigate();

  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setSearchTerm(term);
    }, 300),
    []
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const handlePlanFilter = (plan: string) => {
    setPlanFilter((prev) =>
      prev.includes(plan) ? prev.filter((p) => p !== plan) : [...prev, plan]
    );
  };

  const handleSortChange = (by: string) => {
    setSortOption((prev) => ({
      by,
      order: prev.by === by && prev.order === "asc" ? "desc" : "asc",
    }));
  };

  const clearFilters = () => {
    setStatusFilter([]);
    setPlanFilter([]);
    setShowJoinedFirst(false);
    setShowJoinedRecently(false);
    setShowMembersWithNoPlan(false);
    setSearchParams(new URLSearchParams());
  };

  const handleMemberClick = (memberId: string) => {
    navigate(`${memberId}`, {
      state: { member: members.find((m) => m.id === memberId) },
    });
  };

  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const filteredMembers = useMemo(() => {
    let result = members
      .filter(
        (member) =>
          (member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.phone.includes(searchTerm)) &&
          (statusFilter.length === 0 || statusFilter.includes(member.status || '')) &&
          (planFilter.length === 0 ||
            member.memberships.some((m) => planFilter.includes(m.plan_name)))
      );

    if (showJoinedRecently) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      result = result.filter(member => new Date(member.joined_date) >= thirtyDaysAgo);
    }

    if (showMembersWithNoPlan) {
      result = result.filter(member => member.memberships.length === 0);
    }

    if (showJoinedFirst) {
      result.sort((a, b) => new Date(b.joined_date).getTime() - new Date(a.joined_date).getTime());
    } else {
      result.sort((a, b) => {
        if (sortOption.by === "name") {
          return sortOption.order === "asc"
            ? a.full_name.localeCompare(b.full_name)
            : b.full_name.localeCompare(a.full_name);
        } else if (sortOption.by === "joined") {
          return sortOption.order === "asc"
            ? new Date(a.joined_date).getTime() -
                new Date(b.joined_date).getTime()
            : new Date(b.joined_date).getTime() -
                new Date(a.joined_date).getTime();
        } else if (sortOption.by === "balance") {
          return sortOption.order === "asc"
            ? a.balance - b.balance
            : b.balance - a.balance;
        }
        return 0;
      });
    }

    return result;
  }, [members, searchTerm, statusFilter, planFilter, sortOption, showJoinedFirst, showJoinedRecently, showMembersWithNoPlan]);

  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    if (searchTerm) newParams.set("search", searchTerm);
    if (statusFilter.length) newParams.set("status", statusFilter.join(","));
    if (planFilter.length) newParams.set("plans", planFilter.join(","));
    newParams.set("sortBy", sortOption.by);
    newParams.set("sortOrder", sortOption.order);
    newParams.set("joinedFirst", showJoinedFirst.toString());
    newParams.set("joinedRecently", showJoinedRecently.toString());
    newParams.set("membersWithNoPlan", showMembersWithNoPlan.toString());
    setSearchParams(newParams, { replace: true });
  }, [searchTerm, statusFilter, planFilter, sortOption, showJoinedFirst, showJoinedRecently, showMembersWithNoPlan, setSearchParams]);

  // Prefetch member data on hover
  const prefetchMember = useCallback((memberId: string) => {
    fetcher.load(`/${params.facilityId}/members/${memberId}`);
  }, [fetcher, params.facilityId]);

  if (!facility) {
    return <div className="p-4">Facility not found</div>;
  }

  return (
    <div className="min-h-screen pb-20 relative bg-[#f0ebff] dark:bg-[#212237]">
      <header className="bg-background dark:bg-[#4A4A62] p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold ml-4">
          Members - {facility?.name || "Loading..."}
        </h1>
        <div className="flex items-center space-x-4">
          <a href={`tel:${facility.phone}`}>
            <Phone className="h-6 w-6 text-[#886fa6]" />
          </a>
          <Link to={`/${params.facilityId}/settings`}>
            <Settings className="h-6 w-6 text-[#886fa6]" />
          </Link>
        </div>
      </header>

      <main className="p-4 space-y-4 dark:bg-[#212237]">
        <div className="">
          <div className="relative flex items-center">
            <Input
              type="text"
              placeholder="Search by name or number"
              className="pl-10 pr-20 py-2 w-full bg-white dark:bg-[#4A4A62] rounded-full"
              onChange={handleSearch}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <div className="absolute right-3 flex space-x-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-[#886fa6] dark:hover:bg-[#3A3A52]/90"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                <Filter className="text-[#886fa6]" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-[#886fa6] dark:hover:bg-[#3A3A52]/90"
                  >
                    <ChevronDown className="h-5 w-5 text-[#886fa6]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="dark:bg-[#4A4A62]" align="end">
                  <DropdownMenuItem 
                    className="dark:hover:bg-[#3A3A52]/90" 
                    onSelect={() => handleSortChange("name")}
                  >
                    Sort by Name{" "}
                    {sortOption.by === "name" &&
                      (sortOption.order === "asc" ? (
                        <SortAsc className="ml-2 h-4 w-4" />
                      ) : (
                        <SortDesc className="ml-2 h-4 w-4" />
                      ))}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="dark:hover:bg-[#3A3A52]/90" 
                    onSelect={() => handleSortChange("joined")}
                  >
                    Sort by Join Date{" "}
                    {sortOption.by === "joined" &&
                      (sortOption.order === "asc" ? (
                        <SortAsc className="ml-2 h-4 w-4" />
                      ) : (
                        <SortDesc className="ml-2 h-4 w-4" />
                      ))}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="dark:hover:bg-[#3A3A52]/90"
                    onSelect={() => handleSortChange("balance")}
                  >
                    Sort by Balance{" "}
                    {sortOption.by === "balance" &&
                      (sortOption.order === "asc" ? (
                        <SortAsc className="ml-2 h-4 w-4" />
                      ) : (
                        <SortDesc className="ml-2 h-4 w-4" />
                      ))}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {isFilterOpen && (
          <Card className="p-4 bg-background dark:text-white">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Status</h4>
                <StatusFilterQueue
                  selectedStatuses={statusFilter}
                  onStatusSelect={handleStatusFilter}
                />
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Plans</h4>
                <PlanFilterQueue
                  plans={plans}
                  selectedPlans={planFilter}
                  onPlanSelect={handlePlanFilter}
                />
              </div>

              <div>
                <h4 className="font-medium mb-2">Additional Filters</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={showJoinedFirst ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowJoinedFirst(!showJoinedFirst)}
                    className={`dark:bg-[#212237] dark:hover:bg-[#212237]/90 border-none rounded-2xl ${
                      showJoinedFirst ? "bg-[#886fa6] hover:bg-[#886fa6]/90 text-white" : ""
                    }`}
                  >
                    Joined First
                  </Button>
                  <Button
                    variant={showJoinedRecently ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowJoinedRecently(!showJoinedRecently)}
                    className={`dark:bg-[#212237] dark:hover:bg-[#212237]/90 border-none rounded-2xl ${
                      showJoinedRecently ? "bg-[#886fa6] hover:bg-[#886fa6]/90 text-white" : ""
                    }`}
                  >
                    Recent Members
                  </Button>
                  <Button
                    variant={showMembersWithNoPlan ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowMembersWithNoPlan(!showMembersWithNoPlan)}
                    className={`dark:bg-[#212237] dark:hover:bg-[#212237]/90 border-none rounded-2xl ${
                      showMembersWithNoPlan ? "bg-[#886fa6] hover:bg-[#886fa6]/90 text-white" : ""
                    }`}
                  >
                    No Plan
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {(statusFilter.length > 0 || planFilter.length > 0 || showJoinedFirst || showJoinedRecently || showMembersWithNoPlan) && (
          <div className="flex items-center space-x-2 flex-wrap">
            <span className="text-sm text-gray-500">Filtered by:</span>
            {statusFilter.map((filter) => (
              <Badge 
                key={filter} 
                variant="secondary" 
                className="text-xs bg-[#f0ebff] dark:bg-[#212237] text-[#886fa6]"
              >
                {capitalizeFirstLetter(filter)}
                <button
                  onClick={() => handleStatusFilter(filter)}
                  className="ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {planFilter.map((plan) => (
              <Badge 
                key={plan} 
                variant="secondary" 
                className="text-xs bg-[#f0ebff] dark:bg-[#212237] text-[#886fa6]"
              >
                {plan}
                <button 
                  onClick={() => handlePlanFilter(plan)} 
                  className="ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {showJoinedFirst && (
              <Badge 
                variant="secondary" 
                className="text-xs bg-[#f0ebff] dark:bg-[#212237] text-[#886fa6]"
              >
                Joined First
                <button 
                  onClick={() => setShowJoinedFirst(false)} 
                  className="ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {showJoinedRecently && (
              <Badge 
                variant="secondary" 
                className="text-xs bg-[#f0ebff] dark:bg-[#212237] text-[#886fa6]"
              >
                Joined Recently
                <button 
                  onClick={() => setShowJoinedRecently(false)} 
                  className="ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {showMembersWithNoPlan && (
              <Badge 
                variant="secondary" 
                className="text-xs bg-[#f0ebff] dark:bg-[#212237] text-[#886fa6]"
              >
                No Plan
                <button 
                  onClick={() => setShowMembersWithNoPlan(false)} 
                  className="ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
            >
              Clear all
            </Button>
          </div>
        )}

        <h2 className="text-lg font-semibold mb-4">All members</h2>

        <Card className="p-4">
          <div className="rounded-3xl p-2 space-y-4">
            {!filteredMembers?.length ? (
              <div className="text-center py-4">No members found</div>
            ) : (
              filteredMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => handleMemberClick(member.id)}
                  
                  className="flex items-center gap-3 border-b border-[#886fa6]/20 last:border-0 pb-4 last:pb-0 cursor-pointer hover:bg-violet-50 dark:hover:bg-[#212237]/50 rounded-lg p-2 transition-colors"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={member.photo_url}
                      alt={member.full_name}
                    />
                    <AvatarFallback>{member.full_name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold">{member.full_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {member.phone}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {member.email}
                    </p>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-medium">
                      Balance: ₹{member.balance}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Joined:{" "}
                      {new Date(member.joined_date).toLocaleDateString()}
                    </p>
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
                  <span className="hidden md:inline">
                    {member.status ? capitalizeFirstLetter(member.status) : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Outlet />
      </main>

      <Link to="new" className="fixed right-6 bottom-[7rem]">
        <Button className="w-14 h-14 rounded-full bg-[#886fa6] hover:bg-[#886fa6]/90 dark:bg-[#212237] dark:hover:bg-[#212237]/90 text-white shadow-lg">
          <UserPlus className="h-6 w-6" />
        </Button>
      </Link>
    </div>
  );
}

