import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation, Link } from "@remix-run/react";
import { Home, Wallet, PieChart, Users } from 'lucide-react';

export default function BottomNav() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => {
    if (location.pathname.includes('/transaction')) return 'transaction';
    if (location.pathname.includes('/report')) return 'report';
    if (location.pathname.includes('/members')) return 'members';
    return 'home';
  });
  useEffect(() => {
    if (location.pathname.includes('/transaction')) setActiveTab('transaction');
    else if (location.pathname.includes('/report')) setActiveTab('report');
    else if (location.pathname.includes('/members')) setActiveTab('members');
    else setActiveTab('home');
  }, [location.pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-purple-100 p-2 rounded-t-3xl">
      <div className="flex justify-around items-center text-gray-500">
        <Link
        prefetch="render"
          to={`/${params.facilityId}/home`}
          className="flex flex-col items-center relative"
          onClick={() => setActiveTab('home')}
        >
          <div className={`rounded-full p-3 transition-all duration-300 ease-in-out ${activeTab === 'home' ? 'bg-purple-500' : 'bg-transparent'}`}>
            <Home className={`h-6 w-6 transition-all duration-300 ease-in-out ${activeTab === 'home' ? 'text-white' : 'text-gray-500'}`} />
          </div>
          <span className={`text-xs transition-all duration-300 ease-in-out ${activeTab === 'home' ? 'text-purple-500' : 'text-gray-500'}`}>Home</span>
        </Link>
        <Link
        prefetch="render"
          to={`/${params.facilityId}/transaction`}
          className="flex flex-col items-center relative"
          onClick={() => setActiveTab('transaction')}
        >
          <div className={`rounded-full p-3 transition-all duration-300 ease-in-out ${activeTab === 'transaction' ? 'bg-purple-500' : 'bg-transparent'}`}>
            <Wallet className={`h-6 w-6 transition-all duration-300 ease-in-out ${activeTab === 'transaction' ? 'text-white' : 'text-gray-500'}`} />
          </div>
          <span className={`text-xs transition-all duration-300 ease-in-out ${activeTab === 'transaction' ? 'text-purple-500' : 'text-gray-500'}`}>Transaction</span>
        </Link>
        <Link
        prefetch="render"
          to={`/${params.facilityId}/report`}
          className="flex flex-col items-center relative"
          onClick={() => setActiveTab('report')}
        >
          <div className={`rounded-full p-3 transition-all duration-300 ease-in-out ${activeTab === 'report' ? 'bg-purple-500' : 'bg-transparent'}`}>
            <PieChart className={`h-6 w-6 transition-all duration-300 ease-in-out ${activeTab === 'report' ? 'text-white' : 'text-gray-500'}`} />
          </div>
          <span className={`text-xs transition-all duration-300 ease-in-out ${activeTab === 'report' ? 'text-purple-500' : 'text-gray-500'}`}>Report</span>
        </Link>
        <Link
        prefetch="render"
          to={`/${params.facilityId}/members`}
          className="flex flex-col items-center relative"
          onClick={() => setActiveTab('members')}
        >
          <div className={`rounded-full p-3 transition-all duration-300 ease-in-out ${activeTab === 'members' ? 'bg-purple-500' : 'bg-transparent'}`}>
            <Users className={`h-6 w-6 transition-all duration-300 ease-in-out ${activeTab === 'members' ? 'text-white' : 'text-gray-500'}`} />
          </div>
          <span className={`text-xs transition-all duration-300 ease-in-out ${activeTab === 'members' ? 'text-purple-500' : 'text-gray-500'}`}>Members</span>
        </Link>
      </div>
    </nav>
  );
}