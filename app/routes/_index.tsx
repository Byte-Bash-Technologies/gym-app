import { json, type LoaderFunction, redirect } from "@remix-run/node";
import { useLoaderData, Link, useNavigate } from "@remix-run/react";
import { Dumbbell, Volleyball, Users, Calendar, ChevronRight, ChartColumnIncreasing } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { createServerClient, parse } from '@supabase/ssr';
import { supabase } from "~/utils/supabase.server";

interface Facility {
  id: string;
  name: string;
  address: string;
  type: string;
  members: number;
  revenue?: number;
  subcription_end_date?: string | null;
}

interface LoaderData {
  facilities: Facility[];
  userName: string;
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

  const { data: facilities, error } = await supabase
    .from('facilities')
    .select(`
      *,
      facility_subscriptions (
        end_date
      )
    `)
    .eq('user_id', user.id);

  const { data: userName } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)

  if (error) {
    return json({ error: error.message });
  }

  const processedFacilities = facilities.map(facility => ({
    ...facility,
    subscription_end_date: facility.facility_subscriptions[0]?.end_date || null
  }));

  return json({ facilities: processedFacilities, userName: userName[0].full_name });
};

export default function Dashboard() {
  const { facilities, userName } = useLoaderData<LoaderData>();

  const gyms = facilities.filter((f) => f.type === "gym");
  const badmintonFacilities = facilities.filter((f) => f.type === "badminton");

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* Header */}
      <header className="bg-card text-card-foreground p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center">
          <Link to="/">{/* <ArrowLeft className="h-6 w-6 mr-2" /> */}</Link>
          <h1 className="text-xl font-bold">Facility Dashboard</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        <h2 className="text-2xl font-bold mb-4">Welcome, {userName}</h2>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="all">All Facilities</TabsTrigger>
            <TabsTrigger value="gyms">Gyms</TabsTrigger>
            <TabsTrigger value="badminton">Badminton</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <FacilityGrid facilities={facilities} />
          </TabsContent>
          <TabsContent value="gyms">
            <FacilityGrid facilities={gyms} />
          </TabsContent>
          <TabsContent value="badminton">
            <FacilityGrid facilities={badmintonFacilities} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function FacilityGrid({ facilities }: { facilities: Facility[] }) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {facilities.map((facility) => (
        <Card
          key={facility.id}
          className={`${
            facility.type === "gym" ? "border-primary/20" : "border-secondary/20"
          } cursor-pointer hover:shadow-md transition-shadow`}
          onClick={() => navigate(`${facility.id}/home`)}
        >
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{facility.name}</CardTitle>
              <Badge
                variant={facility.type === "gym" ? "default" : "secondary"}
                className="text-xs"
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
              <div className="flex items-center text-sm">
                <ChartColumnIncreasing className="h-4 w-4 mr-2 text-primary" />
                <span>₹{(facility.revenue || 1000).toLocaleString()} revenue</span>
              </div>
              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2 text-primary" />
                <span>
                  {facility.subcription_end_date
                    ? `Subscription ends: ${new Date(facility.subcription_end_date).toLocaleDateString()}`
                    : "No active subscription"}
                </span>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}