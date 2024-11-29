import { Outlet, Link } from "@remix-run/react";
import { useLoaderData } from "@remix-run/react";
import { json, LoaderFunction } from "@remix-run/node";
import { supabase } from "~/utils/supabase.server";
import { createServerClient,parse,serialize } from "@supabase/ssr";

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

  if (error || !userData?.is_admin) {
    console.error('Error fetching user data or user is not an admin:', error);
    return json({ isCurrentUserAdmin: false });
  }

  return json({ isCurrentUserAdmin: userData.is_admin, user });
};

export default function AdminDashboard() {
  const { isCurrentUserAdmin, user } = useLoaderData<{ isCurrentUserAdmin: boolean, user: any }>();

  if (!isCurrentUserAdmin) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Unauthorized Access</h1>
          <p className="mb-4">You do not have permission to access the admin dashboard.</p>
          <Link to="/" className="text-blue-500 hover:underline">Return to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-md">
        <div className="p-4">
          <h2 className="text-xl font-semibold">Admin Dashboard</h2>
          <p className="text-gray-600">{user.email}</p>
        </div>
        <nav className="mt-4">
          <Link to="/admin/dashboard" className="block py-2 px-4 text-gray-700 hover:bg-gray-200">
            Dashboard
          </Link>
          <Link to="/admin/facilities" className="block py-2 px-4 text-gray-700 hover:bg-gray-200">
            Facilities
          </Link>
          <Link to="/admin/subscriptions" className="block py-2 px-4 text-gray-700 hover:bg-gray-200">
            Subscription Plans
          </Link>
          <Link to="/admin/settings" className="block py-2 px-4 text-gray-700 hover:bg-gray-200">
            Settings
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}