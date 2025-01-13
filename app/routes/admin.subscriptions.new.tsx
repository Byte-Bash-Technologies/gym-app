import { useState } from 'react';
import { json, ActionFunction, redirect } from "@remix-run/node";
import { useActionData, Form } from "@remix-run/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from "~/utils/supabase.server";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const price = parseFloat(formData.get('price') as string);
  const duration_days = parseInt(formData.get('duration_days') as string, 10);
  // const features = formData.get('features') as string;

  // const featuresArray = features.split(',').map(feature => feature.trim());

  const { error } = await supabase
    .from('subscription_plans')
    .insert({
      name,
      description,
      price,
      duration_days,
      // features: { feature: featuresArray }
    });

  if (error) {
    return json({ error: error.message });
  }

  return redirect('/admin/subscriptions/index');
};

export default function NewSubscriptionPlan() {
  const actionData = useActionData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Create New Subscription Plan</h3>

      <Card>
        <CardHeader>
          <CardTitle>New Subscription Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" onSubmit={() => setIsSubmitting(true)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input id="price" name="price" type="number" step="0.01" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration_days">Duration (days)</Label>
              <Input id="duration_days" name="duration_days" type="number" required />
            </div>
            {/* <div className="space-y-2">
              <Label htmlFor="features">Features (comma-separated)</Label>
              <Input id="features" name="features" required />
            </div> */}
            {actionData?.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{actionData.error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="bg-[#886fa6] hover:bg-[#886fa6]/90 dark:bg-[#3A3A52] hover:dark:bg-[#3A3A52]/90 dark:text-white" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Plan...
                </>
              ) : (
                'Create Plan'
              )}
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}