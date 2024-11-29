import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, useLocation, Link } from "@remix-run/react";
import { Home, Wallet, PieChart, Users } from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

export default function BottomNav() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-purple-100 p-2 rounded-t-3xl" aria-label="Bottom Navigation">
      <div className="flex justify-around items-center text-gray-500">
        {navItems.map((item) => (
          <Link
          
            key={item.path}
            to={`/${params.facilityId}/${item.path}`}
            className="flex flex-col items-center relative"
            onClick={() => setActiveTab(item.path)}
            aria-current={activeTab === item.path ? 'page' : undefined}
          >
            <div className={`rounded-full p-3 transition-all duration-300 ease-in-out ${activeTab === item.path ? 'bg-purple-500' : 'bg-transparent'}`}>
              <item.icon className={`h-6 w-6 transition-all duration-300 ease-in-out ${activeTab === item.path ? 'text-white' : 'text-gray-500'}`} aria-hidden="true" />
            </div>
            <span className={`text-xs transition-all duration-300 ease-in-out ${activeTab === item.path ? 'text-purple-500' : 'text-gray-500'}`}>
              {item.name}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}