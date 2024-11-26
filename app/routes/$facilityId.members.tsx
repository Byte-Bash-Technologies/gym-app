import { useState, useEffect, useCallback } from 'react';
import { useLoaderData, useSearchParams, useNavigate, Link, Outlet, useNavigation } from "@remix-run/react";
import debounce from 'lodash.debounce';
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
  DropdownMenuCheckboxItem,
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
      status: url.searchParams.getAll('status'),
      plans: url.searchParams.getAll('plans'),
      newMembers: url.searchParams.get('newMembers') === 'true',
      expired30Days: url.searchParams.get('expired30Days') === 'true',
      expiringIn1Week: url.searchParams.get('expiringIn1Week') === 'true',
    };
    const sortBy = url.searchParams.get('sortBy') || 'name';
    const sortOrder = url.searchParams.get('sortOrder') || 'asc';

    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .select('name')
      .eq('id', facilityId)
      .single();

    if (facilityError) throw facilityError;

    const { data: members, error: membersError } = await supabase
      .from("members")
      .select(`
        id, 
        full_name, 
        email, 
        phone, 
        balance,
        joined_date,
        memberships(status, end_date, plans(name))
      `)
      .eq("facility_id", facilityId);

    if (membersError) throw membersError;

    const { data: plans, error: plansError } = await supabase
      .from('plans')
      .select('id, name')
      .eq('facility_id', facilityId);

    if (plansError) throw plansError;

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const processedMembers = members.map((member: any) => ({
      ...member,
      status: member.memberships[0]?.status === 'active'
        ? (new Date(member.memberships[0].end_date) <= sevenDaysFromNow ? 'expiring' : 'active')
        : 'expired'
    }));

    return json({
      facility,
      members: processedMembers,
      plans,
      currentFilters: filters,
      currentSort: { by: sortBy, order: sortOrder }
    });
  } catch (error) {
    console.error('Error in loader:', error);
    throw new Response("Error loading data", { status: 500 });
  }
};

export default function MembersPage() {
  const navigation = useNavigation();
  const data = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Show loading state when navigating
  if (navigation.state === "loading") {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <header className="bg-white p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold ml-6">Members</h1>
        </header>
        <main className="flex-1 p-4 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <p className="text-gray-500">Loading members...</p>
          </div>
        </main>
      </div>
    );
  }

  // Handle error state
  if (!data || !data.facility) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <header className="bg-white p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold ml-6">Members</h1>
        </header>
        <main className="flex-1 p-4 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500">Error loading members data.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try again
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const { facility, members = [], plans = [], currentFilters, currentSort } = data;

  // Handle case where facility is null
  if (!facility) {
    return <div className="p-4">Facility not found</div>;
  }

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>(currentFilters.status);
  const [planFilter, setPlanFilter] = useState<string[]>(currentFilters.plans);
  const [sortOption, setSortOption] = useState<{ by: string; order: 'asc' | 'desc' }>(currentSort);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filteredMembers, setFilteredMembers] = useState(members);
  const navigate = useNavigate();

  const debouncedSearch = useCallback(
    debounce((term: string) => {
      searchParams.set('search', term);
      setSearchParams(searchParams);
    }, 300),
    [searchParams, setSearchParams]
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    debouncedSearch(term);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
    updateSearchParams('status', status);
  };

  const handlePlanFilter = (plan: string) => {
    setPlanFilter(prev => 
      prev.includes(plan) 
        ? prev.filter(p => p !== plan)
        : [...prev, plan]
    );
    updateSearchParams('plans', plan);
  };

  const handleSortChange = (by: string) => {
    setSortOption(prev => ({
      by,
      order: prev.by === by && prev.order === 'asc' ? 'desc' : 'asc'
    }));
    updateSearchParams('sortBy', by);
    updateSearchParams('sortOrder', sortOption.order);
  };

  const updateSearchParams = (key: string, value: string | boolean) => {
    const current = searchParams.getAll(key);
    if (current.includes(value.toString())) {
      searchParams.delete(key, value.toString());
    } else {
      searchParams.append(key, value.toString());
    }
    setSearchParams(searchParams);
  };

  const clearFilters = () => {
    setStatusFilter([]);
    setPlanFilter([]);
    searchParams.delete('status');
    searchParams.delete('plans');
    searchParams.delete('newMembers');
    searchParams.delete('expired30Days');
    searchParams.delete('expiringIn1Week');
    setSearchParams(searchParams);
  };

  const handleMemberClick = (memberId: number) => {
    navigate(`${memberId}`, { state: { member: members.find(m => m.id === memberId) } });
  };

  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  useEffect(() => {
    const filtered = members.filter(member => 
      (member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone.includes(searchTerm)) &&
      (statusFilter.length === 0 || statusFilter.includes(member.status)) &&
      (planFilter.length === 0 || member.memberships.some(m => planFilter.includes(m.plans.name)))
    ).sort((a, b) => {
      if (sortOption.by === 'name') {
        return sortOption.order === 'asc' 
          ? a.full_name.localeCompare(b.full_name)
          : b.full_name.localeCompare(a.full_name);
      } else if (sortOption.by === 'joined') {
        return sortOption.order === 'asc'
          ? new Date(a.joined_date).getTime() - new Date(b.joined_date).getTime()
          : new Date(b.joined_date).getTime() - new Date(a.joined_date).getTime();
      } else if (sortOption.by === 'balance') {
        return sortOption.order === 'asc' ? a.balance - b.balance : b.balance - a.balance;
      }
      return 0;
    });
    setFilteredMembers(filtered);
  }, [members, searchTerm, statusFilter, planFilter, sortOption]);

  return (
    <div className="min-h-screen bg-gray-100 pb-20 relative">
      <header className="bg-white p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold ml-6">
          Members - {facility?.name || 'Loading...'}
        </h1>
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
                  <DropdownMenuItem onSelect={() => handleSortChange('name')}>
                    Sort by Name {sortOption.by === 'name' && (sortOption.order === 'asc' ? <SortAsc className="ml-2 h-4 w-4" /> : <SortDesc className="ml-2 h-4 w-4" />)}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleSortChange('joined')}>
                    Sort by Join Date {sortOption.by === 'joined' && (sortOption.order === 'asc' ? <SortAsc className="ml-2 h-4 w-4" /> : <SortDesc className="ml-2 h-4 w-4" />)}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleSortChange('balance')}>
                    Sort by Balance {sortOption.by === 'balance' && (sortOption.order === 'asc' ? <SortAsc className="ml-2 h-4 w-4" /> : <SortDesc className="ml-2 h-4 w-4" />)}
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
              </div>
              <div>
                <h4 className="font-medium mb-1">Plans</h4>
                <div className="space-y-2">
                  {plans.map((plan) => (
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
                <h4 className="font-medium mb-1">Special Filters</h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Checkbox
                      id="newMembers"
                      checked={currentFilters.newMembers}
                      onCheckedChange={() => updateSearchParams('newMembers', !currentFilters.newMembers)}
                    />
                    <Label htmlFor="newMembers" className="ml-2">
                      New Members (Last 30 days)
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <Checkbox
                      id="expired30Days"
                      checked={currentFilters.expired30Days}
                      onCheckedChange={() => updateSearchParams('expired30Days', !currentFilters.expired30Days)}
                    />
                    <Label htmlFor="expired30Days" className="ml-2">
                      Expired in Last 30 Days
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <Checkbox
                      id="expiringIn1Week"
                      checked={currentFilters.expiringIn1Week}
                      onCheckedChange={() => updateSearchParams('expiringIn1Week', !currentFilters.expiringIn1Week)}
                    />
                    <Label htmlFor="expiringIn1Week" className="ml-2">
                      Expiring in 1 Week
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {(statusFilter.length > 0 || planFilter.length > 0 || Object.values(currentFilters).some(Boolean)) && (
          <div className="flex items-center space-x-2 flex-wrap">
            <span className="text-sm text-gray-500">Filtered by:</span>
            {statusFilter.map(filter => (
              <Badge key={filter} variant="secondary" className="text-xs">
                {capitalizeFirstLetter(filter)}
                <button onClick={() => handleStatusFilter(filter)} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {planFilter.map(plan => (
              <Badge key={plan} variant="secondary" className="text-xs">
                {plan}
                <button onClick={() => handlePlanFilter(plan)} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {currentFilters.newMembers && (
              <Badge variant="secondary" className="text-xs">
                New Members
                <button onClick={() => updateSearchParams('newMembers', false)} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {currentFilters.expired30Days && (
              <Badge variant="secondary" className="text-xs">
                Expired 30 Days
                <button onClick={() => updateSearchParams('expired30Days', false)} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {currentFilters.expiringIn1Week && (
              <Badge variant="secondary" className="text-xs">
                Expiring in 1 Week
                <button onClick={() => updateSearchParams('expiringIn1Week', false)} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear all</Button>
          </div>
        )}
        
        <h2 className="text-lg font-semibold mb-4">All members</h2>
        
        <Card className="bg-purple-100 p-4">
          <div className="bg-purple-100 rounded-3xl p-4 space-y-4">
            {!filteredMembers?.length ? (
              <div className="text-center py-4">No members found</div>
            ) : (
              filteredMembers.map((member) => (
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
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-medium">Balance: ₹{member.balance}</p>
                    <p className="text-xs text-muted-foreground">Joined: {new Date(member.joined_date).toLocaleDateString()}</p>
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

      <Link to="new" className="fixed right-6 bottom-[7rem]">
        <Button className="w-14 h-14 rounded-full bg-purple-500 hover:bg-purple-600 text-white shadow-lg">
          <UserPlus className="h-6 w-6" />
        </Button>
      </Link>
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold ml-6">Members</h1>
      </header>
      <main className="flex-1 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">Something went wrong while loading the members.</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Try again
          </Button>
        </div>
      </main>
    </div>
  );
}

