import {
  useLoaderData,
  useSearchParams,
  useNavigate,
  useParams,
  Link,
  Outlet,
} from "@remix-run/react";
import { useState, useEffect, useCallback, useMemo } from "react";
import debounce from "lodash.debounce";
import { Phone, Settings, Search, UserPlus, Filter, ChevronDown, X, SortAsc, SortDesc } from 'lucide-react';
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
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { json, type LoaderFunction } from "@remix-run/node";
import { supabase } from "~/utils/supabase.server";

export const loader: LoaderFunction = async ({ params, request }) => {
  const facilityId = params.facilityId;

  if (!facilityId) {
    throw new Error("Facility ID is required");
  }

  try {
    const url = new URL(request.url);
    const filters = {
      status: url.searchParams.getAll("status"),
      plans: url.searchParams.getAll("plans"),
      newMembers: url.searchParams.get("newMembers") === "true",
      expired30Days: url.searchParams.get("expired30Days") === "true",
      expiringIn1Week: url.searchParams.get("expiringIn1Week") === "true",
    };
    const sortBy = url.searchParams.get("sortBy") || "name";
    const sortOrder = url.searchParams.get("sortOrder") || "asc";

    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("name")
      .eq("id", facilityId)
      .single();

    if (facilityError) throw facilityError;

    const { data: members, error: membersError } = await supabase
      .from("members")
      .select(
        `
        id, 
        full_name, 
        email, 
        phone,
        photo_url, 
        balance,
        joined_date,
        memberships(id, start_date, end_date, status, is_disabled, plans(name, duration, price))
      `
      )
      .eq("facility_id", facilityId)
      .order('full_name', { ascending: true });

    if (membersError) throw new Response("Error fetching members", { status: 500 });

    const { data: plans, error: plansError } = await supabase
      .from("plans")
      .select("id, name")
      .eq("facility_id", facilityId);

    if (plansError) throw plansError;

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const processedMembers = members.map((member: any) => {
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
          } else {
            status = "active";
          }
        }
      }

      return {
        ...member,
        status,
        currentPlan
      };
    });

    return json({
      facility,
      members: processedMembers,
      plans,
      currentFilters: filters,
      currentSort: { by: sortBy, order: sortOrder },
    });
  } catch (error) {
    console.error("Error in loader:", error);
    throw new Response("Error loading data", { status: 500 });
  }
};

export default function MembersPage() {
  const params = useParams();
  const data = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

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

  const handleMemberClick = (memberId: number) => {
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
          (statusFilter.length === 0 || statusFilter.includes(member.status)) &&
          (planFilter.length === 0 || planFilter.includes(member.currentPlan))
      );

    if (showJoinedRecently) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      result = result.filter(member => new Date(member.joined_date) >= thirtyDaysAgo);
    }

    if (showMembersWithNoPlan) {
      result = result.filter(member => member.currentPlan === 'No Plan');
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

  if (!facility) {
    return <div className="p-4">Facility not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20 relative">
      <header className="bg-white p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold ml-6">
          Members - {facility?.name || "Loading..."}
        </h1>
        <div className="flex items-center space-x-4">
          <a href="tel:7010976271">
            <Phone className="h-6 w-6 text-purple-500" />
          </a>
          <a href={`/${params.facilityId}/settings`}>
            <Settings className="h-6 w-6 text-purple-500" />
          </a>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <div className="p-4">
          <div className="relative flex items-center">
            <Input
              type="text"
              placeholder="Search by name or number"
              className="pl-10 pr-20 py-2 w-full bg-white rounded-full"
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
                  <DropdownMenuItem onSelect={() => handleSortChange("name")}>
                    Sort by Name{" "}
                    {sortOption.by === "name" &&
                      (sortOption.order === "asc" ? (
                        <SortAsc className="ml-2 h-4 w-4" />
                      ) : (
                        <SortDesc className="ml-2 h-4 w-4" />
                      ))}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleSortChange("joined")}>
                    Sort by Join Date{" "}
                    {sortOption.by === "joined" &&
                      (sortOption.order === "asc" ? (
                        <SortAsc className="ml-2 h-4 w-4" />
                      ) : (
                        <SortDesc className="ml-2 h-4 w-4" />
                      ))}
                  </DropdownMenuItem>
                  <DropdownMenuItem
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
          <Card className="p-4 bg-white">
            <h3 className="font-semibold mb-2">Filters</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-1">Status</h4>
                <div className="space-y-2">
                  {["active", "expired", "expiring"].map((status) => (
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
              </div>
              <div>
                <h4 className="font-medium mb-1">Plans</h4>
                <div className="space-y-2">
                  {plans.map((plan: { id: string; name: string }) => (
                    <div key={plan.id} className="flex items-center">
                      <Checkbox
                        id={`plan-${plan.id}`}
                        checked={planFilter.includes(plan.name)}
                        onCheckedChange={() => handlePlanFilter(plan.name)}
                      />
                      <Label htmlFor={`plan-${plan.id}`} className="ml-2">
                        {plan.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-1">Additional Filters</h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Checkbox
                      id="joined-first"
                      checked={showJoinedFirst}
                      onCheckedChange={(checked) => setShowJoinedFirst(checked === true)}
                    />
                    <Label htmlFor="joined-first" className="ml-2">
                      Joined First
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <Checkbox
                      id="joined-recently"
                      checked={showJoinedRecently}
                      onCheckedChange={(checked) => setShowJoinedRecently(checked === true)}
                    />
                    <Label htmlFor="joined-recently" className="ml-2">
                      Joined Recently (Last 30 days)
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <Checkbox
                      id="no-plan"
                      checked={showMembersWithNoPlan}
                      onCheckedChange={(checked) => setShowMembersWithNoPlan(checked === true)}
                    />
                    <Label htmlFor="no-plan" className="ml-2">
                      Members with No Plan
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {(statusFilter.length > 0 || planFilter.length > 0 || showJoinedFirst || showJoinedRecently || showMembersWithNoPlan) && (
          <div className="flex items-center space-x-2 flex-wrap">
            <span className="text-sm text-gray-500">Filtered by:</span>
            {statusFilter.map((filter) => (
              <Badge key={filter} variant="secondary" className="text-xs">
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
              <Badge key={plan} variant="secondary" className="text-xs">
                {plan}
                <button onClick={() => handlePlanFilter(plan)} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {showJoinedFirst && (
              <Badge variant="secondary" className="text-xs">
                Joined First
                <button onClick={() => setShowJoinedFirst(false)} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {showJoinedRecently && (
              <Badge variant="secondary" className="text-xs">
                Joined Recently
                <button onClick={() => setShowJoinedRecently(false)} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {showMembersWithNoPlan && (
              <Badge variant="secondary" className="text-xs">
                No Plan
                <button onClick={() => setShowMembersWithNoPlan(false)} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear all
            </Button>
          </div>
        )}

        <h2 className="text-lg font-semibold mb-4">All members</h2>

        <Card className="bg-purple-100 p-4">
          <div className="bg-purple-100 rounded-3xl p-4 space-y-4">
            {!filteredMembers?.length ? (
              <div className="text-center py-4">No members found</div>
            ) : (
              filteredMembers.map((member: any) => (
                <div
                  key={member.id}
                  onClick={() => handleMemberClick(member.id)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleMemberClick(member.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="flex items-center gap-3 border-b border-purple-200 last:border-0 pb-4 last:pb-0 cursor-pointer"
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
                    <p className="text-sm text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-medium">
                      Balance: ₹{member.balance}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Joined: {new Date(member.joined_date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Plan: {member.currentPlan}
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
                    {capitalizeFirstLetter(member.status)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Outlet />
      </main>

      <Link to="new" className="fixed right-6 bottom-[7rem]">
        <Button className="w-14 h-14 rounded-full bg-purple-500 hover:bg-purple-600 text-white shadow-lg">
          <UserPlus className="h-6 w-6" />
        </Button>
      </Link>
    </div>
  );
}

