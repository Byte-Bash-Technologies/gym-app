import { useState } from 'react';
import { Outlet, Link, useParams, useLocation } from '@remix-run/react';
import { Home, Users, FileText, Menu, X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '~/components/ui/sheet';
import { cn } from '~/lib/utils';
import BottomNav from '~/components/BottomNav';

export default function FacilityLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const params = useParams();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Home', href: `/${params.facilityId}/home` },
    { icon: Users, label: 'Members', href: `/${params.facilityId}/members` },
    { icon: FileText, label: 'Reports', href: `/${params.facilityId}/reports` },
  ];

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
      
      {/*<header className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to={`/${params.facilityId}/home`} className="text-xl font-bold text-purple-600">
              Gym App
            </Link>
            <nav className="hidden md:flex space-x-4">
              <NavLinks />
            </nav>
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <nav className="flex flex-col space-y-4 mt-6">
                  <NavLinks isMobile />
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>*/}
      <main className="flex-grow container mx-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}