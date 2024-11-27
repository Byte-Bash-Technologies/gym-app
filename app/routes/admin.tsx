import { Outlet, Link } from "@remix-run/react";
import { useLoaderData } from "@remix-run/react";
import { json, LoaderFunction } from "@remix-run/node";
import { supabase } from "~/utils/supabase.server";

export const loader: LoaderFunction = async ({ request }) => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || session.user.role !== 'admin') {
    throw new Response("Unauthorized", { status: 401 });
  }

  return json({ user: session.user });
};

export default function AdminDashboard() {
  const { user } = useLoaderData<{ user: any }>();

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-md">
        <div className="p-4">
          <h2 className="text-xl font-semibold">Admin Dashboard</h2>
          <p className="text-gray-600">{user.email}</p>
        </div>
        <nav className="mt-4">
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