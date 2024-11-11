import { json, type LoaderFunction } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { ArrowLeft, Bell, Phone, Settings, Download, RefreshCcw, Pencil, Trash2, MessageSquareDiff } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"

interface Member {
  id: number;
  name: string;
  email: string;
  phone: string;
  plan: string;
  status: string;
  gender: string;
  dob: string;
  bloodType: string;
  height: string;
  weight: string;
}

export const loader: LoaderFunction = async ({ params }) => {
  // Mock data for a single member
  const member: Member = {
    id: parseInt(params.memberId || "1"),
    name: "Benston",
    email: "bensportskk2gmail.com",
    phone: "+91 9876543214",
    plan: "3 months plan",
    status: "Active",
    gender: "Male",
    dob: "23-1-2002",
    bloodType: "B +ive",
    height: "198 cm",
    weight: "70 kg"
  };

  return json({ member });
};

export default function MemberProfile() {
  const { member } = useLoaderData<{ member: Member }>();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link to="/members">
            <ArrowLeft className="h-6 w-6 mr-2" />
          </Link>
          <h1 className="text-xl font-bold">Members</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Bell className="h-6 w-6 text-purple-500" />
          <Phone className="h-6 w-6 text-purple-500" />
          <Settings className="h-6 w-6 text-purple-500" />
        </div>
      </header>

      {/* Profile Section */}
      <div className="flex flex-col items-center mb-6">
        <Avatar className="w-24 h-24 mb-2">
          <AvatarImage src="/placeholder.svg" alt={member.name} />
          <AvatarFallback>{member.name[0]}</AvatarFallback>
        </Avatar>
        <h2 className="text-xl font-bold">{member.name}</h2>
        <p className="text-gray-500">{member.email}</p>
        <p className="text-gray-500">{member.phone}</p>
        <Button variant="ghost" className="mt-2">
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>

      {/* Current Plan */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">
            <Avatar className="w-6 h-6 mr-2 inline-block">
              <AvatarImage src="/placeholder.svg" alt="Jain workout zone" />
              <AvatarFallback>J</AvatarFallback>
            </Avatar>
            Jain workout zone
          </CardTitle>
          <span className="text-sm text-gray-500">#aueueu</span>
        </CardHeader>
        <CardContent>
          <h3 className="font-semibold mb-2">Current plan</h3>
          <p className="text-lg font-bold mb-1">{member.plan}</p>
          <p className="text-sm text-green-500 mb-2">• Expiring in 2 months</p>
          <div className="space-x-4">
          <Button variant="outline" size="sm">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Change plan
          </Button>
          <Button variant="outline" size="sm">
            <MessageSquareDiff className="h-4 w-4 mr-2" />
            Add plan
          </Button>
          </div>
        </CardContent>
      </Card>

      {/* Member Details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">Member details</CardTitle>
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500">Gender</p>
              <p className="font-semibold">{member.gender}</p>
            </div>
            <div>
              <p className="text-gray-500">Date of Birth</p>
              <p className="font-semibold">{member.dob}</p>
            </div>
            <div>
              <p className="text-gray-500">Blood Type</p>
              <p className="font-semibold">{member.bloodType}</p>
            </div>
            <div>
              <p className="text-gray-500">Height</p>
              <p className="font-semibold">{member.height}</p>
            </div>
            <div>
              <p className="text-gray-500">Weight</p>
              <p className="font-semibold">{member.weight}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}