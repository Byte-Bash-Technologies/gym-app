import { useState } from 'react';
import { json, redirect, type ActionFunction } from "@remix-run/node";
import { useActionData, Form, useNavigate, useParams } from "@remix-run/react";
import { X } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group"
import { SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "~/components/ui/sheet"
import { toast } from "~/hooks/use-toast"

export const action: ActionFunction = async ({ request, params }) => {
  const formData = await request.formData();
  const paymentType = formData.get("paymentType");
  const amount = formData.get("amount");

  // Here you would typically process the payment
  // For now, we'll just simulate a successful payment

  // After successful payment, redirect back to the member profile
  return redirect(`/members/${params.memberId}`);
};

export default function PaymentDrawer() {
  const [paymentType, setPaymentType] = useState("full");
  const [amount, setAmount] = useState("1500");
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const params = useParams();

  const handleClose = () => {
    navigate(`/members/${params.memberId}`);
  };

  return (
    <SheetContent>
      <SheetHeader>
        <SheetTitle>Pay Balance</SheetTitle>
        <SheetDescription>
          Make a payment towards your outstanding balance.
        </SheetDescription>
      </SheetHeader>
      <Form method="post" className="space-y-4 mt-4">
        <RadioGroup defaultValue="full" onValueChange={(value) => setPaymentType(value)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="full" id="full" />
            <Label htmlFor="full">Full Payment</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="partial" id="partial" />
            <Label htmlFor="partial">Partial Payment</Label>
          </div>
        </RadioGroup>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={paymentType === "full"}
          />
        </div>

        <input type="hidden" name="paymentType" value={paymentType} />

        <SheetFooter>
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          <Button type="submit">Pay Now</Button>
        </SheetFooter>
      </Form>
    </SheetContent>
  );
}