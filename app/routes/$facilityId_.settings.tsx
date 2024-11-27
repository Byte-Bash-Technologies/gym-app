import { json, redirect, LoaderFunction } from "@remix-run/node";
import { Outlet, useLoaderData, useNavigate, Link } from "@remix-run/react";
import {
  ArrowLeft,
  Bell,
  Phone,
  Settings as SettingsIcon,
  RefreshCcw,
  MessageSquare,
  BarChart,
  User2,
  Clock,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { supabase } from "~/utils/supabase.client";
import { createServerClient, parse, serialize } from '@supabase/ssr';

export const loader: LoaderFunction = async ({ params, request }) => {
  const { facilityId } = params;
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

  const { data: { user } } = await supabaseClient.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  const { data: userData, error: userError } = await supabaseClient
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (userError) {
    console.error('Error fetching user data:', userError);
    return redirect('/login');
  }

  const { data: facility, error: facilityError } = await supabaseClient
    .from('facilities')
    .select('*')
    .eq('id', facilityId)
    .single();

  if (facilityError) {
    console.error('Error fetching facility data:', facilityError);
    return redirect('/');
  }

  const { data: subscription, error: subscriptionError } = await supabaseClient
    .from('facility_subscriptions')
    .select('*')
    .eq('facility_id', facilityId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (subscriptionError) {
    console.error('Error fetching subscription data:', subscriptionError);
  }

  return json({ user: userData, facility, subscription });
};

export default function SettingsPage() {
  const { user, facility, subscription } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  

  const handleLogout = async () => {
    console.log('Logging out...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
    } else {
      navigate('/login');
    }
  };

  const getExpirationText = () => {
    if (!subscription) return 'No active subscription';
    const expirationDate = new Date(subscription.end_date);
    const now = new Date();
    const monthsLeft = (expirationDate.getFullYear() - now.getFullYear()) * 12 + 
                       (expirationDate.getMonth() - now.getMonth());
    return `Expiring in ${monthsLeft} month${monthsLeft !== 1 ? 's' : ''}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeft
            className="h-6 w-6 cursor-pointer"
            onClick={() => navigate(`/${facility.id}`)}
          />
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
        <div className="flex items-center gap-4">
          <Bell className="h-6 w-6 text-purple-500" />
          <a href="tel:8300861600">
            <Phone className="h-6 w-6 text-purple-500" />
          </a>
          <SettingsIcon className="h-6 w-6 text-purple-500" />
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Profile Section */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Avatar className="w-24 h-24">
            <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={user.full_name} />
            <AvatarFallback>{user.full_name[0]}</AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-bold">{user.full_name}</h2>
          <p className="text-gray-500">{user.email}</p>
          <p className="text-gray-500">{user.phone}</p>
        </div>

        {/* Your Gym Section */}
        <section className="space-y-2">
          <h2 className="text-xl font-bold">Your Gym</h2>
          <Card className="p-4 bg-purple-50">
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={facility.logo_url || "/placeholder.svg"} alt={facility.name} />
                <AvatarFallback>{facility.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold">{facility.name}</h3>
                <p className="text-gray-500">#{facility.id}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Current plan</h4>
              <p className="text-lg">{subscription ? subscription.plan_name : 'No active plan'}</p>
              <p className="text-green-500 text-sm inline-block bg-green-50 px-3 py-1 rounded-full">
                • {getExpirationText()}
              </p>
              <Button variant="ghost" className="text-gray-500 pl-0">
                <RefreshCcw className="h-4 w-4 mr-2" />
                Change plan
              </Button>
            </div>
          </Card>
        </section>

        {/* Manage Gym Section */}
        <section className="space-y-2">
          <h2 className="text-xl font-bold">Manage Gym</h2>
          <Card className="divide-y">
            <Link to={`/${facility.id}/message-template`} className="block">
              <Button variant="ghost" className="w-full justify-start p-4">
                <MessageSquare className="h-5 w-5 mr-3 text-purple-500" />
                Message templates
              </Button>
            </Link>
            <Link to={`/${facility.id}/plans`} className="block">
              <Button variant="ghost" className="w-full justify-start p-4">
                <BarChart className="h-5 w-5 mr-3 text-purple-500" />
                Plans
              </Button>
            </Link>
          </Card>
        </section>

        {/* Sportsdot Section */}
        <section className="space-y-2">
          <h2 className="text-xl font-bold">Sportsdot</h2>
          <Card className="divide-y">
            <Button variant="ghost" className="w-full justify-start p-4">
              <User2 className="h-5 w-5 mr-3 text-purple-500" />
              Contact us
            </Button>
            <Button variant="ghost" className="w-full justify-start p-4">
              <Clock className="h-5 w-5 mr-3 text-purple-500" />
              Support and Information
            </Button>
          </Card>
        </section>

        {/* Logout Button */}
      <Button variant="destructive" onClick={handleLogout} type="button">  
        Logout
      </Button>
        <Outlet />
      </main>
    </div>
  );
}
