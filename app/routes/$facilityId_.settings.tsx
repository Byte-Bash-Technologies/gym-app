import { json, redirect, LoaderFunction } from "@remix-run/node";
import { Outlet, useLoaderData, useNavigate, Link } from "@remix-run/react";
import { ArrowLeft, Bell, Phone, SettingsIcon, RefreshCcw, MessageSquare, BarChart, User2, Clock, X, LogOut } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { supabase } from "~/utils/supabase.client";
import { createServerClient, parse, serialize } from '@supabase/ssr';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "~/components/ui/dialog";
import { useState } from "react";

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
    .select('*, subscription_plans(*)')
    .eq('facility_id', facilityId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (subscriptionError) {
    console.error('Error fetching subscription data:', subscriptionError);
  }

  return json({ user: userData, facility, subscription });
};

export default function Component() {
  const { user, facility, subscription } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const getExpirationText = () => {
    if (!subscription) return 'No active subscription';
    const expirationDate = new Date(subscription.end_date);
    const now = new Date();
    const timeDiff = expirationDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return `Expiring in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;
  };

  const handleWhatsAppContact = () => {
    const phoneNumber = "918300861600";
    const message = encodeURIComponent("Hello, I need assistance with my Sportsdot account.");
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
    setIsContactDialogOpen(false);
  };

  const handlePhoneContact = () => {
    window.location.href = "tel:+918300861600";
    setIsContactDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to={`/${facility.id}/home`}>
            <ArrowLeft className="h-6 w-6 cursor-pointer" />
          </Link>
          <h1 className="text-xl font-bold">Settings</h1>
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
              <p className="text-lg">{subscription ? subscription.subscription_plans.name : 'No active plan'}</p>
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
            <Button variant="ghost" className="w-full justify-start p-4" onClick={() => setIsContactDialogOpen(true)}>
              <User2 className="h-5 w-5 mr-3 text-purple-500" />
              Contact us
            </Button>
            <Button variant="ghost" className="w-full justify-start p-4" onClick={() => setIsInfoDialogOpen(true)}>
              <Clock className="h-5 w-5 mr-3 text-purple-500" />
              Support and Information
            </Button>
          </Card>
        </section>

        {/* Logout Button */}
        <Link to="/logout"
          className="w-full flex items-center justify-center gap-2"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Link>
        <Outlet />
      </main>
    
      {/* Contact Us Dialog */}
      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Us</DialogTitle>
          </DialogHeader>
          <DialogDescription className="space-y-4">
            <p>Choose how you would like to contact us:</p>
            <div className="flex flex-col gap-3">
              <Button onClick={handleWhatsAppContact} className="w-full">
                Contact via WhatsApp
              </Button>
              <Button onClick={handlePhoneContact} variant="outline" className="w-full">
                Call Us
              </Button>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>

      {/* Support and Information Dialog */}
      <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Support and Information</DialogTitle>
            <Button
              variant="ghost"
              className="absolute right-4 top-4"
              onClick={() => setIsInfoDialogOpen(false)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogHeader>
          <DialogDescription>
            <div className="space-y-4">
              <p>
                Welcome to Sportsdot support! We're here to help you manage your fitness facility efficiently.
              </p>
              <h3 className="font-semibold">Contact Information:</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Phone: +91 8300861600</li>
                <li>Email: support@sportsdot.com</li>
                <li>WhatsApp: +91 8300861600</li>
              </ul>
              <h3 className="font-semibold">Support Hours:</h3>
              <p>Monday to Friday: 9:00 AM to 6:00 PM IST</p>
              <h3 className="font-semibold">FAQs:</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>How do I update my gym's information?</li>
                <li>How can I manage memberships?</li>
                <li>What payment methods are supported?</li>
              </ul>
              <p>
                For more detailed information, please visit our{" "}
                <a href="/help-center" className="text-purple-500 underline">
                  Help Center
                </a>
                .
              </p>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
}