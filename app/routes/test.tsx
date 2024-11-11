import { useState } from 'react'
import { json, LoaderFunction } from '@remix-run/node'
import { useLoaderData, Link, useFetcher } from '@remix-run/react'
import { jsPDF } from 'jspdf'

// Assuming you've installed and imported your UI components
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table"

// Assuming you've installed and imported Lucide icons
import { ArrowLeft, BellRing, ChevronDown, ChevronLeft, ChevronRight, Download, Filter, Home, Phone, Search, Settings, Share2, UserCircle, Wallet2 } from "lucide-react"

// Mock data
const members = [
  { name: "Benston", phone: "+ 91 98765432", plan: "1 month plan", status: "active", paymentAmount: 50, paymentDate: "2023-11-01" },
  { name: "Benny", phone: "+ 91 98765432", plan: "3 months plan", status: "active", paymentAmount: 120, paymentDate: "2023-10-15" },
  { name: "Nithesh", phone: "+ 91 98765432", plan: "1 month plan", status: "expired", paymentAmount: 50, paymentDate: "2023-09-30" },
  { name: "Tony", phone: "+ 91 98765432", plan: "12 months plan", status: "expire-soon", paymentAmount: 450, paymentDate: "2023-01-01" },
  { name: "Ragul", phone: "+ 91 98765432", plan: "6 months plan", status: "active", paymentAmount: 250, paymentDate: "2023-07-01" },
  { name: "Maxwel", phone: "+ 91 98765432", plan: "3 months plan", status: "active", paymentAmount: 120, paymentDate: "2023-09-15" },
]

const generateMockAttendanceData = () => {
  const daysInMonth = 30 // Assuming 30 days for simplicity
  const data = {}
  for (let i = 1; i <= daysInMonth; i++) {
    data[i] = {
      totalPresent: Math.floor(Math.random() * 50) + 50,
      earlyArrivals: Math.floor(Math.random() * 20) + 10,
      lateArrivals: Math.floor(Math.random() * 15) + 5,
      members: members.map(member => ({
        ...member,
        status: Math.random() > 0.2 ? 'Present' : 'Absent',
        arrivalTime: Math.random() > 0.7 ? '9:00 AM' : '10:30 AM'
      }))
    }
  }
  return data
}

export const loader: LoaderFunction = async () => {
  // In a real app, you'd fetch data from a database here
  return json({
    members,
    attendanceData: generateMockAttendanceData(),
  })
}

export default function GymDashboard() {
  const { members, attendanceData } = useLoaderData<typeof loader>()
  const [currentView, setCurrentView] = useState('dashboard')
  const [currentMonth, setCurrentMonth] = useState('November')
  const [currentYear, setCurrentYear] = useState('2023')

  const ReceiptGenerator = ({ member }) => {
    const generatePDF = () => {
      const doc = new jsPDF()
      
      doc.setFontSize(22)
      doc.text('Payment Receipt', 105, 20, { align: 'center' })
      
      doc.setFontSize(12)
      doc.text(`Name: ${member.name}`, 20, 40)
      doc.text(`Phone: ${member.phone}`, 20, 50)
      doc.text(`Plan: ${member.plan}`, 20, 60)
      doc.text(`Amount Paid: $${member.paymentAmount.toFixed(2)}`, 20, 70)
      doc.text(`Payment Date: ${member.paymentDate}`, 20, 80)
      
      doc.setFontSize(10)
      doc.text('Thank you for your payment!', 105, 100, { align: 'center' })
      
      return doc
    }

    const handleDownload = () => {
      const doc = generatePDF()
      doc.save(`${member.name}_receipt.pdf`)
    }

    const handleShare = async () => {
      const doc = generatePDF()
      const pdfBlob = doc.output('blob')
      const file = new File([pdfBlob], `${member.name}_receipt.pdf`, { type: 'application/pdf' })

      if (navigator.share) {
        try {
          await navigator.share({
            files: [file],
            title: 'Payment Receipt',
            text: `Payment receipt for ${member.name}`,
          })
        } catch (error) {
          console.error('Error sharing:', error)
        }
      } else {
        console.log('Web Share API not supported')
        const pdfUrl = URL.createObjectURL(pdfBlob)
        window.open(pdfUrl, '_blank')
      }
    }

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">View Receipt</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>Name: {member.name}</div>
            <div>Phone: {member.phone}</div>
            <div>Plan: {member.plan}</div>
            <div>Amount Paid: ${member.paymentAmount.toFixed(2)}</div>
            <div>Payment Date: {member.paymentDate}</div>
          </div>
          <div className="flex justify-end gap-4">
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const DashboardView = () => (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">120</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expiring soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">130</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expired members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">120</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">120</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Birthdays Today</h2>
        <div className="flex gap-4 overflow-auto pb-2">
          {[1, 2, 3].map((i) => (
            <Avatar key={i} className="h-20 w-20 border-2 border-purple-200">
              <AvatarImage src="/placeholder.svg" alt={`Birthday person ${i}`} />
              <AvatarFallback>BP</AvatarFallback>
            </Avatar>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Transactions</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Transaction Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative h-40 w-40 mx-auto">
                <div className="rounded-full border-8 border-blue-500 h-full w-full" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Total received</div>
                    <div className="font-bold">54%</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    <span>Total received</span>
                  </div>
                  <span>54%</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span>Total Paid</span>
                  </div>
                  <span>20%</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <span>Total Pending</span>
                  </div>
                  <span>26%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-3xl font-bold">$ 5660.00</div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Compared to $5240 yesterday</span>
                    <span className="text-green-500">↑ 2.5%</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Last week incomes</div>
                  <div className="font-semibold">$22658.00</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )

  const MembersView = () => (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or number" />
        </div>
        <button className="p-2 bg-purple-100 rounded-lg">
          <Filter className="h-5 w-5 text-purple-500" />
        </button>
        <button className="p-2 bg-purple-100 rounded-lg">
          <UserCircle className="h-5 w-5 text-purple-500" />
        </button>
      </div>

      <h2 className="text-xl font-semibold">All members</h2>

      <div className="bg-purple-50 rounded-3xl p-4 space-y-4">
        {members.map((member, index) => (
          <div key={index} className="flex items-center gap-3 border-b border-purple-100 last:border-0 pb-4 last:pb-0">
            <Avatar className="h-12 w-12">
              <AvatarImage src="/placeholder.svg" alt={member.name} />
              <AvatarFallback>{member.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold">{member.name}</h3>
              <p className="text-sm text-muted-foreground">{member.phone}</p>
              <p className="text-sm text-muted-foreground">{member.plan}</p>
            </div>
            <div className={`
              h-2 w-2 rounded-full
              ${member.status === 'active' ? 'bg-green-500' : 
                member.status === 'expired' ? 'bg-red-500' : 
                'bg-yellow-500'}
            `} />
            <ReceiptGenerator member={member} />
          </div>
        ))}
      </div>
    </div>
  )

  const AttendanceView = () => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    const getTotalAttendance = () => {
      return Object.values(attendanceData).reduce((sum, day) => sum + day.totalPresent, 0)
    }

    const getAverageAttendance = () => {
      const total = getTotalAttendance()
      return Math.round(total / Object.keys(attendanceData).length)
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ChevronLeft className="h-6 w-6 text-purple-500 cursor-pointer" />
            <h2 className="text-xl font-semibold">{currentMonth} {currentYear}</h2>
            <ChevronRight className="h-6 w-6 text-purple-500 cursor-pointer" />
          </div>
          <Select defaultValue={currentMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month) => (
                <SelectItem key={month} value={month}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getTotalAttendance()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Average Daily Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getAverageAttendance()}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {daysOfWeek.map((day) => (
            <div key={day} className="text-center font-semibold">{day}</div>
          ))}
          {Object.entries(attendanceData).map(([day, data]) => (
            <Dialog key={day}>
              <DialogTrigger asChild>
                <Card className="p-2 text-center cursor-pointer hover:bg-purple-50 transition-colors">
                  <div className="font-bold">{day}</div>
                  <div className="text-sm">{data.totalPresent}</div>
                  <div className="text-xs text-green-500">+{data.earlyArrivals}</div>
                  <div className="text-xs text-red-500">-{data.lateArrivals}</div>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Attendance for {currentMonth} {day}, {currentYear}</DialogTitle>
                </DialogHeader>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Arrival Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.members.map((member, index) => (
                      <TableRow key={index}>
                        <TableCell>{member.name}</TableCell>
                        <TableCell className={member.status === 'Present' ? 'text-green-500' : 'text-red-500'}>
                          {member.status}
                        </TableCell>
                        <TableCell>{member.status === 'Present' ? member.arrivalTime : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="flex items-center gap-2 p-4 max-w-6xl mx-auto">
          <Avatar className="h-12 w-12">
            <AvatarImage src="/placeholder.svg" alt="Logo" />
            <AvatarFallback>JW</AvatarFallback>
          </Avatar>
          <h1 className="font-semibold text-xl">Jain workout zone</h1>
          <div className="ml-auto flex items-center gap-4">
            <BellRing className="h-6 w-6 text-purple-500" />
            <Phone className="h-6 w-6 text-purple-500" />
            <Settings className="h-6 w-6 text-purple-500" />
          </div>
        </div>
      </header>

      <main className="p-4 max-w-6xl mx-auto">
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'members' && <MembersView />}
        {currentView === 'attendance' && <AttendanceView />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="flex justify-around p-4 max-w-6xl mx-auto">
          <button onClick={() => setCurrentView('dashboard')} className={`flex flex-col items-center gap-1 ${currentView === 'dashboard' ? 'text-purple-500' : ''}`}>
            <Home className="h-6 w-6" />
            <span className="text-xs">Home</span>
          </button>
          <button onClick={() => setCurrentView('members')} className={`flex flex-col items-center gap-1 ${currentView === 'members' ? 'text-purple-500' : ''}`}>
            <UserCircle className="h-6 w-6" />
            <span className="text-xs">Members</span>
          </button>
          <button onClick={() => setCurrentView('attendance')} className={`flex flex-col items-center gap-1 ${currentView === 'attendance' ? 'text-purple-500' : ''}`}>
            <Wallet2 className="h-6 w-6" />
            <span className="text-xs">Attendance</span>
          </button>
        </div>
      </nav>
    </div>
  )
}