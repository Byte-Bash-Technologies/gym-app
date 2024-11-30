import { json, LoaderFunction } from '@remix-run/node';
import { useLoaderData, Form } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { supabase } from '~/utils/supabase.server';
import { Button } from '~/components/ui/button';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { Label } from '~/components/ui/label';

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
  { id: 'basic', name: 'Basic Plan', price: '₹999/month' },
  { id: 'standard', name: 'Standard Plan', price: '₹1,999/month' },
  { id: 'premium', name: 'Premium Plan', price: '₹2,999/month' },
];

export default function RenewSubscription() {
  const { currentPlan, facilityId } = useLoaderData<typeof loader>();
  const [selectedPlan, setSelectedPlan] = useState(currentPlan || 'basic');

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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Renew Subscription</h1>
      <Form onSubmit={handleSubmit} className="space-y-6">
        <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan}>
          {plans.map((plan) => (
            <div key={plan.id} className="flex items-center space-x-2">
              <RadioGroupItem value={plan.id} id={plan.id} />
              <Label htmlFor={plan.id} className="flex justify-between w-full">
                <span>{plan.name}</span>
                <span>{plan.price}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
        <Button type="submit" className="w-full">
          Renew Subscription
        </Button>
      </Form>
    </div>
  );
}

