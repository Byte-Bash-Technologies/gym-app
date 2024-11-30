import { useState } from "react";
import { json, redirect } from "@remix-run/node";
import { useActionData, Form, Link } from "@remix-run/react";
import { createServerClient, parse, serialize } from "@supabase/ssr";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import iconImage from "~/assets/sportsdot-favicon-64-01.svg";

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
  const actionData = useActionData();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-purple-100 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center">
          <div className="space-y-2 relative w-32 h-32">
            <img
              src={iconImage}
              alt="logo"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Login Form */}
        <div className="space-y-6">
          <h2 className="text-2xl font-medium text-center text-purple-600">
            Login
          </h2>

          <Form
            method="post"
            onSubmit={() => setIsLoading(true)}
            className="space-y-6"
          >
            {actionData?.error && (
              <div
                className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
                role="alert"
              >
                <span className="block sm:inline">{actionData.error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email / number</Label>
                <Input
                  id="email"
                  name="email"
                  placeholder="Email / number"
                  className="h-12 bg-white rounded-2xl"
                  type="text"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  placeholder="Password"
                  className="h-12 bg-white rounded-2xl"
                  type="password"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" className="border-purple-300" />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Remember Me
                </label>
              </div>
              <Link
                to="#"
                className="text-sm text-purple-600 hover:text-purple-500"
              >
                Forget Password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-lg font-medium bg-purple-400 hover:bg-purple-500 rounded-2xl"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>

            <div className="text-center space-x-1">
              <span className="text-sm text-gray-600">
                Don't have an account?
              </span>
              <Link
                to="#"
                className="text-sm font-medium text-purple-600 hover:text-purple-500"
              >
                <a href="tel:7010976271">CONTACT US</a>
              </Link>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
