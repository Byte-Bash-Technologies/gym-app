import { json, LoaderFunction } from '@remix-run/node';
import { useLoaderData, Form } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { supabase } from '~/utils/supabase.server';
import { Button } from '~/components/ui/button';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { Label } from '~/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '~/components/ui/card';

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const facilityId = url.searchParams.get('facilityId');

  if (!facilityId) {
    return json({ error: 'Facility ID is required' }, { status: 400 });
  }

  const { data: currentSubscription, error } = await supabase
    .from('facility_subscriptions')
    .select('plan')
    .eq('facility_id', facilityId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching current subscription:', error);
    return json({ currentPlan: null, facilityId });
  }

  return json({ currentPlan: currentSubscription?.plan, facilityId });
};

const plans = [
  { id: 'bronze', name: 'Bronze', price: '₹499', duration: '30 days' },
  { id: 'silver', name: 'Silver', price: '₹1299', duration: '90 days' },
  { id: 'gold', name: 'Gold', price: '₹2499', duration: '180 days' },
  { id: 'platinum', name: 'Platinum', price: '₹3499', duration: '270 days' },
  { id: 'diamond', name: 'Diamond', price: '₹4499', duration: '365 days' },
];

export default function RenewSubscription() {
  const { currentPlan, facilityId } = useLoaderData<typeof loader>();
  const [selectedPlan, setSelectedPlan] = useState(currentPlan || 'bronze');

  useEffect(() => {
    if (currentPlan) {
      setSelectedPlan(currentPlan);
    }
  }, [currentPlan]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = `I want to renew my subscription for the ${selectedPlan} plan for facility ID: https://${process.env.APP_URL}/facilities/${facilityId}`;
    const whatsappUrl = `https://wa.me/917010976271?text=${encodeURIComponent(message)}`;
    window.location.href = whatsappUrl;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Renew Subscription</h1>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select a Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <Form onSubmit={handleSubmit} className="space-y-6">
            <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan} className="space-y-2">
              {plans.map((plan) => (
                <div key={plan.id} className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-gray-50">
                  <RadioGroupItem value={plan.id} id={plan.id} />
                  <Label htmlFor={plan.id} className="flex justify-between w-full cursor-pointer">
                    <span className="font-medium">{plan.name}</span>
                    <span className="text-gray-600">
                      {plan.price}
                      <span className="text-xs text-gray-400"> / {plan.duration}</span>
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <Button type="submit" className="w-full">
              Renew Subscription
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}