import { useEffect, useState } from "react";
import type { ActionFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, Form, Link } from "@remix-run/react";
import { createServerClient, parse, serialize } from "@supabase/ssr";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import iconImage from "~/assets/sportsdot-favicon-64-01.svg";
import { Eye, EyeOff } from 'lucide-react';

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
  const email = formData.get("email");
  const password = formData.get("password");

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email as string,
    password: password as string,
  });

  if (error) {
    return json({ error: error.message });
  }

  if (data?.user) {
    return redirect("/", {
      headers: response.headers,
    });
  }

  return json({ error: "An unexpected error occurred" });
};

export default function Login() {
  const actionData = useActionData<typeof action>();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (actionData?.error) {
      setIsLoading(false);
    }
  }, [actionData]);

  return (
    <div className="min-h-screen bg-[#f0ebff] dark:bg-[#212237] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center">
          <div className="space-y-2 relative w-32 h-32">
            <img
              src={iconImage}
              alt="SportsDot Logo"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="space-y-6 ">
          <h2 className="text-2xl font-medium text-center text-[#8e76af]">
            Login
          </h2>

          <Form 
            method="post" 
            onSubmit={() => setIsLoading(true)}
            className="space-y-6"
          >
            {actionData?.error && (
              <div
                className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg relative"
                role="alert"
              >
                <span className="block sm:inline">{actionData.error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="text"
                  autoComplete="email"
                  required
                  placeholder="Enter your email or phone number"
                  className="h-12 rounded-2xl bg-background dark:bg-[#4A4A62]"
                  aria-label="Email or phone number"
                  aria-describedby={actionData?.error ? "error-message" : undefined}
                />
              </div>

              <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder="Enter your password"
                    className="h-12 rounded-2xl bg-background dark:bg-[#4A4A62] pr-10"
                    aria-label="Password"
                    aria-describedby={actionData?.error ? "error-message" : undefined}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <Eye className="h-4 w-4 text-gray-500" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    )}
                    <span className="sr-only">
                      {showPassword ? "Hide password" : "Show password"}
                    </span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  name="remember"
                  className="border-[#8e76af]"
                  aria-label="Remember me"
                />
                <Label 
                  htmlFor="remember" 
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Remember me
                </Label>
              </div>
              <Link
                to="/forgot-password"
                className="text-sm text-[#8e76af] hover:text-[#8e76af]/90"
              >
                Forgot Password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-lg font-medium bg-[#8e76af] hover:bg-[#8e76af]/90 dark:bg-[#3A3A52] text-white rounded-xl"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>

            <div className="text-center space-x-1">
              <span className="text-sm text-muted-foreground">
                Don't have an account?
              </span>
              <Link
                to="tel:7010976271"
                className="text-sm font-medium text-[#8e76af] hover:text-[#8e76af]/90"
              >
                Contact Us
              </Link>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}

