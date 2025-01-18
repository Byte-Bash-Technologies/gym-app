import { useState } from "react";
import { json, type LoaderFunction } from "@remix-run/node";
import { useLoaderData, Link, useParams, useFetcher, useNavigate } from "@remix-run/react";
import { format, parseISO } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, Phone, Settings, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Calendar as CalendarComponent } from "~/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { supabase } from "~/utils/supabase.server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { AttendanceStatus } from "~/types/attendance";

export const loader: LoaderFunction = async ({ params, request }) => {
  const { facilityId } = params;
  const url = new URL(request.url);
  const selectedDate = url.searchParams.get('date') || format(new Date(), "yyyy-MM-dd");

  // Fetch members with their attendance for the selected date
  const { data: members } = await supabase
    .from("members")
    .select(`
      id, 
      full_name, 
      photo_url, 
      memberships(status, end_date),
      attendance(
        status,
        check_in_time,
        check_out_time,
        notes
      )
    `)
    .eq("facility_id", facilityId)
    .order("full_name");

  // Fetch attendance for the selected date
  const { data: dateAttendance } = await supabase
    .from("attendance")
    .select("*")
    .eq("facility_id", facilityId)
    .eq("date", selectedDate);

  // Calculate attendance statistics for selected date
  const attendanceStats = {
    total: dateAttendance?.length || 0,
    byStatus: {
      present: dateAttendance?.filter(a => a.status === 'present').length || 0,
      absent: dateAttendance?.filter(a => a.status === 'absent').length || 0,
      late: dateAttendance?.filter(a => a.status === 'late').length || 0,
    }
  };


  // Prepare data for charts (This part remains largely the same, but could be optimized)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: attendance } = await supabase
    .from("attendance")
    .select("*")
    .eq("facility_id", facilityId)
    .gte("date", startOfMonth.toISOString())
    .order("date", { ascending: false });

  const dailyAttendance = attendance?.reduce((acc: any, curr) => {
    const date = format(new Date(curr.date), "MM-dd");
    if (!acc[date]) {
      acc[date] = { total: 0, present: 0, absent: 0, late: 0 };
    }
    acc[date].total++;
    acc[date][curr.status]++;
    return acc;
  }, {});

  const chartData = Object.entries(dailyAttendance || {}).map(([date, counts]) => ({
    date,
    ...counts,
  })).slice(-7);

  // Calculate time distribution (This part remains the same)
  const timeDistribution = attendance?.reduce((acc: any, curr) => {
    const hour = new Date(curr.date).getHours();
    if (hour < 12) acc.morning++;
    else if (hour < 17) acc.afternoon++;
    else acc.evening++;
    return acc;
  }, { morning: 0, afternoon: 0, evening: 0 });

  return json({
    members: members?.map(m => ({
      ...m,
      isActive: m.memberships?.[0]?.status === "active",
      selectedDateAttendance: dateAttendance?.find(a => a.member_id === m.id),
    })) || [],
    selectedDate,
    attendanceStats,
    chartData,
    timeDistribution,
  });
};

export default function AttendancePage() {
  const navigate = useNavigate();
  const { members, attendanceStats, chartData, timeDistribution, selectedDate } = useLoaderData<typeof loader>();
  const [date, setDate] = useState<Date>(parseISO(selectedDate));
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [attendanceNotes, setAttendanceNotes] = useState("");
  const params = useParams();
  const fetcher = useFetcher();
  const isCurrentDate = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  const filteredMembers = members.filter(member =>
    member.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  const pieData = [
    { name: 'Morning', value: timeDistribution.morning },
    { name: 'Afternoon', value: timeDistribution.afternoon },
    { name: 'Evening', value: timeDistribution.evening },
  ];

  const handleAttendanceAction = (memberId: string, action: string, status?: AttendanceStatus, formData?: FormData) => {
    const data = new FormData();
    data.append("memberId", memberId);
    data.append("facilityId", params.facilityId!);
    data.append("date", format(date, "yyyy-MM-dd"));
    data.append("_action", action);
    if (status) {
      data.append("status", status);
      data.append("notes", attendanceNotes);
    }
    if (formData) {
      data.append("notes", formData.get("notes") as string);
    }
    fetcher.submit(data, { method: "post", action: "/attendance/action" });
  };

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'late':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f0ebff] dark:bg-[#212237] pb-20">
      <header className="bg-white dark:bg-[#212237] p-4 flex items-center justify-between border-b border-[#8e76af]/20">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Attendance</h1>
        </div>
        <div className="flex items-center space-x-4">
          <a href="tel:7010976271">
            <Phone className="h-6 w-6 text-[#8e76af]" />
          </a>
          <Link to={`/${params.facilityId}/settings`}>
            <Settings className="h-6 w-6 text-[#8e76af]" />
          </Link>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <Tabs defaultValue="mark" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="mark">Mark Attendance</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          </TabsList>

          <TabsContent value="mark" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle>Attendance Calendar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-4">
                    <div className="flex justify-between items-center">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const prev = new Date(date);
                          prev.setDate(prev.getDate() - 1);
                          setDate(prev);
                        }}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="font-medium">
                        {format(date, "MMMM d, yyyy")}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const next = new Date(date);
                          next.setDate(next.getDate() + 1);
                          setDate(next);
                        }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <CalendarComponent
                      mode="single"
                      selected={date}
                      onSelect={(newDate) => {
                        if (newDate) {
                          setDate(newDate);
                          const formattedDate = format(newDate, "yyyy-MM-dd");
                          navigate(`?date=${formattedDate}`);
                        }
                      }}
                      className="rounded-md border"
                    />
                    <Card className="mt-4">
                      <CardHeader>
                        <CardTitle className="text-sm">Attendance Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-green-500">{attendanceStats.byStatus.present}</div>
                            <div className="text-xs text-muted-foreground">Present</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-yellow-500">{attendanceStats.byStatus.late}</div>
                            <div className="text-xs text-muted-foreground">Late</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-red-500">{attendanceStats.byStatus.absent}</div>
                            <div className="text-xs text-muted-foreground">Absent</div>
                          </div>
                        </div>
                        <div className="mt-2 text-center">
                          <div className="text-sm text-muted-foreground">Total: {attendanceStats.total}</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              <Card className="flex-[2]">
                <CardHeader>
                  <CardTitle>Members</CardTitle>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search members..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                    <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-2 hover:bg-accent rounded-lg transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <Avatar>
                            <AvatarImage
                              src={member.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${member.full_name}`}
                              alt={member.full_name}
                            />
                            <AvatarFallback>{member.full_name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.full_name}</p>
                            <Badge variant={member.isActive ? "default" : "destructive"}>
                              {member.isActive ? "Active" : "Inactive"}
                            </Badge>
                            {member.selectedDateAttendance && (
                              <div className="flex items-center mt-1 text-sm text-muted-foreground">
                                {getStatusIcon(member.selectedDateAttendance.status)}
                                <span className="ml-1 capitalize">{member.selectedDateAttendance.status}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {isCurrentDate && !member.selectedDateAttendance ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline">Mark Attendance</Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Mark Attendance - {member.full_name}</DialogTitle>
                                </DialogHeader>
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    formData.append("notes", attendanceNotes);
                                    handleAttendanceAction(member.id, "check-in", formData.get("status") as AttendanceStatus, formData);
                                    setAttendanceNotes("");
                                  }}
                                  className="space-y-4 mt-4"
                                >
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Status</label>
                                    <Select name="status" required>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="present">Present</SelectItem>
                                        <SelectItem value="late">Late</SelectItem>
                                        <SelectItem value="absent">Absent</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Notes</label>
                                    <Textarea
                                      value={attendanceNotes}
                                      onChange={(e) => setAttendanceNotes(e.target.value)}
                                      placeholder="Add any notes..."
                                    />
                                  </div>
                                  <Button type="submit" className="w-full">Mark Attendance</Button>
                                </form>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            isCurrentDate && member.selectedDateAttendance && !member.selectedDateAttendance?.check_out_time && (
                              <Button
                                variant="outline"
                                onClick={() => handleAttendanceAction(member.id, "check-out")}
                              >
                                Check Out
                              </Button>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Today's Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-[#8e76af]">
                    {attendanceStats.today}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    <div>Present: {attendanceStats.byStatus.present}</div>
                    <div>Late: {attendanceStats.byStatus.late}</div>
                    <div>Absent: {attendanceStats.byStatus.absent}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-[#8e76af]">
                    {attendanceStats.total}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    total check-ins
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Daily Average</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-[#8e76af]">
                    {attendanceStats.averagePerDay}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    members per day
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="present"
                          stroke="#22c55e"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="late"
                          stroke="#eab308"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="absent"
                          stroke="#ef4444"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Time Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

