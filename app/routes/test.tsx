import { json, redirect, type ActionFunction } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { useState } from "react";
import { ArrowLeft } from 'lucide-react'
import { supabase } from "~/utils/supabase.server";
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { toast } from "~/hooks/use-toast"

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const full_name = formData.get("full_name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const gender = formData.get("gender") as string;
  const date_of_birth = formData.get("date_of_birth") as string;
  const admission_no = formData.get("admission_no") as string;

  const { data, error } = await supabase
    .from('members')
    .insert([
      { full_name, email, phone, gender, date_of_birth, admission_no, status: 'active' }
    ])
    .select();

  if (error) {
    return json({ error: error.message }, { status: 400 });
  }

  return redirect("/members");
};

export default function NewMember() {
  const actionData = useActionData();
  const transition = useNavigation();
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      event.preventDefault();
      setFormError("Please fill out all required fields.");
    } else {
      setFormError(null);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center">
            <ArrowLeft className="h-6 w-6 mr-2" onClick={() => window.history.back()} />
            Add New Member
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" name="full_name" required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" required />
            </div>
            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select name="gender" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input id="date_of_birth" name="date_of_birth" type="date" required />
            </div>
            <div>
              <Label htmlFor="admission_no">Admission Number</Label>
              <Input id="admission_no" name="admission_no" required />
            </div>
            {formError && <p className="text-red-500">{formError}</p>}
            {actionData?.error && <p className="text-red-500">{actionData.error}</p>}
            <Button type="submit" className="w-full" disabled={transition.state === "submitting"}>
              {transition.state === "submitting" ? "Adding..." : "Add Member"}
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}