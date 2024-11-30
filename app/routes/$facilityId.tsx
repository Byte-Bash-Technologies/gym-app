import { useState } from 'react';
import { Outlet, Link, useParams, useLocation, json, useLoaderData } from '@remix-run/react';
import { Home, Users, FileText, Menu } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '~/components/ui/sheet';
import { cn } from '~/lib/utils';
import BottomNav from '~/components/BottomNav';
import { LoaderFunction } from '@remix-run/node';
import { supabase } from '~/utils/supabase.server';
import { SubscriptionExpiredMessage } from '~/components/SubscriptionExpiredMessage';

export const loader: LoaderFunction = async ({ params }) => {

  const facilityId = params.facilityId;
  const { data: facility, error: facilityError } = await supabase
  .from('facilities')
  .select('name')
  .eq('id', facilityId)
  .single();

if (facilityError) {
  throw new Response("Facility not found", { status: 404 });
}
  
  const { data, error } = await supabase
    .from('facility_subscriptions')
    .select('end_date')
    .eq('facility_id', facilityId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching subscription data:', error);
    return json({ facilityId, endDate: null });
  }

  return json({ facilityId, endDate: data?.end_date });
};

export default function FacilityLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const params = useParams();
  const location = useLocation();
  const { facilityId, endDate } = useLoaderData<typeof loader>();

  const navItems = [
    { icon: Home, label: 'Home', href: `/${params.facilityId}/home` },
    { icon: Users, label: 'Members', href: `/${params.facilityId}/members` },
    { icon: FileText, label: 'Reports', href: `/${params.facilityId}/reports` },
  ];

  const isSubscriptionExpired = endDate ? new Date(endDate) < new Date() : false;

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
        {isSubscriptionExpired ? <SubscriptionExpiredMessage /> : <Outlet />}
      </main>
      <BottomNav />
    </div>
  );
}

