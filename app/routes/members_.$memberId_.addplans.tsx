import { json, type LoaderFunction, type ActionFunction } from "@remix-run/node";
import { useLoaderData, useActionData, Form } from "@remix-run/react";
import { useState } from "react";
import { ArrowLeft, Bell, Phone, Settings } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card"
import { Label } from "~/components/ui/label"
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group"
import { toast } from "~/hooks/use-toast"

interface Plan {
  id: string;
  name: string;
  price: number;
  duration: string;
  features: string[];
}

interface LoaderData {
  currentPlan: Plan;
  availablePlans: Plan[];
}

export const loader: LoaderFunction = async () => {
  // Mock data - in a real app, this would come from a database or API
  const currentPlan: Plan = {
    id: "basic",
    name: "Basic Plan",
    price: 29.99,
    duration: "1 month",
    features: ["Access to gym equipment", "Locker room access"]
  };

  const availablePlans: Plan[] = [
    currentPlan,
    {
      id: "standard",
      name: "Standard Plan",
      price: 49.99,
      duration: "1 month",
      features: ["Access to gym equipment", "Locker room access", "Group fitness classes"]
    },
    {
      id: "premium",
      name: "Premium Plan",
      price: 79.99,
      duration: "1 month",
      features: ["Access to gym equipment", "Locker room access", "Group fitness classes", "Personal trainer sessions"]
    }
  ];

  return json({ currentPlan, availablePlans });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const newPlanId = formData.get("planId");

  // Mock changing the plan - in a real app, this would update a database or call an API
  return json({ success: true, message: `Plan changed to ${newPlanId}` });
};

export default function ChangePlan() {
  const { currentPlan, availablePlans } = useLoaderData<LoaderData>();
  const actionData = useActionData();
  const [selectedPlan, setSelectedPlan] = useState(currentPlan.id);

  if (actionData?.success) {
    toast({
      title: "Plan Changed",
      description: actionData.message,
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          <ArrowLeft className="h-6 w-6 mr-2" />
          <h1 className="text-xl font-bold">Change Plan</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Bell className="h-6 w-6 text-purple-500" />
          <Phone className="h-6 w-6 text-purple-500" />
          <Settings className="h-6 w-6 text-purple-500" />
        </div>
      </header>

      <main className="container mx-auto p-4">
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Your Current Plan</CardTitle>
            <CardDescription>Review and change your membership plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Current Plan: {currentPlan.name}</h2>
              <p className="text-gray-600">${currentPlan.price} / {currentPlan.duration}</p>
            </div>

            <Form method="post">
              <RadioGroup defaultValue={currentPlan.id} onValueChange={setSelectedPlan} name="planId">
                {availablePlans.map((plan) => (
                  <div key={plan.id} className="flex items-center space-x-2 mb-4">
                    <RadioGroupItem value={plan.id} id={plan.id} />
                    <Label htmlFor={plan.id} className="flex-grow">
                      <Card className={`cursor-pointer ${selectedPlan === plan.id ? 'border-purple-500' : ''}`}>
                        <CardHeader>
                          <CardTitle>{plan.name}</CardTitle>
                          <CardDescription>${plan.price} / {plan.duration}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc pl-5">
                            {plan.features.map((feature, index) => (
                              <li key={index}>{feature}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              <Button type="submit" className="w-full mt-4">Change Plan</Button>
            </Form>
          </CardContent>
          <CardFooter className="text-sm text-gray-500">
            Note: Plan changes will take effect at the start of your next billing cycle.
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}