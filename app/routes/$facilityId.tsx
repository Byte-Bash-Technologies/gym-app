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
  console.error("Error fetching facility data:", facilityError);
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

  return json({
    facilityId,
    endDate: data?.end_date,
    facilityName: facility.name,
    facilityType: facility.type,
  });
};
export { ErrorBoundary } from "~/components/CatchErrorBoundary";
export default function FacilityLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const params = useParams();
  const location = useLocation();
  const { endDate, facilityName, facilityType } =
    useLoaderData<typeof loader>();

  const navItems = [
    { icon: Home, label: "Home", href: `/${params.facilityId}/home` },
    { icon: Users, label: "Members", href: `/${params.facilityId}/members` },
    { icon: FileText, label: "Reports", href: `/${params.facilityId}/reports` },
  ];

  const isSubscriptionExpired = !endDate || new Date(endDate) < new Date();

  const NavLinks = ({ isMobile = false }) => (
    <>
      {navItems.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          className={cn(
            "flex items-center space-x-2 px-4 py-2 rounded-md transition-colors",
            location.pathname === item.href
              ? "bg-purple-100 text-purple-700"
              : "text-gray-600 hover:bg-gray-100",
            isMobile && "text-lg py-3"
          )}
          onClick={() => isMobile && setIsMobileMenuOpen(false)}
        >
          <item.icon className="h-5 w-5" />
          <span>{item.label}</span>
        </Link>
      ))}
    </>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow container mx-auto">
        {isSubscriptionExpired ? (
          <SubscriptionExpiredMessage
            facilityName={facilityName}
            facilityType={facilityType}
            facilityId={params.facilityId ?? ""}
          />
        ) : (
          <Outlet />
        )}
      </main>
      <BottomNav />
    </div>
  );
}
