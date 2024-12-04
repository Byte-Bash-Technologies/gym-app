import { json, LoaderFunction, ActionFunction } from "@remix-run/node";
import { useLoaderData, useNavigate, useFetcher } from "@remix-run/react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { supabase } from "~/utils/supabase.server";
import { CreditCard, Calendar, AlertTriangle } from 'lucide-react';

interface Subscription {
  id: string;
  name: string;
  price: number;
  duration_days: number;
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
    payment_status: string;
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
        payment_status,
        subscription_plans (
          id,
          name,
          price,
          duration_days
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
    .select('id, name, price, duration_days');

  if (subscriptionError) {
    console.error('Error fetching subscriptions:', subscriptionError);
    throw new Response("Error fetching subscriptions", { status: 500 });
  }

  return json({ facility, allSubscriptions });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const facilityId = formData.get('facilityId') as string;
  const planId = formData.get('planId') as string;
  const paymentMethod = formData.get('paymentMethod') as string;

  console.log('Action called with:', { facilityId, planId, paymentMethod });

  // Get the selected plan details
  const { data: plan, error: planError } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (planError) {
    console.error('Error fetching plan details:', planError);
    return json({ error: 'Error fetching plan details', details: planError }, { status: 400 });
  }

  // Set the current active subscription to expired
  const { error: updateError } = await supabase
    .from('facility_subscriptions')
    .update({ status: 'expired' })
    .eq('facility_id', facilityId)
    .eq('status', 'active');

  if (updateError) {
    console.error('Error updating current subscription:', updateError);
    return json({ error: 'Error updating current subscription', details: updateError }, { status: 400 });
  }

  // Calculate new start and end dates
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);

  // Add new subscription
  const { data: newSubscription, error: insertError } = await supabase
    .from('facility_subscriptions')
    .insert({
      facility_id: facilityId,
      plan_id: planId,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      status: 'active',
      payment_status: 'completed', // Updated payment status
      amount: plan.price // Add this line to include the plan amount
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error adding new subscription:', insertError);
    return json({ error: 'Error adding new subscription', details: insertError }, { status: 400 });
  }

  return json({ success: true, newSubscription });
};

export default function FacilityProfile() {
  const { facility, allSubscriptions } = useLoaderData<{ facility: Facility, allSubscriptions: Subscription[] }>();
  const [isChangeSubscriptionOpen, setIsChangeSubscriptionOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const currentSubscription = facility.facility_subscriptions.find(sub => sub.status === 'active');
  const hasActiveSubscription = !!currentSubscription;
  const expiredSubscriptions = facility.facility_subscriptions.filter(sub => sub.status === 'expired');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleRenewMembership = () => {
    if (selectedPlan && paymentMethod) {
      fetcher.submit(
        { facilityId: facility.id, planId: selectedPlan, paymentMethod },
        { method: 'post' }
      );
    }
  };

  useEffect(() => {
    if (fetcher.type === 'done') {
      if (fetcher.data.success) {
        setIsChangeSubscriptionOpen(false);
        setSelectedPlan('');
        setPaymentMethod('');
        navigate('.', { replace: true }); // Refresh the page
      } else {
        console.error('Error updating subscription:', fetcher.data.error, fetcher.data.details);
        // You might want to show an error message to the user here
      }
    }
  }, [fetcher, navigate]);

  return (
    <div className="space-y-6">
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
                  {hasActiveSubscription ? 'Change Subscription' : 'Add Subscription'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{hasActiveSubscription ? 'Change Subscription' : 'Add Subscription'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="plan">Select Plan</Label>
                    <Select onValueChange={setSelectedPlan} value={selectedPlan}>
                      <SelectTrigger id="plan">
                        <SelectValue placeholder="Select a plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {allSubscriptions.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>
                            {sub.name} - ₹{sub.price} / {sub.duration_days} days
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select onValueChange={setPaymentMethod} value={paymentMethod}>
                      <SelectTrigger id="paymentMethod">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="debit_card">Debit Card</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleRenewMembership} 
                    disabled={!selectedPlan || !paymentMethod || fetcher.state === 'submitting'}
                  >
                    {fetcher.state === 'submitting' 
                      ? 'Processing...' 
                      : hasActiveSubscription ? 'Change Membership' : 'Add Membership'}
                  </Button>
                </div>
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
                      Subscription {sub.subscription_plans.name} expired {/* on {formatDate(sub.end_date)} */}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No recent expired Subscriptions</p>
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
                  <p>Start Date: {formatDate(currentSubscription.start_date)}</p>
                  <p>End Date: {formatDate(currentSubscription.end_date)}</p>
                </div>
              </div>
            ) : (
              <p>No active subscription. Click &apos;Add Subscription&apos; to subscribe to a plan.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}