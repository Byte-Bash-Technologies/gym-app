import { json, LoaderFunction } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { supabase } from "~/utils/supabase.server";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";

interface Facility {
  id: string;
  name: string;
  type: string;
  logo_url: string;
  status: 'active' | 'inactive';
  member_count: number;
}

export const loader: LoaderFunction = async () => {
  const { data: facilities, error } = await supabase
    .from('facilities')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching facilities:', error);
    return json({ facilities: [] });
  }

  return json({ facilities });
};

export default function FacilitiesList() {
  const { facilities } = useLoaderData<{ facilities: Facility[] }>();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Facilities</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {facilities.map((facility) => (
          <Link key={facility.id} to={`/admin/facilities/${facility.id}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={facility.logo_url} alt={facility.name} />
                  <AvatarFallback>{facility.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{facility.name}</CardTitle>
                  <p className="text-sm text-gray-500">{facility.type}</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <Badge variant={facility.status === 'active' ? 'success' : 'destructive'}>
                    {facility.status}
                  </Badge>
                  <span className="text-sm text-gray-500">{facility.member_count} members</span>
                </div>
              </CardContent>
            </Card>
          </Link>
          
        ))}
        {/* Floating action button */}
        <Link to="/admin/add-facility" className="fixed right-6 bottom-6">
          <Button size="icon" className="h-14 w-14 rounded-full">
            <Plus className="h-6 w-6" />
          </Button>
        </Link>
      </div>
    </div>
  );
}