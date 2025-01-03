import { json, type LoaderFunction, redirect } from "@remix-run/node";
import { useLoaderData, Link, useNavigate } from "@remix-run/react";
import { Dumbbell, Volleyball, Users, Calendar, ChevronRight, ChartColumnIncreasing, Settings, Plus, UserCog } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { createServerClient, parse } from '@supabase/ssr';
import { supabase } from "~/utils/supabase.server";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { useState } from "react";

interface Facility {
  id: string;
  name: string;
  address: string;
  type: string;
  members: number;
  revenue?: number;
  subscription_end_date?: string | null;
  is_owner: boolean;
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

  // Fetch both owned and assigned facilities
  const userId = user.id;
  // Step 1: Fetch facility IDs from facility_trainers
  const { data: trainerFacilities, error: trainerError } = await supabase
    .from('facility_trainers')
    .select('facility_id')
    .eq('user_id', userId);
  
  if (trainerError) {
    console.error('Error fetching trainer facilities:', trainerError);
  }

  const facilityIds = trainerFacilities ? trainerFacilities.map(trainer => trainer.facility_id) : [];

  // Step 2: Fetch facilities with the specified user ID or the trainer facility IDs
  const { data: facilities, error } = await supabase
    .from('facilities')
    .select(`
      *,
      facility_subscriptions (
        end_date
      )
    `)
    .or(`user_id.eq.${userId},id.in.(${facilityIds.join(',')})`);

  if (error) {
    console.error('Error fetching facilities:', error);
  }

  const { data: userName } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single();

  if (error) {
    return json({ error: error.message });
  }

  const processedFacilities = facilities.map(facility => ({
    ...facility,
    subscription_end_date: facility.facility_subscriptions[0]?.end_date || null,
    is_owner: facility.user_id === user.id
  }));

  return json({ 
    facilities: processedFacilities, 
    userName: userName?.full_name || ''
  });
};

export default function Dashboard() {
  const { facilities, userName } = useLoaderData<LoaderData>();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [message, setMessage] = useState("Hi, I would like to add a new facility to the platform.");

  const gyms = facilities.filter((f) => f.type === "gym");
  const badmintonFacilities = facilities.filter((f) => f.type === "badminton");

  const handleSendMessage = () => {
    const whatsappUrl = `https://wa.me/917010976271?text=${encodeURIComponent(message)}`;
    window.location.href = whatsappUrl;
    setIsDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-background dark:bg-[#212237] text-foreground">
      <header className="bg-card text-card-foreground p-4 sticky top-0 z-10 shadow-sm dark:bg-[#212237]">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">Facility Dashboard</h1>
          {/*<div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings")}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>*/}
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">Welcome, {userName}</h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add New Facility
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Contact Admin</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here..."
                  className="min-h-[100px]"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendMessage}>
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

        {/* Badminton Section - Only show if there are badminton facilities */}
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
  );
}

function FacilityCard({ facility }: { facility: Facility }) {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`${facility.id}/home`)}
    >
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <CardTitle className="text-lg">{facility.name}</CardTitle>
            <Badge variant={facility.is_owner ? "default" : "secondary"} className="text-xs">
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
          {facility.is_owner && (
            <div className="flex items-center text-sm">
              <ChartColumnIncreasing className="h-4 w-4 mr-2 text-primary" />
              <span>₹{(facility.revenue || 1000).toLocaleString()} revenue</span>
            </div>
          )}
          <div className="flex items-center text-sm">
            <Calendar className="h-4 w-4 mr-2 text-primary" />
            <span>
              {facility.subscription_end_date
                ? `Subscription ends: ${new Date(facility.subscription_end_date).toLocaleDateString()}`
                : "No active subscription"}
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