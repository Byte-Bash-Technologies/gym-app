import { json, redirect, LoaderFunction } from "@remix-run/node";
import { Outlet, useLoaderData, useNavigate, Link, Form } from "@remix-run/react";
import { ArrowLeft, RefreshCcw, MessageSquare, BarChart, User2, Clock, X, LogOut, UserCog } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { createServerClient, parse, serialize } from "@supabase/ssr";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { ActionFunction } from "@remix-run/node";
import { ThemeToggle } from "~/components/theme-toggle";


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

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const { data: userData, error: userError } = await supabaseClient
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (userError) {
    console.error("Error fetching user data:", userError);
    return redirect("/login");
  }

  const { data: facility, error: facilityError } = await supabaseClient
    .from("facilities")
    .select("*")
    .eq("id", facilityId)
    .single();

  if (facilityError) {
    console.error("Error fetching facility data:", facilityError);
    return redirect("/");
  }

  const { data: subscription, error: subscriptionError } = await supabaseClient
    .from("facility_subscriptions")
    .select("*, subscription_plans(*)")
    .eq("facility_id", facilityId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (subscriptionError) {
    console.error("Error fetching subscription data:", subscriptionError);
  }

  return json({ user: userData, facility, subscription });
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
   supabaseClient.auth.signOut();
   return redirect("/login");
  }

  return null;
};

export default function Component() {
  const { user, facility, subscription } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);

  const getExpirationText = () => {
    if (!subscription) return "No active subscription";
    const expirationDate = new Date(subscription.end_date);
    const now = new Date();
    const timeDiff = expirationDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysLeft < 0) {
      return `Expired ${Math.abs(daysLeft)} day${
        Math.abs(daysLeft) !== 1 ? "s" : ""
      } ago`;
    } else if (daysLeft <= 5) {
      return `Expiring soon in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`;
    } else {
      return `Expiring in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`;
    }
  };

  const handleWhatsAppContact = () => {
    const phoneNumber = "917010976271";
    const message = encodeURIComponent(
      "Hello, I need assistance with my Sportsdot account."
    );
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
    setIsContactDialogOpen(false);
  };

  const handlePhoneContact = () => {
    window.location.href = "tel:+917010976271";
    setIsContactDialogOpen(false);
  };

  const handleRenewSubscription = () => {
    const phoneNumber = "917010976271";
    const message = encodeURIComponent(
      `Hello Benston,\n\nI would like to renew my subscription for the ${facility.type} facility, specifically for ${facility.name}.\n\nFacility subscription link: https://app.sportsdot.in/${facility.id}/renew-subscription`
    );
    window.open(`https://wa.me/${phoneNumber}?text=${message}`);
  };

  return (
    <div className="min-h-screen bg-[#f0ebff] dark:bg-[#212237]">
      <header className="bg-background dark:bg-[#4A4A62] p-4 flex items-center justify-between border-b border-[#8e76af]/20">
        <div className="flex items-center gap-2">
          <Link to={`/${facility.id}/home`} className="flex items-center gap-2">
            <ArrowLeft className="h-6 w-6 cursor-pointer" />
          </Link>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <Avatar className="w-24 h-24">
            <AvatarImage
              src={user.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${user.full_name}`}
              alt={user.full_name}
            />
            <AvatarFallback>{user.full_name[0]}</AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-bold">{user.full_name}</h2>
          <p className="text-gray-500">{user.email}</p>
          <p className="text-gray-500">{user.phone}</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">Your Gym</h2>
          <Card className="p-4 bg-background">
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-12 w-12">
                <AvatarImage
                  src={facility.logo_url || `https://api.dicebear.com/9.x/identicon/svg/${facility.name}`}
                  alt={facility.name}
                />
                <AvatarFallback>{facility.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold">{facility.name}</h3>
                <p className="text-gray-500">#{facility.id}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Current plan</h4>
              <p className="text-lg">
                {subscription
                  ? subscription.subscription_plans.name
                  : "No active plan"}
              </p>
              <p
                className={`text-sm inline-block px-3 py-1 dark:bg-[#3A3A52] rounded-full ${
                  getExpirationText().includes("Expiring soon")
                    ? "bg-yellow-50 text-yellow-500"
                    : getExpirationText().includes("Expired")
                    ? "bg-red-50 text-red-500"
                    : "bg-green-50 text-green-500"
                }`}
              >
                • {getExpirationText()}
              </p>
              <Button
                variant="ghost"
                className="text-[#8e76af] pl-4 m-4 dark:hover:bg-[#3A3A52]"
                onClick={handleRenewSubscription}
              >
                <RefreshCcw className="h-4 w-4 mr-2 " />
                Change plan
              </Button>
            </div>
          </Card>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">Appearance</h2>
          <Card className="p-4 bg-background">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Theme</h3>
                <p className="text-sm text-gray-500">Customize how the app looks</p>
              </div>
              <ThemeToggle />
            </div>
          </Card>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">Manage Gym</h2>
          <Card className="divide-y bg-background">
            <Link to={`/${facility.id}/message-template`} className="block">
              <Button variant="ghost" className="w-full justify-start p-6 dark:hover:bg-[#3A3A52] rounded-b-none rounded-t-xl">
                <MessageSquare className="h-5 w-5 mr-3 text-[#8e76af]" />
                <h3 className="font-semibold">Message templates</h3>
              </Button>
            </Link>
            <Link to={`/${facility.id}/plans`} className="block">
              <Button variant="ghost" className="w-full justify-start p-6 dark:hover:bg-[#3A3A52] rounded-none">
                <BarChart className="h-5 w-5 mr-3 text-[#8e76af]" />
                <h3 className="font-semibold">Plans</h3>
              </Button>
            </Link>
            <Link to={`/${facility.id}/trainers`} className="block">
              <Button variant="ghost" className="w-full justify-start p-6 dark:hover:bg-[#3A3A52] rounded-b-xl rounded-t-none">
                <UserCog className="h-5 w-5 mr-3 text-[#8e76af]" />
                <h3 className="font-semibold">Manage Trainers</h3>
              </Button>
            </Link>
          </Card>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">Sportsdot</h2>
          <Card className="divide-y bg-background">
            <Button
              variant="ghost"
              className="w-full justify-start p-6 dark:hover:bg-[#3A3A52] rounded-t-xl rounded-b-none"
              onClick={() => setIsContactDialogOpen(true)}
            >
              <User2 className="h-5 w-5 mr-3 text-[#8e76af]" />
              Contact us
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start p-6 dark:hover:bg-[#3A3A52] rounded-b-xl rounded-t-none"
              onClick={() => setIsInfoDialogOpen(true)}
            >
              <Clock className="h-5 w-5 mr-3 text-[#8e76af]" />
              Support and Information
            </Button>
          </Card>
        </section>

        <Form method="post">
          <input type="hidden" name="action" value="logout" />
          <Button
            type="submit"
            variant="ghost"
            className="w-full flex items-center justify-center gap-2 p-4 dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]/90"
          >
            <LogOut className="h-5 w-5 text-[#8e76af]" />
            Logout
          </Button>
        </Form>
        <Outlet />
      </main>

      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent className="dark:bg-[#212237]">
          <DialogHeader>
            <DialogTitle>Contact Us</DialogTitle>
          </DialogHeader>
          <DialogDescription className="space-y-4">
            <p>Choose how you would like to contact us:</p>
            <div className="flex flex-col gap-3">
              <Button onClick={handleWhatsAppContact} className="w-full bg-[#886fa6] hover:bg-[#886fa6]/90 dark:bg-[#3A3A52] text-white">
                Contact via WhatsApp
              </Button>
              <Button
                onClick={handlePhoneContact}
                variant="outline"
                className="w-full dark:bg-[#4A4A62]"
              >
                Call Us
              </Button>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>

      <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
        <DialogContent className="dark:bg-[#212237]">
          <DialogHeader>
            <DialogTitle>Support and Information</DialogTitle>
            
          </DialogHeader>
          <DialogDescription>
            <div className="space-y-4">
              <p>
                Welcome to Sportsdot support! We&apos;re here to help you manage your
                fitness facility efficiently.
              </p>
              <h3 className="font-semibold">Contact Information:</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Phone: +91 7010976271</li>
                <li>Email: support@sportsdot.com</li>
                <li>WhatsApp: +91 7010976271</li>
              </ul>
              <h3 className="font-semibold">Support Hours:</h3>
              <p>Monday to Friday: 9:00 AM to 6:00 PM IST</p>
              <h3 className="font-semibold">FAQs:</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>How do I update my gym&apos;s information?</li>
                <li>How can I manage memberships?</li>
                <li>What payment methods are supported?</li>
              </ul>
              <p>
                For more detailed information, please visit our{" "}
                <a href="/help-center" className="text-purple-300 underline">
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

