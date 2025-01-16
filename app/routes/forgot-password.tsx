import { useState } from "react";
import { json, redirect, type ActionFunction } from "@remix-run/node";
import { Form, useActionData, Link } from "@remix-run/react";
import { createServerClient, parse } from "@supabase/ssr";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { ArrowLeft, Loader2, Mail } from 'lucide-react';

export const action: ActionFunction = async ({ request }) => {
  const response = new Response();
  const formData = await request.formData();
  const email = formData.get("email") as string;

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { cookies: {
            get: (key) => parse(request.headers.get("Cookie") || "")[key],
            set: () => {},
            remove: () => {},
          } }
  );

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.APP_URL}`,
      });

    if (error) throw error;

    return json(
      { success: true, message: "Password reset instructions sent to your email" },
      { headers: response.headers }
    );
  } catch (error) {
    if (error instanceof Error) {
      return json(
        { error: error.message },
        
      );
    }
    throw error;
  }
};

export default function ForgotPassword() {
  const actionData = useActionData<typeof action>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="icon" className="hover:dark:bg-[#3A3A52]/9">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
          </div>
          <CardDescription>
            Enter your email address and we&apos;ll send you instructions to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form
            method="post"
            onSubmit={() => setIsSubmitting(true)}
            className="space-y-4"
          >
            {actionData?.error && (
              <Alert variant="destructive">
                <AlertDescription>{actionData.error}</AlertDescription>
              </Alert>
            )}

            {actionData?.success && (
              <Alert className="border-green-500 text-green-500">
                <Mail className="h-4 w-4" />
                <AlertDescription>{actionData.message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                className="dark:bg-[#4A4A62]"
                type="email"
                placeholder="example@gmail.com"
                required
                disabled={isSubmitting || actionData?.success}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#886fa6] hover:bg-[#886fa6]/90 text-white dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]/90"
              disabled={isSubmitting || actionData?.success}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending instructions...
                </>
              ) : (
                "Send Instructions"
              )}
            </Button>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link
            to="/login"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

