import { json, redirect, LoaderFunction, ActionFunction } from "@remix-run/node";
import { useLoaderData, Form, useActionData, useNavigation } from "@remix-run/react";
import { useState } from "react";

import { serialize, parse, createServerClient } from '@supabase/ssr';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { toast } from "~/hooks/use-toast";
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";

export const loader: LoaderFunction = async ({ request }) => {
  const response = new Response();
  const supabase = createServerClient(
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
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return redirect('/');
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
    .select('id, full_name, phone');

  if (usersError) {
    console.error('Error fetching users:', usersError);
    return redirect('/');
  }

  return json({ isCurrentUserAdmin: userData.is_admin, users });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const name = formData.get('name') as string;
  const type = formData.get('type') as string;
  const userId = formData.get('user_id') as string;

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => parse(request.headers.get("Cookie") || "")[key],
        set: () => {},
        remove: () => {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return json({ error: 'You must be logged in to add facilities' }, { status: 401 });
  }

  const { data: userData, error } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (error || !userData?.is_admin) {
    return json({ error: 'Only admins can add facilities' }, { status: 403 });
  }

  const { error: insertError } = await supabase
    .from('facilities')
    .insert({ name, type, user_id: userId });

  if (insertError) {
    console.error('Error inserting facility:', insertError);
    return json({ error: insertError.message }, { status: 500 });
  }

  return redirect('/facilities');
};

export default function AddFacility() {
  const { isCurrentUserAdmin, users } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [selectedUser, setSelectedUser] = useState("");

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

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-md mx-auto">
      <Form method="post" className="space-y-4">
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
              <Label htmlFor="user_id">Assign User</Label>
              <Select name="user_id" value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} ({user.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              'Add Facility'
            )}
          </Button>
        </CardFooter>
        </Form>
      </Card>
    </div>
  );
}