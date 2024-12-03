import { json, LoaderFunction, ActionFunction, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form } from "@remix-run/react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { supabase } from "~/utils/supabase.server";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  features: { feature: string[] };
}

export const loader: LoaderFunction = async ({ params }) => {
  const { data: plan, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', params.planId)
    .single();

  if (error) {
    console.error('Error fetching subscription plan:', error);
    throw new Response("Not Found", { status: 404 });
  }

  return json({ plan });
};

export const action: ActionFunction = async ({ request, params }) => {
  const formData = await request.formData();
  const updates = Object.fromEntries(formData);

  // Convert price and duration_days to numbers
  updates.price = parseFloat(updates.price as string);
  updates.duration_days = parseInt(updates.duration_days as string);
  
  // Convert features string to array
  updates.features = { feature: (updates.features as string).split(',').map(f => f.trim()) };

  const { error } = await supabase
    .from('subscription_plans')
    .update(updates)
    .eq('id', params.planId);

  if (error) {
    console.error('Error updating subscription plan:', error);
    return json({ error: 'Failed to update plan' });
  }

  return redirect('/admin/subscriptions');
};

export default function EditSubscriptionPlan() {
  const { plan } = useLoaderData<{ plan: SubscriptionPlan }>();
  const actionData = useActionData();
  const [features, setFeatures] = useState(plan.features.feature.join(', '));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit Subscription Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input type="text" id="name" name="name" defaultValue={plan.name} required />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" defaultValue={plan.description} required />
            </div>
            <div>
              <Label htmlFor="price">Price (₹)</Label>
              <Input type="number" id="price" name="price" defaultValue={plan.price} step="0.01" required />
            </div>
            <div>
              <Label htmlFor="duration_days">Duration (days)</Label>
              <Input type="number" id="duration_days" name="duration_days" defaultValue={plan.duration_days} required />
            </div>
            <div>
              <Label htmlFor="features">Features (comma-separated)</Label>
              <Input 
                type="text" 
                id="features" 
                name="features" 
                value={features} 
                onChange={(e) => setFeatures(e.target.value)}
                required 
              />
            </div>
            <Button type="submit">Update Plan</Button>
          </Form>
          {actionData?.error && (
            <p className="text-red-500 mt-4">{actionData.error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}