import { json, redirect, LoaderFunction } from "@remix-run/node";
import { Outlet, useLoaderData, useNavigate, Link, Form } from "@remix-run/react";
import { ArrowLeft, RefreshCcw, MessageSquare, BarChart, User2, Clock, X, LogOut } from 'lucide-react';
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
import { supabase } from "~/utils/supabase.client";

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

export const action = async ({ request }) => {
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
  const [isChangePlanDialogOpen, setIsChangePlanDialogOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to={`/${facility.id}/home`}>
            <ArrowLeft className="h-6 w-6 cursor-pointer" />
          </Link>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <Avatar className="w-24 h-24">
            <AvatarImage
              src={user.avatar_url || "/placeholder.svg"}
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
          <Card className="p-4 bg-purple-50">
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-12 w-12">
                <AvatarImage
                  src={facility.logo_url || "/placeholder.svg"}
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
                className={`text-sm inline-block px-3 py-1 rounded-full ${
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
                className="text-gray-500 pl-0"
                onClick={() => setIsChangePlanDialogOpen(true)}
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Change plan
              </Button>
            </div>
          </Card>
        </section>

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

        <section className="space-y-2">
          <h2 className="text-xl font-bold">Sportsdot</h2>
          <Card className="divide-y">
            <Button
              variant="ghost"
              className="w-full justify-start p-4"
              onClick={() => setIsContactDialogOpen(true)}
            >
              <User2 className="h-5 w-5 mr-3 text-purple-500" />
              Contact us
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start p-4"
              onClick={() => setIsInfoDialogOpen(true)}
            >
              <Clock className="h-5 w-5 mr-3 text-purple-500" />
              Support and Information
            </Button>
          </Card>
        </section>

        <Form method="post">
          <input type="hidden" name="action" value="logout" />
          <Button
            type="submit"
            variant="ghost"
            className="w-full flex items-center justify-center gap-2"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </Button>
        </Form>
        <Outlet />
      </main>

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
              <Button
                onClick={handlePhoneContact}
                variant="outline"
                className="w-full"
              >
                Call Us
              </Button>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>

      <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
        <DialogContent>
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
                <a href="/help-center" className="text-purple-500 underline">
                  Help Center
                </a>
                .
              </p>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>

      <Dialog open={isChangePlanDialogOpen} onOpenChange={setIsChangePlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Plan</DialogTitle>
            
          </DialogHeader>
          <DialogDescription>
            <div className="space-y-4">
              <p>Select a new plan for your gym:</p>
              <ul className="space-y-2">
                <li>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => {
                      // Handle plan selection
                      setIsChangePlanDialogOpen(false);
                    }}
                  >
                    Basic Plan
                    <span className="font-bold">$9.99/month</span>
                  </Button>
                </li>
                <li>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => {
                      // Handle plan selection
                      setIsChangePlanDialogOpen(false);
                    }}
                  >
                    Pro Plan
                    <span className="font-bold">$19.99/month</span>
                  </Button>
                </li>
                <li>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => {
                      // Handle plan selection
                      setIsChangePlanDialogOpen(false);
                    }}
                  >
                    Enterprise Plan
                    <span className="font-bold">$49.99/month</span>
                  </Button>
                </li>
              </ul>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
}

