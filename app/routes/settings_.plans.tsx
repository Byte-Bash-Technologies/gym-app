import { json, redirect, type LoaderFunction, type ActionFunction } from "@remix-run/node";
import { useLoaderData, useActionData, Form} from "@remix-run/react";
import { useState,useTransition } from "react";
import { supabase } from "~/utils/supabase.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import { toast } from "~/hooks/use-toast"

interface Plan {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string;
}

export const loader: LoaderFunction = async () => {
  const { data: plans, error } = await supabase
    .from('plans')
    .select('*')
    .order('name');

  if (error) {
    console.error("Error fetching plans:", error);
    return json({ plans: [] });
  }

  return json({ plans });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const action = formData.get("_action");

  switch (action) {
    case "create":
    case "update": {
      const name = formData.get("name") as string;
      const duration = parseInt(formData.get("duration") as string);
      const price = parseFloat(formData.get("price") as string);
      const description = formData.get("description") as string;

      if (action === "create") {
        const { error } = await supabase
          .from('plans')
          .insert([{ name, duration, price, description }]);

        if (error) return json({ error: "Failed to create plan" }, { status: 400 });
      } else {
        const id = formData.get("id") as string;
        const { error } = await supabase
          .from('plans')
          .update({ name, duration, price, description })
          .eq('id', id);

        if (error) return json({ error: "Failed to update plan" }, { status: 400 });
      }
      break;
    }
    case "delete": {
      const id = formData.get("id") as string;
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', id);

      if (error) return json({ error: "Failed to delete plan" }, { status: 400 });
      break;
    }
    default:
      return json({ error: "Invalid action" }, { status: 400 });
  }

  return redirect("/settings/plans");
};

export default function Plans() {
  const { plans } = useLoaderData<{ plans: Plan[] }>();
  const actionData = useActionData();
  const transition = useTransition();
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  if (actionData?.error) {
    toast({
      title: "Error",
      description: actionData.error,
      variant: "destructive",
    });
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Plans</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Add New Plan</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Plan</DialogTitle>
            </DialogHeader>
            <PlanForm />
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{plan.duration} days</p>
              <p className="text-2xl font-bold mt-2">₹{plan.price}</p>
              <p className="text-sm text-gray-500 mt-2">{plan.description}</p>
              <div className="mt-4 space-x-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setEditingPlan(plan)}>Edit</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Plan</DialogTitle>
                    </DialogHeader>
                    <PlanForm plan={editingPlan} />
                  </DialogContent>
                </Dialog>
                <Form method="post" style={{ display: 'inline' }}>
                  <input type="hidden" name="id" value={plan.id} />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    type="submit" 
                    name="_action" 
                    value="delete"
                    onClick={(e) => {
                      if (!confirm("Are you sure you want to delete this plan?")) {
                        e.preventDefault();
                      }
                    }}
                  >
                    Delete
                  </Button>
                </Form>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function PlanForm({ plan = null }: { plan?: Plan | null }) {
  const transition = useTransition();
  const isSubmitting = transition.state === "submitting";

  return (
    <Form method="post" className="space-y-4">
      <input type="hidden" name="id" value={plan?.id} />
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={plan?.name} required />
      </div>
      <div>
        <Label htmlFor="duration">Duration (days)</Label>
        <Input id="duration" name="duration" type="number" defaultValue={plan?.duration} required />
      </div>
      <div>
        <Label htmlFor="price">Price</Label>
        <Input id="price" name="price" type="number" step="0.01" defaultValue={plan?.price} required />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" defaultValue={plan?.description} />
      </div>
      <Button 
        type="submit" 
        name="_action" 
        value={plan ? "update" : "create"}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving..." : (plan ? "Update Plan" : "Create Plan")}
      </Button>
    </Form>
  );
}