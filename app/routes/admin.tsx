import { Outlet, Link, useLocation, useNavigate } from "@remix-run/react";
import { useLoaderData } from "@remix-run/react";
import { json, LoaderFunction } from "@remix-run/node";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import {
  Plus,
  Menu,
  LayoutDashboard,
  Building,
  CreditCard,
  Settings,
  ChevronRight,
  Home,
  ChevronLeft,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { createServerClient, parse, serialize } from "@supabase/ssr";
import { useState, useEffect } from "react";

export const loader: LoaderFunction = async ({ request }) => {
  const response = new Response();
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => parse(request.headers.get("Cookie") || "")[key],
        set: (key, value, options) => {
          response.headers.append("Set-Cookie", serialize(key, value, options));
        },
        remove: (key, options) => {
          response.headers.append("Set-Cookie", serialize(key, "", options));
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json({ isCurrentUserAdmin: false });
  }

  const { data: userData, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !userData?.is_admin) {
    console.error("Error fetching user data or user is not an admin:", error);
    return json({ isCurrentUserAdmin: false });
  }

  return json({ isCurrentUserAdmin: userData.is_admin, user: userData });
};

interface UserProfileProps {
  user: {
    avatar_url: string;
    full_name: string;
    email: string;
  };
}

const UserProfile: React.FC<UserProfileProps> = ({ user }) => (
  <div className="space-y-4">
    <div className="flex items-center space-x-4 p-4 bg-gray-100 rounded-lg">
      <Avatar>
        <AvatarImage src={user.avatar_url} alt={user.full_name} />
        <AvatarFallback>{user.full_name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div>
        <p className="text-sm font-medium">{user.full_name}</p>
        <p className="text-xs text-gray-500">{user.email}</p>
      </div>
    </div>
  </div>
);

export default function AdminDashboard() {
  const { isCurrentUserAdmin, user } = useLoaderData<{
    isCurrentUserAdmin: boolean;
    user: any;
  }>();

  if (!isCurrentUserAdmin) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Unauthorized Access</h1>
          <p className="mb-4">
            You do not have permission to access the admin dashboard.
          </p>
          <Link to="/" className="text-blue-500 hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === "/admin") {
      navigate("/admin/dashboard");
    }
  }, [location, navigate]);

  const sidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard" },
    { icon: User, label: "Users", href: "/admin/users" },
    { icon: Building, label: "Facilities", href: "/admin/facilities" },
    {
      icon: CreditCard,
      label: "Subscriptions",
      href: "/admin/subscriptions/index",
    },
    { icon: Settings, label: "Settings", href: "/admin/settings" },
  ];

  const Sidebar = ({ isMobile = false }) => (
    <div className="flex flex-col h-full">
      <ScrollArea
        className={`flex-grow py-6 ${
          isDesktopSidebarOpen || isMobile ? "px-6" : "px-2"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className={`text-lg font-semibold ${
              !isDesktopSidebarOpen && !isMobile ? "hidden" : ""
            }`}
          >
            Admin Dashboard
          </h2>
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
            >
              {isDesktopSidebarOpen ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        <nav className="space-y-2">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 ${
                location.pathname === item.href
                  ? "bg-gray-100 text-gray-900"
                  : ""
              }`}
              title={item.label}
            >
              <item.icon className="h-4 w-4" />
              {(isDesktopSidebarOpen || isMobile) && (
                <>
                  <span>{item.label}</span>
                  <ChevronRight className="ml-auto h-4 w-4" />
                </>
              )}
            </Link>
          ))}
        </nav>
      </ScrollArea>
      {(isDesktopSidebarOpen || isMobile) && (
        <div className="mt-auto p-6">
          <UserProfile user={user} />
        </div>
      )}
    </div>
  );

  const Breadcrumbs = () => {
    const pathSegments = location.pathname
      .split("/")
      .filter((segment) => segment);
    const breadcrumbs = pathSegments.map((segment, index) => {
      const url = `/${pathSegments.slice(0, index + 1).join("/")}`;
      const label = segment.charAt(0).toUpperCase() + segment.slice(1);
      return { label, url };
    });

    return (
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center space-x-2 text-sm text-gray-500">
          <li>
            <Link to="/admin/dashboard" className="hover:text-gray-700">
              <Home className="h-4 w-4" />
              <span className="sr-only">Home</span>
            </Link>
          </li>
          {breadcrumbs.map((crumb, index) => (
            <li key={crumb.url} className="flex items-center">
              <ChevronRight className="h-4 w-4 mx-1" />
              {index === breadcrumbs.length - 1 ? (
                <span className="font-medium text-gray-900">{crumb.label}</span>
              ) : (
                <Link to={crumb.url} className="hover:text-gray-700">
                  {crumb.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar for desktop */}
      <aside
        className={`hidden lg:flex lg:flex-col ${
          isDesktopSidebarOpen ? "lg:w-64" : "lg:w-16"
        } transition-all duration-300 ease-in-out`}
      >
        <Sidebar />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar isMobile={true} />
        </SheetContent>
      </Sheet>

      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="flex items-center justify-between p-4 border-b lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
          </Sheet>
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <div className="w-6" /> {/* Placeholder for alignment */}
        </header>

        {/* Main content */}
        <div className="p-6">
          <Breadcrumbs />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
