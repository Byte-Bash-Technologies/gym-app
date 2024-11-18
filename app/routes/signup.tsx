import { useState } from 'react';
import { json, redirect, ActionFunction, LoaderFunction } from '@remix-run/node';
import { useActionData, useLoaderData, Form } from '@remix-run/react';
import { createServerClient, parse, serialize } from '@supabase/ssr';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '~/components/ui/card';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Checkbox } from '~/components/ui/checkbox';

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
    return json({ isCurrentUserAdmin: false });
  }

  const { data: userData, error } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching user data:', error);
    return json({ isCurrentUserAdmin: false });
  }

  return json({ isCurrentUserAdmin: userData?.is_admin || false });
};

export const action: ActionFunction = async ({ request }) => {
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

  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const isAdmin = formData.get('isAdmin') === 'on';

  // Check if the current user is an admin
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (isAdmin && currentUser) {
    const { data: currentUserData, error: currentUserError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', currentUser.id)
      .single();

    if (currentUserError || !currentUserData?.is_admin) {
      return json({ error: 'Only admins can create admin accounts' });
    }
  } else if (isAdmin) {
    return json({ error: 'You must be logged in as an admin to create admin accounts' });
  }

  // Sign up the user (this creates an entry in auth.users)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    return json({ error: authError.message });
  }

  if (authData.user) {
    // Create a corresponding entry in public.users
    const { error: profileError } = await supabase
      .from('users')
      .insert({ 
        id: authData.user.id, 
        email: authData.user.email, 
        full_name: fullName,
        is_admin: isAdmin
      });

    if (profileError) {
      return json({ error: 'Failed to create user profile' });
    }

    return redirect('/dashboard', {
      headers: response.headers,
    });
  }

  return json({ error: 'An unexpected error occurred' });
};

export default function Signup() {
  const actionData = useActionData();
  const { isCurrentUserAdmin } = useLoaderData<{ isCurrentUserAdmin: boolean }>();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign Up</CardTitle>
          <CardDescription>Create a new account</CardDescription>
        </CardHeader>
        <Form method="post" onSubmit={() => setIsLoading(true)}>
          <CardContent className="space-y-4">
            {actionData?.error && (
              <Alert variant="destructive">
                <AlertDescription>{actionData.error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" name="fullName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {isCurrentUserAdmin && (
              <div className="flex items-center space-x-2">
                <Checkbox id="isAdmin" name="isAdmin" />
                <Label htmlFor="isAdmin">Create as Admin User</Label>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing up...' : 'Sign up'}
            </Button>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}