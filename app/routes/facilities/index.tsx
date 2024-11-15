import { json, type LoaderFunction } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { supabase } from "~/utils/supabase.server";

interface Facility {
  id: string;
  name: string;
  address: string;
}

interface LoaderData {
  facilities: Facility[];
}

export const loader: LoaderFunction = async () => {
  const { data: facilities, error } = await supabase
    .from('facilities')
    .select('id, name, address');

  if (error) {
    console.error("Error fetching facilities:", error);
    return json({ facilities: [] });
  }

  return json({ facilities });
};

export default function FacilitiesList() {
  const { facilities } = useLoaderData<LoaderData>();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Facilities</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {facilities.map((facility) => (
          <Card key={facility.id}>
            <CardHeader>
              <CardTitle>{facility.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">{facility.address}</p>
              <div className="mt-4 space-y-2">
                <Link 
                  to={`/facilities/${facility.id}/members`}
                  className="block w-full text-center bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
                >
                  Members
                </Link>
                <Link 
                  to={`/facilities/${facility.id}/reports`}
                  className="block w-full text-center bg-green-500 text-white py-2 rounded hover:bg-green-600 transition"
                >
                  Reports
                </Link>
                <Link 
                  to={`/facilities/${facility.id}/settings`}
                  className="block w-full text-center bg-purple-500 text-white py-2 rounded hover:bg-purple-600 transition"
                >
                  Settings
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}