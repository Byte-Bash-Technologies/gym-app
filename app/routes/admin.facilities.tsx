import { json, LoaderFunction } from "@remix-run/node";
import { useLoaderData, Link, useFetcher } from "@remix-run/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from "~/utils/supabase.server";

interface Facility {
  id: string;
  name: string;
  type: string;
  logo_url: string;
  member_count: number;
  phone_number: string;
  facility_subscriptions: {
    status: string;
  }[];
  status?: string;
}

export const loader: LoaderFunction = async () => {
  const { data: facilities, error } = await supabase
    .from('facilities')
    .select('*, facility_subscriptions(status)')
    .order('name');

  if (error) {
    console.error('Error fetching facilities:', error);
    return json({ facilities: [] });
  }

    // Update facility status based on subscription
  const updatedFacilities = facilities.map((facility) => ({
    ...facility,
    status: facility.facility_subscriptions.some(sub => sub.status === 'active') ? 'active' : 'expired'
  }));

  // Update the status in the database
  for (const facility of updatedFacilities) {
    const { error: updateError } = await supabase
      .from('facilities')
      .update({ status: facility.status })
      .eq('id', facility.id);

    if (updateError) {
      console.error(`Error updating status for facility ${facility.id}:`, updateError);
    }
  }

  return json({ facilities: updatedFacilities });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const facilityId = formData.get('facilityId');

  if (typeof facilityId !== 'string') {
    return json({ error: 'Invalid facility ID' }, { status: 400 });
  }

  const { error } = await supabase
    .from('facilities')
    .delete()
    .eq('id', facilityId);

  if (error) {
    console.error('Error deleting facility:', error);
    return json({ error: 'Failed to delete facility' }, { status: 500 });
  }

  return json({ success: true });
};

export default function FacilitiesList() {
  const { facilities } = useLoaderData<{ facilities: Facility[] }>();
  const fetcher = useFetcher();

  const handleDelete = (facilityId: string) => {
    if (confirm('Are you sure you want to delete this facility?')) {
      fetcher.submit({ facilityId }, { method: 'post' });
    }
  };
  return (
    <div className="space-y-6 pt-6 pb-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Facilities</h2>
        <Link to="/admin/add-facility">
          <Button className="bg-[#886fa6] hover:bg-[#886fa6]/90 dark:bg-[#3A3A52] dark:text-white">
            <Plus className="mr-2 h-4 w-4" /> Add Facility
          </Button>
        </Link>
      </div>
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
                  <Badge 
                    variant={facility.facility_subscriptions.some(sub => sub.status === 'active') ? 'success' : 'destructive'}
                  >
                    {facility.facility_subscriptions.some(sub => sub.status === 'active') ? 'Subscribed' : 'Not Subscribed'}
                  </Badge>
                  <Button
                variant="ghost"
                size="icon"
                className="text-destructive dark:text-white dark:hover:bg-[#3A3A52] hover:text-destructive"
                onClick={() => handleDelete(facility.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <Link to="/admin/add-facility" className="fixed right-6 bottom-6">
        <Button size="icon" className="h-14 w-14 rounded-full bg-[#886fa6] dark:bg-[#3A3A52] dark:text-white">
          <Plus className="h-6 w-6" />
        </Button>
      </Link>
    </div>
  );
}