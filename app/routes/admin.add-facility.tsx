import { useState, useEffect } from "react";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, Form, useSubmit } from "@remix-run/react";
import { createServerClient, parse, serialize } from '@supabase/ssr';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { AlertCircle, Loader2, Upload, ImagePlus, Search } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { supabase } from "~/utils/supabase.server";

export const loader = async ({ request }) => {
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

  const { data: recentUsers, error: recentUsersError } = await supabase
    .from('users')
    .select('id, full_name, phone')
    .eq('is_admin', false)
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentUsersError) {
    console.error('Error fetching recent users:', recentUsersError);
    return redirect('/');
  }

  return json({ isCurrentUserAdmin: userData.is_admin, recentUsers });
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
  const phone = formData.get('phone') as string;
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
    .insert({ name, type, user_id: userId, logo_url: logoUrl, phone, address });

  if (insertError) {
    console.error('Error inserting facility:', insertError);
    return json({ error: insertError.message }, { status: 500 });
  }

  return redirect('admin/facilities');
};

export default function AddFacility() {
  const { isCurrentUserAdmin, recentUsers } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const submit = useSubmit();

  useEffect(() => {
    const searchUsers = async () => {
      if (searchTerm.length > 2) {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, phone')
          .eq('is_admin', false)
          .or(`full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
          .limit(5);

        if (error) {
          console.error('Error searching users:', error);
        } else {
          setSearchResults(data);
        }
      } else {
        setSearchResults([]);
      }
    };

    searchUsers();
  }, [searchTerm]);

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

  const handleUserSelect = (userId: string) => {
    setSelectedUser(userId);
    submit({ user_id: userId }, { method: "post" });
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-md mx-auto">
        <Form method="post" className="space-y-4" encType="multipart/form-data">
          <CardHeader>
            <CardTitle>Add Facility</CardTitle>
            <CardDescription>Create a new facility and assign it to a user.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="name">Facility Name</Label>
              <Input type="text" name="name" id="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Facility Type</Label>
              <Select name="type" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a facility type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gym">Gym</SelectItem>
                  <SelectItem value="badminton">Badminton</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input type="tel" name="phone" id="phone" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input type="text" name="address" id="address" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user_search">Assign User</Label>
              <div className="relative">
                <Input
                  type="text"
                  id="user_search"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
              {searchResults.length > 0 && (
                <ul className="mt-2 border rounded-md divide-y">
                  {searchResults.map((user: any) => (
                    <li
                      key={user.id}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => handleUserSelect(user.id)}
                    >
                      {user.full_name} ({user.phone})
                    </li>
                  ))}
                </ul>
              )}
              {searchResults.length === 0 && searchTerm.length > 2 && (
                <p className="text-sm text-gray-500 mt-2">No users found</p>
              )}
              {searchTerm.length <= 2 && (
                <div className="mt-2">
                  <h3 className="text-sm font-medium mb-1">Recent Users:</h3>
                  <ul className="border rounded-md divide-y">
                    {recentUsers.map((user: any) => (
                      <li
                        key={user.id}
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleUserSelect(user.id)}
                      >
                        {user.full_name} ({user.phone})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <input type="hidden" name="user_id" value={selectedUser} />
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
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer flex flex-col items-center">
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
            <Button type="submit" disabled={isSubmitting} className="w-full">
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

