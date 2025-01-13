import { useState } from "react";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, Form } from "@remix-run/react";
import { createServerClient, parse, serialize } from '@supabase/ssr';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { AlertCircle, Loader2, Upload, ImagePlus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { supabase } from "~/utils/supabase.server";
import { getAuthenticatedUser } from "~/utils/currentUser";

export const loader = async ({ request }) => {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return redirect('/login');
  }

  const { data: userData, error } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (error || !userData?.is_admin) {
    console.error('Error fetching user data or user is not an admin:', error);
    return redirect('/');
  }

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, full_name, phone')
    .eq('is_admin', false);

  if (usersError) {
    console.error('Error fetching users:', usersError);
    return redirect('/');
  }

  return json({ isCurrentUserAdmin: userData.is_admin, users });
};

export const action = async ({ request }) => {
  const response = new Response();
  const supabaseClient = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => parse(request.headers.get("Cookie") || "")[key],
        set: (key, value, options) => {
          response.headers.append("Set-Cookie", serialize(key, value, options));
        },
        remove: (key, options) => {
          response.headers.append("Set-Cookie", serialize(key, "", options));
        },
      },
    }
  );
  const { data: { user } } = await supabaseClient.auth.getUser();
  const formData = await request.formData();
  const name = formData.get('name') as string;
  const type = formData.get('type') as string;
  const userId = formData.get('user_id') as string;
  const logo = formData.get('logo') as File;
  const phoneNumber = formData.get('phone_number') as string;
  const address = formData.get('address') as string;

  if (!user) {
    return json({ error: 'You must be logged in to add facilities' }, { status: 401 });
  }

  const { data: userData, error } = await supabaseClient
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (error || !userData?.is_admin) {
    return json({ error: 'Only admins can add facilities' }, { status: 403 });
  }

  let logoUrl = null;
  if (logo && logo.size > 0) {
    const fileExt = logo.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('facility-logos')
      .upload(fileName, logo, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return json({ error: 'Error uploading logo: ' + uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabaseClient.storage
      .from('facility-logos')
      .getPublicUrl(fileName);

    logoUrl = publicUrl;
  }

  const { error: insertError } = await supabaseClient
    .from('facilities')
    .insert({ name, type, user_id: userId, logo_url: logoUrl, phone: phoneNumber, address });

  if (insertError) {
    console.error('Error inserting facility:', insertError);
    return json({ error: insertError.message }, { status: 500 });
  }

  return redirect('/admin/facilities');
};

export default function AddFacility() {
  const { isCurrentUserAdmin, users } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  if (!isCurrentUserAdmin) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You do not have permission to access this page.
        </AlertDescription>
      </Alert>
    );
  }

  const isSubmitting = navigation.state === "submitting";

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);

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

  return (
    <div className="container mx-auto pt-4">
      <Card className="max-w-md mx-auto">
        <Form method="post" className="space-y-4" encType="multipart/form-data">
          <CardHeader>
            <CardTitle>Add Facility</CardTitle>
            <CardDescription>Create a new facility and assign it to a user.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <Label htmlFor="name">Facility Name</Label>
              <Input type="text" className="dark:bg-[#4A4A68]" name="name" id="name" required />
            </div>
            <div className="space-y-2 mb-4">
              <Label htmlFor="type">Facility Type</Label>
              <Select name="type" required>
                <SelectTrigger className="dark:bg-[#4A4A68]">
                  <SelectValue placeholder="Select a facility type" />
                </SelectTrigger>
                <SelectContent className="dark:bg-[#4A4A68]">
                  <SelectItem className="dark:focus:bg-[#3A3A52]/90 dark:hover:bg-[#3A3A52]/90" value="gym">Gym</SelectItem>
                  <SelectItem className="dark:focus:bg-[#3A3A52]/90 dark:hover:bg-[#3A3A52]/90" value="badminton">Badminton</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 mb-4">
              <Label htmlFor="user_id">Assign User</Label>
              <Select name="user_id" value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="dark:bg-[#4A4A68]">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent className="dark:bg-[#4A4A68]">
                  {users.map((user) => (
                    <SelectItem className="dark:focus:bg-[#3A3A52]/90 dark:hover:bg-[#3A3A52]/90" key={user.id} value={user.id}>
                      {user.full_name} ({user.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 mb-4">
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input type="tel" className="dark:bg-[#4A4A68]" name="phone_number" id="phone_number" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <textarea
                name="address"
                id="address"
                rows={3}
                className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none dark:bg-[#4A4A68]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">Facility Logo</Label>
              <label htmlFor="logo" className="block">
                <Input
                  id="logo"
                  name="logo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer flex flex-col items-center dark:bg-[#4A4A68]">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Selected"
                      className="h-32 w-32 object-cover mb-2"
                    />
                  ) : (
                    <>
                      <ImagePlus className="h-8 w-8 mb-2" />
                      <span>Upload logo</span>
                    </>
                  )}
                </div>
              </label>
            </div>
            {actionData?.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{actionData.error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full bg-[#886fa6] dark:bg-[#3A3A52] dark:text-white">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Facility...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Add Facility
                </>
              )}
            </Button>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}