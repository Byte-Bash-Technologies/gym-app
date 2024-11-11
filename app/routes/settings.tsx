import { Outlet } from "@remix-run/react"
import { ArrowLeft, Bell, Phone, Settings as SettingsIcon, RefreshCcw, MessageSquare, BarChart, User2, Clock } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { Card } from "~/components/ui/card"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeft className="h-6 w-6 cursor-pointer" onClick={() => window.history.back()} />
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
        <div className="flex items-center gap-4">
          <Bell className="h-6 w-6 text-purple-500" />
          <Phone className="h-6 w-6 text-purple-500" />
          <SettingsIcon className="h-6 w-6 text-purple-500" />
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Profile Section */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Avatar className="w-24 h-24">
            <AvatarImage src="/placeholder.svg" alt="Benston" />
            <AvatarFallback>B</AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-bold">Benston</h2>
          <p className="text-gray-500">bensportskk2gmail.com</p>
          <p className="text-gray-500">+91 9876543214</p>
        </div>

        {/* Your Gym Section */}
        <section className="space-y-2">
          <h2 className="text-xl font-bold">Your Gym</h2>
          <Card className="p-4 bg-purple-50">
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src="/placeholder.svg" alt="Jain workout zone" />
                <AvatarFallback>J</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold">Jain workout zone</h3>
                <p className="text-gray-500">#aueueu</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Current plan</h4>
              <p className="text-lg">3 months plan</p>
              <p className="text-green-500 text-sm inline-block bg-green-50 px-3 py-1 rounded-full">
                • Expiring in 2 months
              </p>
              <Button variant="ghost" className="text-gray-500 pl-0">
                <RefreshCcw className="h-4 w-4 mr-2" />
                Change plan
              </Button>
            </div>
          </Card>
        </section>

        {/* Manage Gym Section */}
        <section className="space-y-2">
          <h2 className="text-xl font-bold">Manage Gym</h2>
          <Card className="divide-y">
            <Button variant="ghost" className="w-full justify-start p-4" onClick={() => window.location.href = 'settings/message-template'}>
              <MessageSquare className="h-5 w-5 mr-3 text-purple-500" />
              Message templates
            </Button>
            <Button variant="ghost" className="w-full justify-start p-4" onClick={()=> window.location.href='settings/plans'}>
              <BarChart className="h-5 w-5 mr-3 text-purple-500" />
              Plans
            </Button>
          </Card>
        </section>

        {/* Sportsdot Section */}
        <section className="space-y-2">
          <h2 className="text-xl font-bold">Sportsdot</h2>
          <Card className="divide-y">
            <Button variant="ghost" className="w-full justify-start p-4">
              <User2 className="h-5 w-5 mr-3 text-purple-500" />
              Contact us
            </Button>
            <Button variant="ghost" className="w-full justify-start p-4">
              <Clock className="h-5 w-5 mr-3 text-purple-500" />
              Support and Information
            </Button>
          </Card>
        </section>

        {/* Logout Button */}
        <Button 
          className="w-full bg-purple-500 hover:bg-purple-600 text-white py-6 rounded-full text-lg mt-8"
        >
          Logout
        </Button>
        <Outlet />
      </main>
    </div>
  )
}