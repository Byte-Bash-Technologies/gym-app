import { json, type LoaderFunction, type ActionFunction } from "@remix-run/node";
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
    .or(`facility_id.is.null,facility_id.eq.${params.facilityId}`)
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
  const startDate = new Date(formData.get("startDate") as string);

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
    .select('balance, phone,full_name')
    .eq('id', params.memberId)
    .single();

  if (memberError) return json({ error: "Failed to fetch member data" }, { status: 500 });

  const currentBalance = memberData.balance || 0;
  const updatedBalance = currentBalance + newBalance;

  const { error: updateMembershipsError } = await supabase
    .from('memberships')
    .update({ status: 'active' })
    .eq('member_id', params.memberId)
    .neq('status', 'active');

  if (updateMembershipsError) return json({ error: "Failed to update existing memberships" }, { status: 500 });

  const { error: disableMembershipsError } = await supabase
    .from('memberships')
    .update({ is_disabled: true })
    .eq('member_id', params.memberId)
    .eq('status', 'active');

  if (disableMembershipsError) return json({ error: "Failed to disable existing memberships" }, { status: 500 });

  
  
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .insert({
      member_id: params.memberId,
      plan_id: planId,
      start_date: startDate.toISOString(),
      end_date: new Date(startDate.getTime() + plan.duration * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active'
    })
    .select()
    .single();

  if (membershipError) return json({ error: "Failed to create membership" }, { status: 500 });

  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .insert({
      membership_id: membership.id,
      member_id: params.memberId,
      amount,
      facility_id: params.facilityId,
      type: 'payment',
      payment_method: paymentMethod,
      status: 'completed'
    })
    .select()
    .single();

  if (transactionError) return json({ error: "Failed to record transaction" }, { status: 500 });

  const { error: memberUpdateError } = await supabase
    .from('members')
    .update({ balance: updatedBalance })
    .eq('id', params.memberId);

  if (memberUpdateError) return json({ error: "Failed to update member balance" }, { status: 500 });

  // Send WhatsApp message
  const message = `Dear ${memberData.full_name}, your membership has been successfully renewed. You can view your invoice at ${process.env.APP_URL}/invoice/${transaction.id}`;
  const whatsappUrl=`https://api.whatsapp.com/send?phone=91${memberData.phone}&text=${encodeURIComponent(message)}`;

  return json({ whatsappUrl, redirectUrl: `/${params.facilityId}/members/${params.memberId}` });
};

export default function RenewMembership() {
  const { member, plans } = useLoaderData<LoaderData>();
  const params = useParams();
  const actionData = useActionData();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isFullPayment, setIsFullPayment] = useState(true);
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

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
      setIsLoading(false);
    }
    if (actionData?.whatsappUrl) {
      window.open(actionData.whatsappUrl, '_blank');
      window.location.href = actionData.redirectUrl;
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
      <Card className="bg-card dark:bg-[#212237] text-card-foreground">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center">
            <Link to={`/${params.facilityId}/members/${member.id}`} className="text-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-6 w-6 mr-2" />
            </Link>
            Renew Membership
          </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">{member.full_name}</h2>
            <p className="text-muted-foreground">{member.email}</p>
            <p className="text-muted-foreground">{member.phone}</p>
            <p className="text-sm text-muted-foreground">Admission No: {member.admission_no}</p>
            <p className="text-sm text-muted-foreground">Joined: {new Date(member.joined_date).toLocaleDateString()}</p>
            <p className="text-sm text-muted-foreground">Current Balance: ₹{(member.balance || 0).toFixed(2)}</p>
            </div>

          <Form method="post" onSubmit={() => setIsLoading(true)} className="space-y-4">
            <div>
              <Label htmlFor="planId" className="text-foreground">Select Plan</Label>
              <Select 
                name="planId" 
                onValueChange={(value) => setSelectedPlan(plans.find(p => p.id === value) || null)}
              >
                <SelectTrigger className="bg-background text-foreground dark:bg-[#4A4A62]">
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent className="dark:bg-[#4A4A62]">
                  {plans.map((plan) => (
                    <SelectItem className="dark:focus:bg-[#3A3A52]/90 dark:hover:bg-[#3A3A52]/90" key={plan.id} value={plan.id}>
                      {plan.name} - ₹{plan.price} for {plan.duration} days
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Plan Start Date</Label>
              <Input
                type="date"
                id="startDate"
                name="startDate"
                className="dark:bg-[#4A4A62]"
                required
              />
            </div>
            <div>
              <Label htmlFor="discount" className="text-foreground">Discount</Label>
              <Input
                id="discount"
                name="discount"
                type="number"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value))}
                className="bg-background text-foreground dark:bg-[#4A4A62]"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="paymentType"
                className="dark:bg-[#4A4A62]"
                checked={isFullPayment}
                onCheckedChange={setIsFullPayment}
              />
              <Label htmlFor="paymentType" className="text-foreground">Full Payment</Label>
            </div>

            <input type="hidden" name="isFullPayment" value={isFullPayment.toString()} />

            {!isFullPayment && (
              <div>
                <Label htmlFor="paidAmount" className="text-foreground">Paid Amount</Label>
                <Input
                  id="paidAmount"
                  name="paidAmount"
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value))}
                  max={calculateTotal()}
                  className="bg-background text-foreground dark:bg-[#4A4A62]"
                />
              </div>
            )}

            {selectedPlan && (
              <div>
                <p className="font-semibold text-foreground">Total: ₹{calculateTotal()}</p>
                <p className="text-sm text-muted-foreground">
                  Remaining balance: ₹{calculateRemaining()}
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="paymentMethod" className="text-foreground">Payment Method</Label>
              <Select name="paymentMethod" required defaultValue="cash">
                <SelectTrigger className="bg-background text-foreground dark:bg-[#4A4A62]">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent className="dark:bg-[#4A4A62]">
                  <SelectItem className="dark:focus:bg-[#3A3A52]/90 dark:hover:bg-[#3A3A52]/90" value="cash">Cash</SelectItem>
                  <SelectItem className="dark:focus:bg-[#3A3A52]/90 dark:hover:bg-[#3A3A52]/90" value="credit_card">Credit Card</SelectItem>
                  <SelectItem className="dark:focus:bg-[#3A3A52]/90 dark:hover:bg-[#3A3A52]/90" value="debit_card">Debit Card</SelectItem>
                  <SelectItem className="dark:focus:bg-[#3A3A52]/90 dark:hover:bg-[#3A3A52]/90" value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full text-primary-foreground bg-[#886fa6] hover:bg-[#886fa6]/90 dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]/90 text-white"
            disabled={isLoading}>
              <CreditCard className="w-4 h-4 mr-2" />
              "{isLoading ? "Renewing Membership..." : "Renew Membership"}
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}