import { useState } from 'react';
import { json, LoaderFunction, ActionFunction, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form } from "@remix-run/react";
import { supabase } from "~/utils/supabase.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { toast } from "~/hooks/use-toast";

interface Subscription {
  id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  status: string;
  payment_status: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  features: { feature: string[] };
}

export const loader: LoaderFunction = async ({ params }) => {
  const { facilityId } = params;
  const { data: subscription, error: subscriptionError } = await supabase
    .from('facility_subscriptions')
    .select('*')
    .eq('facility_id', facilityId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (subscriptionError) {
    console.error('Error fetching subscription:', subscriptionError);
    throw new Response("Not Found", { status: 404 });
  }

  const { data: plans, error: plansError } = await supabase
    .from('subscription_plans')
    .select('*');

  if (plansError) {
    console.error('Error fetching subscription plans:', plansError);
    throw new Response("Error fetching plans", { status: 500 });
  }

  return json({ subscription, plans });
};

export const action: ActionFunction = async ({ request, params }) => {
  const { facilityId } = params;
  const formData = await request.formData();
  const planId = formData.get('planId') as string;
  const startDate = formData.get('startDate') as string;
  const endDate = formData.get('endDate') as string;
  const status = formData.get('status') as string;
  const paymentStatus = formData.get('paymentStatus') as string;

  const { error } = await supabase
    .from('facility_subscriptions')
    .update({
      plan_id: planId,
      start_date: startDate,
      end_date: endDate,
      status,
      payment_status: paymentStatus
    })
    .eq('facility_id', facilityId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error updating subscription:', error);
    return json({ error: 'Failed to update subscription' }, { status: 500 });
  }

  return redirect(`/admin/facilities/${facilityId}`);
};

export default function EditSubscription() {
  const { subscription, plans } = useLoaderData<{ subscription: Subscription, plans: SubscriptionPlan[] }>();
  const actionData = useActionData();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    plans.find(plan => plan.id === subscription.plan_id) || null
  );

  if (actionData?.error) {
    toast({
      title: "Error",
      description: actionData.error,
      variant: "destructive",
    });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Edit Subscription</h2>
      <Card>
        <CardHeader>
          <CardTitle>Subscription Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            <div>
              <Label htmlFor="planId">Subscription Plan</Label>
              <Select
                name="planId"
                defaultValue={subscription.plan_id}
                onValueChange={(value) => setSelectedPlan(plans.find(plan => plan.id === value) || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - ${plan.price} / {plan.duration_days} days
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                type="date"
                id="startDate"
                name="startDate"
                defaultValue={subscription.start_date.split('T')[0]}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                type="date"
                id="endDate"
                name="endDate"
                defaultValue={subscription.end_date.split('T')[0]}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={subscription.status}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="paymentStatus">Payment Status</Label>
              <Select name="paymentStatus" defaultValue={subscription.payment_status}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedPlan && (
              <div>
                <h4 className="font-semibold mt-4">Plan Features:</h4>
                <ul className="list-disc list-inside">
                  {selectedPlan.features.feature.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}
            <Button type="submit">Update Subscription</Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

