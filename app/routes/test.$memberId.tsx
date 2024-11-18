import { json, LoaderFunction, redirect } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import { createServerClient, parse } from '@supabase/ssr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';

interface Facility {
  id: string;
  name: string;
  address: string;
}

export const loader: LoaderFunction = async ({ request }) => {
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
  console.log(user);

  if (!user) {
    return redirect('/login');
  }

  const { data: facilities, error } = await supabase
    .from('facilities')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    return json({ error: error.message });
  }

  return json({ facilities });
};

export default function Dashboard() {
  const { facilities, error } = useLoaderData<{ facilities: Facility[], error?: string }>();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {facilities.map((facility) => (
          <Card key={facility.id}>
            <CardHeader>
              <CardTitle>{facility.name}</CardTitle>
              <CardDescription>{facility.address}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to={`/facilities/${facility.id}`}>
                <Button>View Details</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
      {facilities.length === 0 && (
        <p className="text-center text-gray-500 mt-8">No facilities found. Add a new facility to get started.</p>
      )}
      <div className="mt-8">
        <Link to="/facilities/new">
          <Button>Add New Facility</Button>
        </Link>
      </div>
    </div>
  );
}