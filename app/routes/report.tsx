import { ArrowLeft,PieChart,Wallet, Bell, Phone, Settings, Search, Download, CheckCircle, ChevronDown, Home, Users } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Card } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Avatar } from "~/components/ui/avatar"
import { Link } from "@remix-run/react"


export default function ReportPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          <ArrowLeft className="h-6 w-6 mr-4" />
          <h1 className="text-xl font-bold">Report</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Bell className="h-6 w-6 text-purple-500" />
          <Phone className="h-6 w-6 text-purple-500" />
          <Link to="/settings">
            <Settings className="h-6 w-6 text-purple-500" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Input
            type="text"
            placeholder="Search by name or number"
            className="pl-10 pr-10 py-2 w-full bg-white rounded-full"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-purple-500" />
            <Download className="h-5 w-5 text-purple-500" />
          </div>
        </div>

        {/* Financial Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-green-500 text-xl font-bold">₹120000</p>
            <p className="text-sm text-gray-500">Total received</p>
          </Card>
          <Card className="p-4">
            <p className="text-yellow-500 text-xl font-bold">₹2574</p>
            <p className="text-sm text-gray-500">Pending payment</p>
          </Card>
          <Card className="p-4">
            <p className="text-blue-500 text-xl font-bold">₹2574</p>
            <p className="text-sm text-gray-500">All time balance</p>
          </Card>
        </div>

        {/* Transactions and Income */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Transactions Chart */}
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Transcations</h3>
              <Button variant="secondary" size="sm">Today</Button>
            </div>
            <div className="relative w-48 h-48 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-8 border-blue-500" style={{ clipPath: 'polygon(0 0, 54% 0, 54% 100%, 0% 100%)' }} />
              <div className="absolute inset-0 rounded-full border-8 border-green-500" style={{ clipPath: 'polygon(54% 0, 74% 0, 74% 100%, 54% 100%)' }} />
              <div className="absolute inset-0 rounded-full border-8 border-red-500" style={{ clipPath: 'polygon(74% 0, 100% 0, 100% 100%, 74% 100%)' }} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="flex items-center"><span className="w-3 h-3 bg-blue-500 rounded-full mr-2" /> Total received</span>
                <span className="text-green-500">54% ↑</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center"><span className="w-3 h-3 bg-green-500 rounded-full mr-2" /> Total Paid</span>
                <span className="text-green-500">20% ↑</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center"><span className="w-3 h-3 bg-red-500 rounded-full mr-2" /> Total Pending</span>
                <span className="text-red-500">26% ↓</span>
              </div>
            </div>
          </Card>

          {/* Income Summary */}
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Income</h3>
              <span className="text-sm text-gray-500">Today</span>
            </div>
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold">$ 5660.00</span>
                <span className="text-green-500">↑ 2.5%</span>
              </div>
              <p className="text-sm text-gray-500">Compared to $5240 yesterday</p>
              <div className="flex justify-between text-sm">
                <span>Last week incomes</span>
                <span className="font-semibold">$22658.00</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold">Earning Summary</h4>
                <Button variant="outline" size="sm">
                  Mar 2022 - Oct 2022 <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <div className="h-40 bg-blue-100 rounded-lg"></div>
            </div>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Recent Transactions</h3>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between bg-purple-100 p-3 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <img src="/placeholder.svg" alt="Img" className="rounded-full" />
                  </Avatar>
                  <div>
                    <p className="font-semibold">Benston</p>
                    <p className="text-sm text-gray-500">sent yesterday 01:07 PM</p>
                  </div>
                </div>
                <span className="text-green-500 font-semibold">+1000</span>
              </div>
            ))}
          </div>
        </Card>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-purple-100 p-4 rounded-t-3xl">
        <div className="flex justify-around items-center">
          <Link to="/" className="flex flex-col items-center text-gray-500">
              <Home className="h-6 w-6 "/>
            <span className="text-xs">Home</span>
          </Link>
          <Link to="/transaction" className="flex flex-col items-center text-gray-500">
            <Wallet className="h-6 w-6" />
            <span className="text-xs">Transaction</span>
          </Link>
          <Link to="/report" className="flex flex-col items-center text-gray-500">
          <div className="bg-purple-500 rounded-full p-3">
            <PieChart className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs text-purple-500">Report</span>
          </Link>
          <Link to="/members" className="flex flex-col items-center text-gray-500">
            <Users className="h-6 w-6" />
            <span className="text-xs">Members</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}