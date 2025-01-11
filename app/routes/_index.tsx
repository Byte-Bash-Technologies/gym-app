import { ActionFunction, json, type LoaderFunction, redirect } from "@remix-run/node";
import { useLoaderData, Link, useNavigate, Form } from "@remix-run/react";
import { Dumbbell, VibrateIcon as Volleyball, Users, Calendar, ChevronRight, CodeIcon as ChartColumnIncreasing, Settings, Plus, UserCog, LogOut, Moon, Sun, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { createServerClient, parse, serialize } from '@supabase/ssr';
import { supabase } from "~/utils/supabase.server";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { useTheme } from "~/components/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ThemeToggle } from "~/components/theme-toggle";
import SportsDotLogo from "~/assets/sportsdot-favicon-16-01.svg";
import { Separator } from "~/components/ui/separator";

interface FacilitySubscription {
  end_date: string;
  status: 'active' | 'expired';
}

interface Facility {
  id: string;
  name: string;
  address: string;
  type: 'gym' | 'badminton';
  members: number;
  revenue?: number;
  user_id: string;
  facility_subscriptions: FacilitySubscription[];
  is_owner: boolean;
}

interface LoaderData {
  facilities: Facility[];
  userName: string;
  email: string;
}

export const loader: LoaderFunction = async ({ request }) => {
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

  // Fetch both owned and assigned facilities
  const userId = user.id;
  const { data: trainerFacilities, error: trainerError } = await supabase
    .from('facility_trainers')
    .select('facility_id')
    .eq('user_id', userId);
  
  if (trainerError) {
    console.error('Error fetching trainer facilities:', trainerError);
    throw new Error('Failed to fetch trainer facilities');
  }

  const facilityIds = trainerFacilities ? trainerFacilities.map(trainer => trainer.facility_id) : [];

  const { data: facilities, error } = await supabase
    .from('facilities')
    .select(`
      *,
      facility_subscriptions (
        end_date,
        status
      )
    `)
    .or(`user_id.eq.${userId},id.in.(${facilityIds.join(',')})`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching facilities:', error);
    throw new Error('Failed to fetch facilities');
  }

  const { data: userName, error: userError } = await supabase
    .from('users')
    .select('full_name,email')
    .eq('id', user.id)
    .single();

  if (userError) {
    console.error('Error fetching user:', userError);
    throw new Error('Failed to fetch user data');
  }

  const facilitiesWithRevenue = await Promise.all(facilities.map(async (facility) => {
    const { data: transactions, error: transactionError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('facility_id', facility.id);
      
    if (transactionError) {
      console.error('Error fetching transactions:', transactionError);
      return {
        ...facility,
        revenue: 0,
        is_owner: facility.user_id === user.id
      };
    }
    
    const revenue = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    
    return {
      ...facility,
      revenue,
      is_owner: facility.user_id === user.id
    };
  }));

  return json({ 
    facilities: facilitiesWithRevenue, 
    userName: userName?.full_name || '',
    email: userName?.email || ''
  });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const action = formData.get("action");
  const response = new Response();

  const supabaseClient = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => parse(request.headers.get("Cookie") || "")[key],
        set: (key, value, options) => {
          response.headers.append("Set-Cookie", serialize(key, value, options));
        },
        remove: (key, options) => {
          response.headers.append("Set-Cookie", serialize(key, "", options));
        },
      },
    }
  );

  if (action === "logout") {
    await supabaseClient.auth.signOut();
    return redirect("/login");
  }

  return null;
};

function FacilityCard({ facility }: { facility: Facility }) {
  const navigate = useNavigate();
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const activeSubscription = facility.facility_subscriptions?.find(sub => sub.status === 'active');
  
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow dark:bg-[#4A4A62] dark:border dark:border-[#4A4A62]"
      onClick={() => navigate(`${facility.id}/home`, { state: { prefetch: 'render' } })}
    >
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <CardTitle className="text-lg">{facility.name}</CardTitle>
            <Badge variant={facility.is_owner ? "default" : "secondary"} className="text-xs bg-[#886fa6] hover:bg-[#886fa6]/90 dark:bg-[#3A3A52] text-white">
              {facility.is_owner ? (
                <>
                  <UserCog className="h-3 w-3 mr-1" />
                  Owner
                </>
              ) : (
                <>
                  <Users className="h-3 w-3 mr-1" />
                  Trainer
                </>
              )}
            </Badge>
          </div>
          <Badge
            variant={facility.type === "gym" ? "secondary" : "secondary"}
            className="text-xs dark:bg-[#3A3A52]"
          >
            {facility.type === "gym" ? (
              <Dumbbell className="h-4 w-4 mr-1" />
            ) : (
              <Volleyball className="h-4 w-4 mr-1" />
            )}
            {facility.type === "gym" ? "Gym" : "Badminton"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <Users className="h-4 w-4 mr-2 text-primary" />
            <span>{facility.members} members</span>
          </div>
          {facility.is_owner && (
            <div className="flex items-center text-sm">
              <ChartColumnIncreasing className="h-4 w-4 mr-2 text-primary" />
              <span>₹{(facility.revenue || 0).toLocaleString()} revenue</span>
            </div>
          )}
          <div className="flex items-center text-sm">
            <Calendar className="h-4 w-4 mr-2 text-primary" />
            <span>
              {activeSubscription 
                ? formatDate(activeSubscription.end_date)
                : 'No active plan'}
            </span>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { facilities, userName, email } = useLoaderData<LoaderData>();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [message, setMessage] = useState("Hi, I would like to add a new facility to the platform.");
  const { setTheme } = useTheme();

  const gyms = facilities.filter((f) => f.type === "gym");
  const badmintonFacilities = facilities.filter((f) => f.type === "badminton");

  const handleSendMessage = () => {
    const whatsappUrl = `https://wa.me/917010976271?text=${encodeURIComponent(message)}`;
    window.location.href = whatsappUrl;
    setIsDialogOpen(false);
  };

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen bg-[#f0ebff] dark:bg-[#212237] text-foreground">
        <Sidebar>
          <SidebarHeader className="bg-[#f0ebff] dark:bg-[#212237]">
            <div className="flex items-center gap-3 p-6 rounded-xl bg-[#f8ebff] dark:bg-[#282237]">
              <Avatar className="h-12 w-12">
                <AvatarImage src={SportsDotLogo} alt="SportsDot Logo" />
                <AvatarFallback>S</AvatarFallback>
              </Avatar>
              <Link to="https://sportsdot.in" className="flex items-center gap-1">
                <div className="flex flex-col">
                  <span className="font-semibold text-lg">SportsDot Base</span>
                  <span className="text-xs text-muted-foreground">Management Dashboard</span>
                </div>
              </Link>
            </div>
            <Separator className="mb-4" />
          </SidebarHeader>
          <SidebarContent className="px-4 py-2 bg-[#f0ebff] dark:bg-[#212237]">
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 px-4 text-sm font-semibold tracking-tight">Settings</h3>
                <div className="space-y-1">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <h3 className="font-semibold">Theme</h3>
                      <p className="text-muted-foreground text-sm">Toggle light & dark mode</p>
                    </div>
                    <ThemeToggle />
                  </div>
                </div>
              </div>
              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="mb-2 px-4 text-sm font-semibold tracking-tight">Support</h3>
                <div className="space-y-1">
                  <Button
                    onClick={() => navigate("/help-center")}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start hover:text-white bg-[#886fa6] hover:bg-[#886fa6]/90 text-white dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]/90"
                  >
                    <BookOpen className="h-6 w-6 mr-2" />
                    <h3 className="text-sm font-semibold">Help Center</h3>
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="mb-2 px-4 text-sm font-semibold tracking-tight">Account</h3>
                <div className="space-y-1">
                  <Form method="post">
                    <input type="hidden" name="action" value="logout" />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start hover:text-white bg-[#886fa6] hover:bg-[#886fa6]/90 text-white dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]/90"
                    >
                      <LogOut className="h-6 w-6 mr-2" />
                      <h3 className="text-sm font-semibold">Logout</h3>
                    </Button>
                  </Form>
                </div>
              </div>
            </div>
          </SidebarContent>
          <SidebarFooter className="bg-[#f0ebff] dark:bg-[#212237]">
            <Separator className="mb-4" />
            <div className="flex items-center gap-3 px-6 py-4 bg-[#f8ebff] dark:bg-[#282237] rounded-xl">
              <Avatar className="h-10 w-10">
                <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${userName}`} alt={userName} />
                <AvatarFallback>{userName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-semibold">{userName}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[150px]">{email}</span>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1">
          <header className="text-card-foreground p-4 sticky top-0 z-1 shadow-sm bg-[#f0ebff] dark:bg-[#212237]">
            <div className="container mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <h1 className="text-xl font-bold">Facility Dashboard</h1>
              </div>
            </div>
          </header>

          <main className="container mx-auto p-4 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">Welcome, {userName}</h2>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto bg-[#886fa6] hover:bg-[#886fa6]/90 text-white dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Facility
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#f0ebff] dark:bg-[#212237]">
                  <DialogHeader>
                    <DialogTitle>Add New Facility</DialogTitle>
                    <DialogDescription>
                      Contact our admin team to add a new facility to your account. We&apos;ll get back to you within 24 hours.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message here..."
                      className="min-h-[100px] dark:bg-[#4A4A62] dark:text-white"
                    />
                  </div>
                  <DialogFooter className="p-4 gap-2 dark:bg-[#212237]">
                    <Button variant="destructive" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      className="bg-[#886fa6] hover:bg-[#886fa6]/90 text-white dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]/90" 
                      onClick={handleSendMessage}
                    >
                      Send Message
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Gyms Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                Gyms
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gyms.map((facility) => (
                  <FacilityCard key={facility.id} facility={facility} />
                ))}
              </div>
            </div>

            {/* Badminton Section */}
            {badmintonFacilities.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Volleyball className="h-5 w-5" />
                  Badminton Courts
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {badmintonFacilities.map((facility) => (
                    <FacilityCard key={facility.id} facility={facility} />
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

