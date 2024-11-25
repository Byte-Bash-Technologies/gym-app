import { json, LoaderFunction } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { supabase } from "~/utils/supabase.server";
import { Users, CreditCard, Calendar, CheckCircle } from 'lucide-react';

interface Facility {
  id: string;
  name: string;
  type: string;
  logo_url: string;
  status: 'active' | 'inactive';
  member_count: number;
  facility_subscriptions: {
    id: string;
    plan_id: string;
    start_date: string;
    end_date: string;
    status: string;
    payment_status: string;
    subscription_plans: {
      name: string;
      price: number;
      duration_days: number;
      features: { feature: string[] };
    };
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
        payment_status,
        subscription_plans (
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

  return json({ facility });
};

export default function FacilityProfile() {
  const { facility } = useLoaderData<{ facility: Facility }>();
  const currentSubscription = facility.facility_subscriptions[0]; // Assuming the most recent subscription is first

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
            <Users className="h-5 w-5 text-gray-500" />
            <span>{facility.member_count} members</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-gray-500" />
            <span>{currentSubscription.subscription_plans.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <span>Expires: {new Date(currentSubscription.end_date).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Add recent activity content here */}
            <p>Recent activity data not available</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Subscription Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Current Plan: {currentSubscription.subscription_plans.name}</h3>
                <p>Price: ${currentSubscription.subscription_plans.price} / {currentSubscription.subscription_plans.duration_days} days</p>
                <p>Status: <Badge variant={currentSubscription.status === 'active' ? 'success' : 'destructive'}>{currentSubscription.status}</Badge></p>
                <p>Payment Status: <Badge variant={currentSubscription.payment_status === 'paid' ? 'success' : 'warning'}>{currentSubscription.payment_status}</Badge></p>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}