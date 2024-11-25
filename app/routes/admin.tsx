import { useState } from 'react';
import { Outlet, Link, useLocation } from '@remix-run/react';
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import { Plus, Menu, LayoutDashboard, Building, CreditCard, Settings, ChevronRight } from 'lucide-react';

export default function AdminDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
    { icon: Building, label: 'Facilities', href: '/admin/facilities' },
    { icon: CreditCard, label: 'Subscriptions', href: '/admin/subscriptions' },
    { icon: Settings, label: 'Settings', href: '/admin/settings' },
  ];

  const Sidebar = () => (
    <ScrollArea className="h-full py-6 pl-6 pr-6 lg:pr-0">
      <h2 className="text-lg font-semibold mb-4">Admin Dashboard</h2>
      <nav className="space-y-2">
        {sidebarItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 ${
              location.pathname === item.href ? 'bg-gray-100 text-gray-900' : ''
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
            <ChevronRight className="ml-auto h-4 w-4" />
          </Link>
        ))}
      </nav>
    </ScrollArea>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar for desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r">
        <Sidebar />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="flex items-center justify-between p-4 border-b lg:hidden">
          <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
          </Sheet>
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <div className="w-6" /> {/* Placeholder for alignment */}
        </header>

        {/* Main content */}
        <div className="p-6">
          <Outlet />
        </div>

        {/* Floating action button */}
        <Link to="/admin/add-facility" className="fixed right-6 bottom-6">
          <Button size="icon" className="h-14 w-14 rounded-full">
            <Plus className="h-6 w-6" />
          </Button>
        </Link>
      </main>
    </div>
  );
}