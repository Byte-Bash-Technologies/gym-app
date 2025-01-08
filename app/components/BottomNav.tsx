import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useParams, useLocation, Link } from "@remix-run/react";
import { Home, Wallet, PieChart, Users } from 'lucide-react';
import { cn } from "~/lib/utils";

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

export default function BottomNav() {
  const params = useParams();
  const location = useLocation();
  const prefetchedRoutes = useRef<Set<string>>(new Set());

  const navItems: NavItem[] = useMemo(() => [
    { name: 'Home', path: 'home', icon: Home },
    { name: 'Transaction', path: 'transaction', icon: Wallet },
    { name: 'Report', path: 'report', icon: PieChart },
    { name: 'Members', path: 'members', icon: Users },
  ], []);

  const [activeTab, setActiveTab] = useState(() => {
    return navItems.find(item => location.pathname.includes(`/${item.path}`))?.path || 'home';
  });

  useEffect(() => {
    const newActiveTab = navItems.find(item => location.pathname.includes(`/${item.path}`))?.path || 'home';
    setActiveTab(newActiveTab);
  }, [location.pathname, navItems]);

  const shouldShowNav = useMemo(() => {
    const allowedPaths = navItems.map(item => `/${params.facilityId}/${item.path}`);
    return allowedPaths.includes(location.pathname);
  }, [location.pathname, navItems, params.facilityId]);

  const handlePrefetch = (path: string) => {
    const fullPath = `/${params.facilityId}/${path}`;
    if (!prefetchedRoutes.current.has(fullPath)) {
      prefetchedRoutes.current.add(fullPath);
      return "render";
    }
    return "none";
  };

  if (!shouldShowNav) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#f0ebff] dark:bg-[#212237] p-2 rounded-t-3xl border-t border-[#886fa6]/20" aria-label="Bottom Navigation">
      <div className="flex justify-around items-center text-gray-500">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={`/${params.facilityId}/${item.path}`}
            prefetch={handlePrefetch(item.path)}
            className="flex flex-col items-center relative"
            onClick={() => setActiveTab(item.path)}
            aria-current={activeTab === item.path ? 'page' : undefined}
          >
            <div className={cn(
              "rounded-full p-3 transition-all duration-300 ease-in-out",
              activeTab === item.path ? "bg-[#886fa6]" : "bg-transparent"
            )}>
              <item.icon 
                className={cn(
                  "h-6 w-6 transition-all duration-300 ease-in-out",
                  activeTab === item.path ? "text-white" : "text-gray-500"
                )} 
                aria-hidden="true" 
              />
            </div>
            <span className={cn(
              "text-xs transition-all duration-300 ease-in-out",
              activeTab === item.path ? "text-[#886fa6]" : "text-gray-500"
            )}>
              {item.name}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

