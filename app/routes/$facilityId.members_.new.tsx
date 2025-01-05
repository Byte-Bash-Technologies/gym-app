// app/routes/$facilityId.members.new.tsx
import { useState } from "react";
import {
  json,
  useActionData,
  redirect,
  useLoaderData,
  useParams,
} from "@remix-run/react";
import { type ActionFunction, type LoaderFunction } from "@remix-run/node";
import { supabase } from "~/utils/supabase.server";
import { ArrowLeft, Bell, Phone, Settings, ImagePlus } from 'lucide-react';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Textarea } from "~/components/ui/textarea";
import { Switch } from "~/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface Plan {
  id: string;
  name: string;
  price: number;
  duration: number;
}

export const loader: LoaderFunction = async ({ params }) => {
  const { data: facility } = await supabase
    .from("facilities")
    .select("name")
    .eq("id", params.facilityId)
    .single();

  const { data: plans } = await supabase
    .from("plans")
    .select("*")
    .or(`facility_id.is.null,facility_id.eq.${params.facilityId}`)
    .order("price");

  return json({ facilityName: facility?.name, plans });
};

export const action: ActionFunction = async ({ request, params }) => {
  const formData = await request.formData();
  const full_name = formData.get("full_name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const gender = formData.get("gender") as string;
  const date_of_birth = formData.get("date_of_birth") as string;
  const blood_type = formData.get("blood_type") as string;
  const height = formData.get("height")
    ? parseInt(formData.get("height") as string, 10)
    : null;
  const weight = formData.get("weight")
    ? parseInt(formData.get("weight") as string, 10)
    : null;
  const address = formData.get("address") as string;
  const photo = formData.get("photo") as File;
  const plan_id = formData.get("plan_id") as string;
  const payment_amount = parseFloat(formData.get("payment_amount") as string);
  const discount = parseFloat(formData.get("discount") as string) || 0;

  // Generate admission number
  const facilityPrefix = (params.facilityId as string)
    .substring(0, 2)
    .toUpperCase();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const admission_no = `${facilityPrefix}-${randomNum}`;
  let photoUrl = null;
  let transactionID;

  // Upload photo to Supabase storage if provided
  if (photo.size > 0) {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("member-photos")
      .upload(`Avatars/${admission_no}.jpg`, photo, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading photo:", uploadError.message);
      return json({ error: uploadError.message }, { status: 400 });
    }

    photoUrl = supabase.storage
      .from("member-photos")
      .getPublicUrl(`Avatars/${admission_no}.jpg`).data.publicUrl;
  }

  // If a plan is selected, create a membership and process payment
  if (plan_id) {
    const { data: planData } = await supabase
      .from("plans")
      .select("price,duration")
      .eq("id", plan_id)
      .single();

    const planPrice = planData?.price || 0;
    const discountedPrice = planPrice - discount;
    const balance = discountedPrice - payment_amount;

    // Insert member data
    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .insert([
        {
          full_name,
          email,
          phone,
          gender,
          date_of_birth,
          blood_type,
          height,
          weight,
          facility_id: params.facilityId,
          admission_no,
          status: "active",
          address,
          balance,
          photo_url: photoUrl,
        },
      ])
      .select();

    if (memberError) {
      return json({ error: memberError.message }, { status: 400 });
    }

    const duration = planData?.duration || 0;
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + duration);

    // Create membership
    const { error: membershipError } = await supabase
      .from("memberships")
      .insert([
        {
          member_id: memberData[0].id,
          plan_id,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          status: "active",
          price: planPrice,
          discount,
          payment_amount,
          facility_id: params.facilityId,
        },
      ]);

    if (membershipError) {
      return json({ error: membershipError.message }, { status: 400 });
    }

    // Get the latest membership ID
    const { data: membershipData } = await supabase
      .from("memberships")
      .select("id")
      .eq("facility_id", params.facilityId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Create transaction record
    const { error: transactionError } = await supabase
      .from("transactions")
      .insert([
        {
          member_id: memberData[0].id,
          membership_id: membershipData?.id,
          amount: payment_amount,
          facility_id: params.facilityId,
          type: "payment",
          payment_method: "cash",
          status: "completed",
        },
      ]);

    if (transactionError) {
      return json({ error: transactionError.message }, { status: 400 });
    }

    // Get the latest transaction ID
    const { data: transactionData } = await supabase
      .from("transactions")
      .select("id")
      .eq("facility_id", params.facilityId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    transactionID = transactionData?.id;
  } else {
    // Insert member without plan
    const { error: memberError } = await supabase
      .from("members")
      .insert([
        {
          full_name,
          email,
          phone,
          gender,
          date_of_birth,
          blood_type,
          height,
          weight,
          facility_id: params.facilityId,
          admission_no,
          status: "active",
          address,
          balance: 0,
          photo_url: photoUrl,
        },
      ]);

    if (memberError) {
      return json({ error: memberError.message }, { status: 400 });
    }
  }

  // Send WhatsApp message if phone number is provided
  if (phone.length === 10) {
    const message = `Welcome to our gym, ${full_name}! ${
      plan_id ? "Your membership plan has been activated." : ""
    } Download your membership details here: https://${process.env.APP_URL}/invoice/${
      transactionID || ""
    }`;
    const whatsappLink = `https://wa.me/91${phone}?text=${encodeURIComponent(
      message
    )}`;
    return redirect(whatsappLink);
  }

  return redirect(`/${params.facilityId}/members`);
};

export default function NewMemberForm() {
  const { facilityName, plans } = useLoaderData<typeof loader>();
  const actionData = useActionData();
  const [formError, setFormError] = useState<string | null>(null);
  const [addPlan, setAddPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const params = useParams();
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!event.currentTarget.checkValidity()) {
      event.preventDefault();
      setFormError("Please fill out all required fields.");
    } else {
      setFormError(null);
    }
  };

  const handlePlanChange = (planId: string) => {
    const plan = plans.find((p: Plan) => p.id === planId);
    setSelectedPlan(plan || null);
    setPaymentAmount(plan?.price || 0);
  };

  return (
    <div className="min-h-screen bg-background dark:bg-[#212237] pb-20">
      <header className="bg-card dark:bg-[#4A4A62] text-card-foreground p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">New member</h1>
        </div>
        <div className="flex items-center gap-4">
          <a href="tel:7010976271">
            <Phone className="h-6 w-6 text-[#8e76af]" />
          </a>
          <a href={`/${params.facilityId}/settings`}>
            <Settings className="h-6 w-6 text-[#8e76af]" />
          </a>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        method="post"
        className="p-4 space-y-6"
        encType="multipart/form-data"
      >
        {formError && (
          <p className="text-destructive">{formError}</p>
        )}
        {actionData?.error && (
          <p className="text-destructive">{actionData.error}</p>
        )}

        <div className="space-y-2">
          <Label htmlFor="full_name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input id="full_name" name="full_name" className="dark:bg-[#4A4A62]" placeholder="Name" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            className="dark:bg-[#4A4A62]"
            type="email"
            placeholder="example@gmail.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">
            Mobile <span className="text-destructive">*</span>
          </Label>
          <Input
            id="phone"
            name="phone"
            className="dark:bg-[#4A4A62]"
            placeholder="+91 XX XX X X X"
            required
            pattern="[0-9]{10}"
            title="Please enter a 10-digit phone number"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            name="address"
            className="dark:bg-[#4A4A62]"
            placeholder="Enter your address"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date_of_birth">
            Date of Birth <span className="text-destructive">*</span>
          </Label>
          <Input
            type="date"
            id="date_of_birth"
            className="dark:bg-[#4A4A62]"
            name="date_of_birth"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Gender</Label>
          <RadioGroup defaultValue="male" name="gender" className="flex gap-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="male" id="male" />
              <Label htmlFor="male" className="bg-secondary px-4 py-2 rounded-full dark:bg-[#4A4A62]">
                Male
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="female" id="female" />
              <Label htmlFor="female" className="bg-secondary px-4 py-2 rounded-full dark:bg-[#4A4A62]">
                Female
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label>Blood group</Label>
          <Select name="blood_type">
            <SelectTrigger className="dark:bg-[#4A4A62]">
              <SelectValue placeholder="Please select" />
            </SelectTrigger>
            <SelectContent className="dark:bg-[#4A4A62]">
              <SelectItem value="A+">A+</SelectItem>
              <SelectItem value="A-">A-</SelectItem>
              <SelectItem value="B+">B+</SelectItem>
              <SelectItem value="B-">B-</SelectItem>
              <SelectItem value="O+">O+</SelectItem>
              <SelectItem value="O-">O-</SelectItem>
              <SelectItem value="AB+">AB+</SelectItem>
              <SelectItem value="AB-">AB-</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="height">Height</Label>
          <Input id="height" name="height" className="dark:bg-[#4A4A62]" placeholder="-- cm" type="number" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="weight">Weight</Label>
          <Input id="weight" name="weight" className="dark:bg-[#4A4A62]" placeholder="-- kg" type="number" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="photo">Photo</Label>
          <label htmlFor="photo" className="block">
            <Input
              id="photo"
              name="photo"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="border-2 dark:bg-[#4A4A62] border-dashed border-input rounded-lg p-4 text-center cursor-pointer flex flex-col items-center">
              {preview ? (
                <img
                  src={preview}
                  alt="Selected"
                  className="h-32 w-32 object-cover rounded-full mb-2"
                />
              ) : (
                <>
                  <ImagePlus className="h-8 w-8 mb-2" />
                  <span>Upload photo</span>
                </>
              )}
            </div>
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="add-plan"
            className="dark:bg-[#4A4A62]"
            checked={addPlan}
            onCheckedChange={setAddPlan}
          />
          <Label htmlFor="add-plan">Add Membership Plan</Label>
        </div>

        {addPlan && (
          <>
            <div className="space-y-2">
              <Label htmlFor="plan_id">Membership Plan</Label>
              <Select name="plan_id" onValueChange={handlePlanChange}>
                <SelectTrigger className="dark:bg-[#4A4A62]">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent className="dark:bg-[#4A4A62]">
                  {plans.map((plan: Plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - ₹{plan.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPlan && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="discount">Discount</Label>
                  <Input
                    id="discount"
                    name="discount"
                    className="dark:bg-[#4A4A62]"
                    type="number"
                    min="0"
                    max={selectedPlan.price}
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_amount">Payment Amount</Label>
                  <Input
                    id="payment_amount"
                    name="payment_amount"
                    className="dark:bg-[#4A4A62]"
                    type="number"
                    min="0"
                    max={selectedPlan.price - discount}
                    value={Math.min(paymentAmount, selectedPlan.price - discount)}
                    onChange={(e) =>
                      setPaymentAmount(
                        Math.min(
                          parseFloat(e.target.value) || 0,
                          selectedPlan.price - discount
                        )
                      )
                    }
                  />
                </div>

                <div className="space-y-1 text-sm">
                  <p>Total: ₹{selectedPlan.price}</p>
                  <p>Discount: ₹{discount}</p>
                  <p>
                    Balance: ₹
                    {selectedPlan.price - discount - paymentAmount}
                  </p>
                </div>
              </>
            )}
          </>
        )}

        <Button
          type="submit"
          className="w-full bg-[#8e76af] hover:bg-[#8e76af]/90 dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]/90 text-white py-6 rounded-full text-lg"
        >
          Add member
        </Button>
      </form>
    </div>
  );
}

