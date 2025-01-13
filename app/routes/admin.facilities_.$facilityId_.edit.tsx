import { json, LoaderFunction, ActionFunction, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { supabase } from "~/utils/supabase.server";
import { useState } from "react";
import { AlertCircle, Loader2, ImagePlus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";

interface Facility {
  id: string;
  name: string;
  logo_url: string;
  address: string;
  phone: string;
  email: string;
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
  
  const name = formData.get("name");
  const address = formData.get("address");
  const phone = formData.get("phone");
  const email = formData.get("email");
  const logo = formData.get("logo") as File;

  let logoUrl = null;
  
  // Only process logo if a new file was uploaded
  if (logo && logo.size > 0) {
    const fileExt = logo.name.split('.').pop();
    const fileName = `${facilityId}-${Date.now()}.${fileExt}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('facility-logos')
      .upload(fileName, logo);

    if (uploadError) {
      return json({ error: "Failed to upload logo" }, { status: 400 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('facility-logos')
      .getPublicUrl(fileName);

    logoUrl = publicUrl;
  }

  // Update facility details
  const { error: updateError } = await supabase
    .from('facilities')
    .update({
      name,
      address,
      phone,
      email,
      ...(logoUrl && { logo_url: logoUrl }),
    })
    .eq('id', facilityId);

  if (updateError) {
    return json({ error: updateError.message }, { status: 400 });
  }

  return redirect(`/admin/facilities/${facilityId}`);
};

export default function EditFacility() {
  const { facility } = useLoaderData<{ facility: Facility }>();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
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

      <Form method="post" encType="multipart/form-data">
        <Card>
          <CardHeader>
            <CardTitle>Facility Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Facility Name</Label>
              <Input 
                id="name" 
                name="name" 
                defaultValue={facility.name} 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input 
                id="address" 
                name="address" 
                defaultValue={facility.address} 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input 
                id="phone" 
                name="phone" 
                type="tel"
                defaultValue={facility.phone} 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                name="email" 
                type="email"
                defaultValue={facility.email} 
                required 
              />
            </div>

            {/* <div className="space-y-2">
              <Label htmlFor="logo">Facility Logo</Label>
              <label htmlFor="logo" className="block">
                <Input
                  id="logo"
                  name="logo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <div className="border-2 dark:bg-[#4A4A62] border-dashed border-input rounded-lg p-4 text-center cursor-pointer flex flex-col items-center">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Facility logo"
                      className="h-32 w-32 object-cover rounded-full mb-2"
                    />
                  ) : (
                    <>
                      <ImagePlus className="h-8 w-8 mb-2" />
                      <span>Upload logo</span>
                    </>
                  )}
                </div>
              </label>
            </div> */}

            <Button 
              type="submit" 
              className="w-full bg-[#886fa6] hover:bg-[#886fa6]/90 dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]/90 text-white hover:text-white" 
              disabled={isSubmitting}
            >
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