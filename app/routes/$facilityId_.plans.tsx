import {
  json,
  redirect,
  type LoaderFunction,
  type ActionFunction,
} from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigate, Link, useParams } from "@remix-run/react";
import { useState, useTransition, useEffect } from "react";
import { supabase } from "~/utils/supabase.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { toast } from "~/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string;
}

export const loader: LoaderFunction = async ({params}) => {
  const { facilityId } = params;
  const { data: plans, error } = await supabase
    .from("plans")
    .select("*")
    .or(`facility_id.is.null,facility_id.eq.${facilityId}`)
    .order("name");

  if (error) {
    console.error("Error fetching plans:", error);
    return json({ plans: [] });
  }

  return json({ plans });
};

export const action: ActionFunction = async ({ request, params }) => {
  const {facilityId} = params;
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
          .from("plans")
          .insert([{ name, duration, price, description, facility_id: facilityId }]);

        if (error)
          return json({ error: "Failed to create plan" }, { status: 400 });
      } else {
        const id = formData.get("id") as string;
        const { error } = await supabase
          .from("plans")
          .update({ name, duration, price, description, facility_id: params.facilityId })
          .eq("id", id);

        if (error)
          return json({ error: "Failed to update plan" }, { status: 400 });
      }
      break;
    }
    case "delete": {
      const id = formData.get("id") as string;
      const { error } = await supabase.from("plans").delete().eq("id", id);

      if (error)
        return json({ error: "Failed to delete plan" }, { status: 400 });
      break;
    }
    default:
      return json({ error: "Invalid action" }, { status: 400 });
  }

  return redirect(`/${facilityId}/plans`);
};

export default function Plans() {
  const { plans, facilityId } = useLoaderData<{ plans: Plan[], facilityId: string }>();
  const actionData = useActionData();
  const transition = useTransition();
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();
  const params = useParams();

  useEffect(() => {
    if (transition.state === "loading" && actionData?.error === undefined) {
      setIsDialogOpen(false);
    }
  }, [transition.state, actionData]);

  if (actionData?.error) {
    toast({
      title: "Error",
      description: actionData.error,
      variant: "destructive",
    });
  }

  return (
    <div className="space-y-4 p-4 bg-[#f0ebff] dark:bg-[#212237]">
      <div className="flex justify-between items-center">
      <Link to={`/${params.facilityId}/settings`} className="flex items-center space-x-2">
        <ArrowLeft className="h-6 w-6 cursor-pointer" />
      </Link>
      <h2 className="text-2xl font-bold">Plans</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#886fa6] hover:bg-[#886fa6]/90 dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]/90 text-white">Add New Plan</Button>
          </DialogTrigger>
          <DialogContent className="dark:bg-[#212237]">
            <DialogHeader>
              <DialogTitle>Add New Plan</DialogTitle>
            </DialogHeader>
            <PlanForm onSuccess={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto ">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-800 font-bold">{plan.duration} days</p>
              <p className="text-2xl font-bold mt-2">₹{plan.price}</p>
              <p className="text-sm text-gray-500 mt-2 font-bold">{plan.description}</p>
              <div className="mt-4 space-x-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="dark:bg-[#3A3A52]"
                      onClick={() => setEditingPlan(plan)}
                    >
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Plan</DialogTitle>
                    </DialogHeader>
                    <PlanForm plan={editingPlan} onSuccess={() => navigate(".", { replace: true })} />
                  </DialogContent>
                </Dialog>
                <Form method="post" style={{ display: "inline" }}>
                  <input type="hidden" name="id" value={plan.id} />
                  <Button
                    variant="outline"
                    size="sm"
                    className="dark:bg-[#3A3A52]"
                    type="submit"
                    name="_action"
                    value="delete"
                    onClick={(e) => {
                      if (
                        !confirm("Are you sure you want to delete this plan?")
                      ) {
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
  );
}

function PlanForm({ plan = null, onSuccess }: { plan?: Plan | null, onSuccess?: () => void }) {
  const transition = useTransition();
  const isSubmitting = transition.state === "submitting";

  return (
    <Form method="post" className="space-y-4" onSubmit={() => {
      if (onSuccess) {
        setTimeout(onSuccess, 0);
      }
    }}>
      <input type="hidden" name="id" value={plan?.id} />
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" className="dark:bg-[#4A4A62]" defaultValue={plan?.name} required />
      </div>
      <div>
        <Label htmlFor="duration">Duration (days)</Label>
        <Input
          id="duration"
          name="duration"
          className="dark:bg-[#4A4A62]"
          type="number"
          defaultValue={plan?.duration}
          required
        />
      </div>
      <div>
        <Label htmlFor="price">Price</Label>
        <Input
          id="price"
          name="price"
          className="dark:bg-[#4A4A62]"
          type="number"
          step="0.01"
          defaultValue={plan?.price}
          required
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          className="dark:bg-[#4A4A62]"
          defaultValue={plan?.description}
        />
      </div>
      <Button
        type="submit"
        name="_action"
        value={plan ? "update" : "create"}
        disabled={isSubmitting}
        className="bg-[#886fa6] hover:bg-[#886fa6]/90 dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]/90 text-white"
      >
        {isSubmitting ? "Saving..." : plan ? "Update Plan" : "Create Plan"}
      </Button>
    </Form>
  );
}