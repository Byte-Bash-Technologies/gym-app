import { useState } from 'react';
import { json, redirect } from '@remix-run/node';
import { useActionData, Form } from '@remix-run/react';
import { createServerClient, parse, serialize } from '@supabase/ssr';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '~/components/ui/card';
import { Alert, AlertDescription } from '~/components/ui/alert';

export const action = async ({ request }) => {
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
  const email = formData.get('email');
  const password = formData.get('password');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email as string,
    password: password as string,
  });

  if (error) {
    return json({ error: error.message });
  }

  if (data?.user) {
    return redirect('/', {
      headers: response.headers,
    });
  }

  return json({ error: 'An unexpected error occurred' });
};

export default function Login() {
  const actionData = useActionData();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <Form method="post" onSubmit={() => setIsLoading(true)}>
          <CardContent className="space-y-4">
            {actionData?.error && (
              <Alert variant="destructive">
                <AlertDescription>{actionData.error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (actionData?.error ? 'Log in' : 'Logging in...') : 'Log in'}
            </Button>
          </CardFooter>
        </Form>
      </Card>
    </div>
  );
}