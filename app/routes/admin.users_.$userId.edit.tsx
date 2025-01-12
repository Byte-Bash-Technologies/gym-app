import { json, LoaderFunction, ActionFunction, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form } from "@remix-run/react";
import { supabase } from "~/utils/supabase.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";

interface User {
  id: string;
  email: string;
  full_name: string;
}

export const loader: LoaderFunction = async ({ params }) => {
  const { userId } = params;
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, full_name')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    throw new Response("Not Found", { status: 404 });
  }

  return json({ user });
};

export const action: ActionFunction = async ({ request, params }) => {
  const { userId } = params;
  const formData = await request.formData();
  const updates = {
    full_name: formData.get('full_name') as string,
    email: formData.get('email') as string,
  };

  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (error) {
    return json({ error: error.message });
  }

  return redirect('/admin/users');
};

export default function EditUser() {
  const { user } = useLoaderData<{ user: User }>();
  const actionData = useActionData();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Edit User</h2>

      {actionData?.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{actionData.error}</AlertDescription>
        </Alert>
      )}

      <Form method="post">
        <Card>
          <CardHeader>
            <CardTitle>User Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" name="full_name" defaultValue={user.full_name} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={user.email} required />
            </div>

            <Button type="submit" className="w-full dark:bg-[#3A3A52] dark:text-white">
              Update User
            </Button>
          </CardContent>
        </Card>
      </Form>
    </div>
  );
}