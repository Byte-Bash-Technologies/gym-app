import { json, redirect, type LoaderFunction, type ActionFunction } from "@remix-run/node";
import { useLoaderData, useActionData, Form, Link, useParams } from "@remix-run/react";
import { useState, useEffect } from "react";
import { ArrowLeft, CreditCard } from 'lucide-react'
import { supabase } from "~/utils/supabase.server";
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Switch } from "~/components/ui/switch"
import { toast } from "~/hooks/use-toast"

interface Member {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  admission_no: string;
  joined_date: string;
  gender: string;
  balance: number;
}

interface Plan {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface LoaderData {
  member: Member;
  plans: Plan[];
}

export const loader: LoaderFunction = async ({ params }) => {
  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('*')
    .eq('id', params.memberId)
    .single();

  if (memberError) throw new Response("Member not found", { status: 404 });

  const { data: plans, error: plansError } = await supabase
    .from('plans')
    .select('*')
    .order('price');

  if (plansError) throw new Response("Error fetching plans", { status: 500 });

  return json({ member, plans });
};

export const action: ActionFunction = async ({ request, params }) => {
  const formData = await request.formData();
  const planId = formData.get("planId") as string;
  const paymentMethod = formData.get("paymentMethod") as string;
  const discount = parseFloat(formData.get("discount") as string) || 0;
  const isFullPayment = formData.get("isFullPayment") === "true";
  const paidAmount = parseFloat(formData.get("paidAmount") as string) || 0;

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (planError) return json({ error: "Invalid plan selected" }, { status: 400 });

  const totalAmount = plan.price - discount;
  const amount = isFullPayment ? totalAmount : paidAmount;
  const newBalance = totalAmount - amount;

  if (amount <= 0 || amount > totalAmount) {
    return json({ error: "Invalid payment amount" }, { status: 400 });
  }

  // Fetch current member balance
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('balance')
    .eq('id', params.memberId)
    .single();

  if (memberError) return json({ error: "Failed to fetch member data" }, { status: 500 });

  const currentBalance = memberData.balance || 0;
  const updatedBalance = currentBalance + newBalance;

  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .insert({
      member_id: params.memberId,
      plan_id: planId,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active'
    })
    .select()
    .single();

  if (membershipError) return json({ error: "Failed to create membership" }, { status: 500 });

  const { error: transactionError } = await supabase
    .from('transactions')
    .insert({
      membership_id: membership.id,
      member_id: params.memberId,
      amount,
      facility_id: params.facilityId,
      type: 'payment',
      payment_method: paymentMethod,
      status: 'completed'
    });

  if (transactionError) return json({ error: "Failed to record transaction" }, { status: 500 });

  const { error: memberUpdateError } = await supabase
    .from('members')
    .update({ balance: updatedBalance })
    .eq('id', params.memberId);

  if (memberUpdateError) return json({ error: "Failed to update member balance" }, { status: 500 });

  return redirect(`/${params.facilityId}/members/${params.memberId}`);
};

export default function RenewMembership() {
  const { member, plans } = useLoaderData<LoaderData>();
  const params = useParams();
  const actionData = useActionData();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isFullPayment, setIsFullPayment] = useState(true);
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);

  useEffect(() => {
    if (selectedPlan) {
      setPaidAmount(selectedPlan.price - discount);
    }
  }, [selectedPlan, discount]);

  useEffect(() => {
    if (actionData?.error) {
      toast({
        title: "Error",
        description: actionData.error,
        variant: "destructive",
      });
    }
  }, [actionData]);

  const calculateTotal = () => {
    if (!selectedPlan) return 0;
    return selectedPlan.price - discount;
  };

  const calculateRemaining = () => {
    const total = calculateTotal();
    return isFullPayment ? 0 : Math.max(0, total - paidAmount);
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center">
            <Link to={`/${params.facilityId}/members/${member.id}`}>
              <ArrowLeft className="h-6 w-6 mr-2" />
            </Link>
            Renew Membership
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <h2 className="text-lg font-semibold">{member.full_name}</h2>
            <p className="text-gray-600">{member.email}</p>
            <p className="text-gray-600">{member.phone}</p>
            <p className="text-sm text-gray-500">Admission No: {member.admission_no}</p>
            <p className="text-sm text-gray-500">Joined: {new Date(member.joined_date).toLocaleDateString()}</p>
            <p className="text-sm text-gray-500">Current Balance: ₹{member.balance.toFixed(2)}</p>
          </div>

          <Form method="post" className="space-y-4">
            <div>
              <Label htmlFor="planId">Select Plan</Label>
              <Select 
                name="planId" 
                onValueChange={(value) => setSelectedPlan(plans.find(p => p.id === value) || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - ₹{plan.price} for {plan.duration} days
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="discount">Discount</Label>
              <Input
                id="discount"
                name="discount"
                type="number"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="paymentType"
                checked={isFullPayment}
                onCheckedChange={setIsFullPayment}
              />
              <Label htmlFor="paymentType">Full Payment</Label>
            </div>

            <input type="hidden" name="isFullPayment" value={isFullPayment.toString()} />

            {!isFullPayment && (
              <div>
                <Label htmlFor="paidAmount">Paid Amount</Label>
                <Input
                  id="paidAmount"
                  name="paidAmount"
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  max={calculateTotal()}
                />
              </div>
            )}

            {selectedPlan && (
              <div>
                <p className="font-semibold">Total: ₹{calculateTotal()}</p>
                <p className="text-sm text-gray-500">
                  Remaining balance: ₹{calculateRemaining()}
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select name="paymentMethod" required defaultValue="cash">
              <SelectTrigger>
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

            <Button type="submit" className="w-full">
              <CreditCard className="w-4 h-4 mr-2" />
              Renew Membership
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}