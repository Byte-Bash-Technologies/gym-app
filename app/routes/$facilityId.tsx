//app/routes/$facilityId.tsx

import { useState } from "react";
import {
  Outlet,
  Link,
  useParams,
  useLocation,
  json,
  useLoaderData,
} from "@remix-run/react";
import { Home, Users, FileText } from "lucide-react";
import { cn } from "~/lib/utils";
import BottomNav from "~/components/BottomNav";
import { LoaderFunction } from "@remix-run/node";
import { supabase } from "~/utils/supabase.server";
import { SubscriptionExpiredMessage } from "~/components/SubscriptionExpiredMessage";
import { getAuthenticatedUser } from "~/utils/currentUser";

export const loader: LoaderFunction = async ({ params, request }) => {
  const user = await getAuthenticatedUser(request);
  const facilityId = params.facilityId;
  
  const userId = user.id;

  
  const { data: facilities, error:facilityError } = await supabase
    .rpc('get_facilities_by_user_and_id', { input_facility_id: facilityId, input_user_id: userId });
  
  const facility = facilities?.[0];
  if (facilityError) {
  throw new Response("Facility not found", { status: 404 });
} 
  const { data, error } = await supabase
    .from("facility_subscriptions")
    .select("end_date")
    .eq("facility_id", facilityId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.error("Error fetching subscription data:", error);
    return json({ facilityId, endDate: null });
  }

  const { data: trainerData, error: trainerError } = await supabase
    .from("facility_trainers")
    .select("id")
    .eq("facility_id", facilityId)
    .eq("user_id", userId)
    .single();

  const isTrainer = !trainerError && trainerData ? true : false;

  return json({
    facilityId,
    endDate: data?.end_date,
    facilityName: facility.name,
    facilityType: facility.type,
    isTrainer,
  });
};
export { ErrorBoundary } from "~/components/CatchErrorBoundary";
export default function FacilityLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const params = useParams();
  const location = useLocation();

  const { endDate, facilityName, facilityType, isTrainer } =
    useLoaderData<{
      facilityId: string;
      endDate: string | null;
      facilityName: string;
      facilityType: string;
      isTrainer: boolean;
    }>();


  const isSubscriptionExpired = !endDate || new Date(endDate) < new Date();

 

  return (
    <div className="flex flex-col min-h-screen ">
      <main className="flex-grow container mx-auto">
        {isSubscriptionExpired ? (
          <SubscriptionExpiredMessage
        facilityName={facilityName}
        facilityType={facilityType}
        facilityId={params.facilityId ?? ""}
          />
        ) : (
          location.pathname === `/${params.facilityId}/` ? (
        window.location.href = `/${params.facilityId}/home`
          ) : (
        <Outlet />
          )
        )}
      </main>
      <BottomNav isTrainer={isTrainer} />
    </div>
  );
}
