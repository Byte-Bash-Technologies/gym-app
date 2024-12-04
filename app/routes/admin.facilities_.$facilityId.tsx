import { json, LoaderFunction } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { supabase } from "~/utils/supabase.server";
import { CreditCard, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';

interface Subscription {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  features: { feature: string[] };
}

interface Facility {
  id: string;
  name: string;
  type: string;
  logo_url: string;
  status: 'active' | 'inactive';
  facility_subscriptions: {
    id: string;
    plan_id: string;
    start_date: string;
    end_date: string;
    status: string;
    subscription_plans: Subscription;
  }[];
}

export const loader: LoaderFunction = async ({ params }) => {
  const { facilityId } = params;
  const { data: facility, error } = await supabase
    .from('facilities')
    .select(`
      *,
      facility_subscriptions (
        id,
        plan_id,
        start_date,
        end_date,
        status,
        subscription_plans (
          id,
          name,
          price,
          duration_days,
          features
        )
      )
    `)
    .eq('id', facilityId)
    .single();

  if (error) {
    console.error('Error fetching facility:', error);
    throw new Response("Not Found", { status: 404 });
  }

  // Fetch all available subscription plans
  const { data: allSubscriptions, error: subscriptionError } = await supabase
    .from('subscription_plans')
    .select('*');

  if (subscriptionError) {
    console.error('Error fetching subscriptions:', subscriptionError);
    throw new Response("Error fetching subscriptions", { status: 500 });
  }

  return json({ facility, allSubscriptions });
};

function SubscriptionList({ subscriptions, onSelect }: { subscriptions: Subscription[], onSelect: (sub: Subscription) => void }) {
  return (
    <div className="space-y-4">
      {subscriptions.map((sub) => (
        <Card key={sub.id} className="cursor-pointer hover:bg-gray-100" onClick={() => onSelect(sub)}>
          <CardContent className="p-4">
            <h3 className="font-semibold">{sub.name}</h3>
            <p>Price: ₹{sub.price} / {sub.duration_days} days</p>
            <ul className="list-disc list-inside mt-2">
              {sub.features.feature.map((feature, index) => (
                <li key={index} className="text-sm">{feature}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function FacilityProfile() {
  const { facility, allSubscriptions } = useLoaderData<{ facility: Facility, allSubscriptions: Subscription[] }>();
  const [isChangeSubscriptionOpen, setIsChangeSubscriptionOpen] = useState(false);
  const currentSubscription = facility.facility_subscriptions[0]; // Assuming the most recent subscription is first
  const hasActiveSubscription = currentSubscription && currentSubscription.status === 'active';
  const expiredSubscriptions = facility.facility_subscriptions.filter(sub => sub.status === 'expired');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleSubscriptionChange = (newSubscription: Subscription) => {
    // Here you would implement the logic to change the subscription
    console.log("Changing subscription to:", newSubscription);
    setIsChangeSubscriptionOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Facility Profile</h2>
        <Link to={`/admin/facilities/${facility.id}/edit`}>
          <Button>Edit Facility</Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={facility.logo_url} alt={facility.name} />
            <AvatarFallback>{facility.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">{facility.name}</CardTitle>
            <p className="text-gray-500">{facility.type}</p>
            <Badge variant={facility.status === 'active' ? 'success' : 'destructive'} className="mt-2">
              {facility.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-gray-500" />
            <span>{hasActiveSubscription ? currentSubscription.subscription_plans.name : 'No active plan'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <span>
              {hasActiveSubscription 
                ? `Expires: ${formatDate(currentSubscription.end_date)}` 
                : 'No active subscription'}
            </span>
          </div>
          <div>
            <Dialog open={isChangeSubscriptionOpen} onOpenChange={setIsChangeSubscriptionOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  {hasActiveSubscription ? 'Change Membership' : 'Add Membership'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{hasActiveSubscription ? 'Change Membership' : 'Add Membership'}</DialogTitle>
                </DialogHeader>
                <SubscriptionList 
                  subscriptions={allSubscriptions} 
                  onSelect={handleSubscriptionChange} 
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {expiredSubscriptions.length > 0 ? (
              <ul className="space-y-2">
                {expiredSubscriptions.map((sub, index) => (
                  <li key={index} className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                    <span>
                      Membership {sub.subscription_plans.name} expired on {formatDate(sub.end_date)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No recent expired memberships</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Subscription Details</CardTitle>
          </CardHeader>
          <CardContent>
            {hasActiveSubscription ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Current Plan: {currentSubscription.subscription_plans.name}</h3>
                  <p>Price: ₹{currentSubscription.subscription_plans.price} / {currentSubscription.subscription_plans.duration_days} days</p>
                  <p>Status: <Badge variant="success">{currentSubscription.status}</Badge></p>
                </div>
                <div>
                  <h4 className="font-semibold">Features:</h4>
                  <ul className="list-disc list-inside">
                    {currentSubscription.subscription_plans.features.feature.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p>No active subscription. Click &apos;Add Membership&apos; to subscribe to a plan.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

