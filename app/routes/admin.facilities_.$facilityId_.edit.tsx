import { json, LoaderFunction, ActionFunction, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form } from "@remix-run/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { supabase } from "~/utils/supabase.server";
import { useState } from "react";
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";

interface Facility {
  id: string;
  name: string;
  type: string;
  logo_url: string;
  status: 'active' | 'inactive';
  member_count: number;
}

export const loader: LoaderFunction = async ({ params }) => {
  const { facilityId } = params;
  const { data: facility, error } = await supabase
    .from('facilities')
    .select('*')
    .eq('id', facilityId)
    .single();

  if (error) {
    console.error('Error fetching facility:', error);
    throw new Response("Not Found", { status: 404 });
  }

  return json({ facility });
};

export const action: ActionFunction = async ({ request, params }) => {
  const { facilityId } = params;
  const formData = await request.formData();
  const updates = Object.fromEntries(formData);

  const { error } = await supabase
    .from('facilities')
    .update(updates)
    .eq('id', facilityId);

  if (error) {
    return json({ error: error.message });
  }

  return redirect(`/admin/facilities/${facilityId}`);
};

export default function EditFacility() {
  const { facility } = useLoaderData<{ facility: Facility }>();
  const actionData = useActionData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoPreview, setLogoPreview] = useState(facility.logo_url);

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const form = event.currentTarget;
    await fetch(form.action, {
      method: form.method,
      body: new FormData(form),
    });
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Edit Facility</h2>

      {actionData?.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{actionData.error}</AlertDescription>
        </Alert>
      )}

      <Form method="post" encType="multipart/form-data" onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Facility Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Facility Name</Label>
              <Input id="name" name="name" defaultValue={facility.name} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Logo</Label>
              <Input id="logo" name="logo" type="file" accept="image/*" onChange={handleLogoChange} />
              {logoPreview && <img src={logoPreview} alt="Logo preview" className="mt-2 h-20 w-20 object-cover rounded-full" />}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={facility.status}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Facility"
              )}
            </Button>
          </CardContent>
        </Card>
      </Form>
    </div>
  );
}