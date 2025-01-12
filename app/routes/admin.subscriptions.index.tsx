import { json, LoaderFunction } from "@remix-run/node";
import { useLoaderData, Link, Form } from "@remix-run/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Pencil, Trash2, Plus } from 'lucide-react';
import { supabase } from "~/utils/supabase.server";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  max_members: number | null;
  // features: { feature: string[] };
}

export const loader: LoaderFunction = async () => {
  const { data: plans, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('price');

  if (error) {
    console.error('Error fetching subscription plans:', error);
    return json({ plans: [] });
  }

  return json({ plans });
};

export default function SubscriptionList() {
  const { plans } = useLoaderData<{ plans: SubscriptionPlan[] }>();

  return (
    <div className="space-y-6 sm:h-full">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Subscription Plans</h3>
        <Link to="/admin/subscriptions/new">
          <Button className="bg-[#886fa6] dark:bg-[#3A3A52] dark:text-white hover:bg-[#886fa6]/90 dark:hover:bg-[#3A3A52]/90">
            <Plus className="mr-2 h-4 w-4" /> Add New Plan
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
                <TableRow className="hover:none">
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Duration</TableHead>
                {/* <TableHead className="hidden md:table-cell">Features</TableHead> */}
                <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{plan.name}</p>
                      <p className="text-sm text-gray-500 hidden md:block">{plan.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>₹{plan.price.toFixed(2)}</TableCell>
                  <TableCell>{plan.duration_days} days</TableCell>
                  {/* <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {plan.features.feature.map((feature, index) => (
                        <Badge key={index} variant="secondary">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </TableCell> */}
                  <TableCell>
                    <div className="flex space-x-2">
                      <Link to={`${plan.id}/edit`}>
                        <Button variant="outline" size="sm" className="dark:bg-[#3A3A52] dark:text-white dark:hover:text-white/90">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                        <Form onSubmit={(e) => {
                        if (!confirm("Are you sure you want to delete this plan?")) {
                          e.preventDefault();
                        }
                        }}>
                        <Button type="submit" variant="outline" size="sm" className="text-destructive hover:text-destructive/90 dark:bg-[#3A3A52] dark:text-white dark:hover:text-white/90">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        </Form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}