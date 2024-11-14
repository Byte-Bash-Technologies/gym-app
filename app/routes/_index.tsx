import { json, type LoaderFunction } from "@remix-run/node";
import { useLoaderData, Link, useNavigate } from "@remix-run/react";
import {
  Dumbbell,
  Volleyball,
  Users,
  DollarSign,
  Calendar,
  ChevronRight,
  Settings,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";

interface Facility {
  id: string;
  name: string;
  type: "gym" | "badminton";
  members: number;
  revenue: number;
  lastBilling: string;
}

interface LoaderData {
  facilities: Facility[];
  userName: string;
}

export const loader: LoaderFunction = async () => {
  // Mock data - replace with actual data fetching in a real application
  const facilities: Facility[] = [
    {
      id: "1",
      name: "Jain workout zone",
      type: "gym",
      members: 250,
      revenue: 15000,
      lastBilling: "2023-04-01",
    },
    {
      id: "2",
      name: "Fitness First",
      type: "gym",
      members: 180,
      revenue: 12000,
      lastBilling: "2023-04-05",
    },
    {
      id: "3",
      name: "Gold's Gym",
      type: "gym",
      members: 300,
      revenue: 20000,
      lastBilling: "2023-04-03",
    },
    {
      id: "4",
      name: "Smash Masters",
      type: "badminton",
      members: 100,
      revenue: 8000,
      lastBilling: "2023-04-02",
    },
    {
      id: "5",
      name: "Shuttle Stars",
      type: "badminton",
      members: 80,
      revenue: 6000,
      lastBilling: "2023-04-04",
    },
    {
      id: "6",
      name: "Racquet Club",
      type: "badminton",
      members: 120,
      revenue: 9000,
      lastBilling: "2023-04-06",
    },
  ];

  const userName = "John Doe"; // Replace with actual user name fetching logic

  return json({ facilities, userName });
};

export default function Dashboard() {
  const { facilities, userName } = useLoaderData<LoaderData>();

  const gyms = facilities.filter((f) => f.type === "gym");
  const badmintonFacilities = facilities.filter((f) => f.type === "badminton");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/">{/* <ArrowLeft className="h-6 w-6 mr-2" /> */}</Link>
          <h1 className="text-xl font-bold">Facility Dashboard</h1>
        </div>
        <Link to="/settings">
          <Settings className="h-6 w-6 text-gray-600" />
        </Link>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        <h2 className="text-2xl font-bold mb-4">Welcome, {userName}</h2>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="all">All Facilities</TabsTrigger>
            <TabsTrigger value="gyms">Gyms</TabsTrigger>
            <TabsTrigger value="badminton">Badminton</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <FacilityGrid facilities={facilities} />
          </TabsContent>
          <TabsContent value="gyms">
            <FacilityGrid facilities={gyms} />
          </TabsContent>
          <TabsContent value="badminton">
            <FacilityGrid facilities={badmintonFacilities} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function FacilityGrid({ facilities }: { facilities: Facility[] }) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {facilities.map((facility) => (
        <Card
          key={facility.id}
          className={`${
            facility.type === "gym" ? "border-blue-200" : "border-green-200"
          } cursor-pointer hover:shadow-md transition-shadow`}
          onClick={() => navigate(`/home/?facilityId=${facility.id}`)}
        >
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{facility.name}</CardTitle>
              <Badge
                variant={facility.type === "gym" ? "default" : "secondary"}
              >
                {facility.type === "gym" ? (
                  <Dumbbell className="h-4 w-4 mr-1" />
                ) : (
                  <Volleyball className="h-4 w-4 mr-1" />
                )}
                {facility.type === "gym" ? "Gym" : "Badminton"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-500" />
                <span>{facility.members} members</span>
              </div>
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-green-500" />
                <span>${facility.revenue.toLocaleString()} revenue</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-purple-500" />
                <span>
                  Last billed:{" "}
                  {new Date(facility.lastBilling).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <ChevronRight className="h-6 w-6 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
