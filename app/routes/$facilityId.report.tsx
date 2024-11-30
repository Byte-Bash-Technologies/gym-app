import { useState, useEffect } from "react";
import { useLoaderData, Link, useParams, useNavigate } from "@remix-run/react";
import {
  Bell,
  Phone,
  Settings,
  Search,
  Download,
  ArrowUp,
  ArrowDown,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import {
  Area,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";
import BottomNav from "~/components/BottomNav";
import { loader } from "./reports.$facilityId.loader";

export { loader };

export default function ReportPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { metrics, transactions, transactionStats, income, earningSummary } =
    useLoaderData<typeof loader>();
  const [searchTerm, setSearchTerm] = useState("");

  // Calculate total amount and percentages for the pie chart
  const totalAmount = metrics.totalReceived + metrics.pendingPayment;
  const receivedPercentage = (metrics.totalReceived / totalAmount) * 100;
  const pendingPercentage = (metrics.pendingPayment / totalAmount) * 100;

  // Calculate stroke-dasharray and stroke-dashoffset for each segment
  const circumference = 2 * Math.PI * 45;
  const receivedDash = (receivedPercentage / 100) * circumference;
  const pendingDash = (pendingPercentage / 100) * circumference;

  useEffect(() => {
    // Implement client-side search logic here
    // This is just a placeholder, adjust according to your needs
    if (searchTerm) {
      // Perform search and update state
    }
  }, [searchTerm]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterClick = () => {
    // Implement filter logic
    console.log("Filter clicked");
  };

  const handleDownloadClick = () => {
    // Implement download logic
    console.log("Download clicked");
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      {/* Header */}
      <header className="bg-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-xl font-bold ml-6">Report</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Bell className="h-6 w-6 text-purple-500" />
          <a href="tel:7010976271">
            <Phone className="h-6 w-6 text-purple-500" />
          </a>
          <a href={`/${params.facilityId}/settings`}>
            <Settings className="h-6 w-6 text-purple-500" />
          </a>
          {/*<Link to={`/${params.facilityId}/settings`}>
            <Settings className="h-6 w-6 text-purple-500" />
          </Link>*/}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4">
        {/* Search */}
        <div className="p-4">
          <div className="relative flex items-center">
            <Input
              type="text"
              placeholder="Search by name or number"
              className="pl-10 pr-20 py-2 w-full bg-white rounded-full"
              value={searchTerm}
              onChange={handleSearch}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <div className="absolute right-3 flex space-x-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-purple-500"
                onClick={handleFilterClick}
              >
                <Filter className="text-purple-500">✓</Filter>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-purple-500"
                onClick={handleDownloadClick}
              >
                <Download className="h-5 w-5 text-purple-500" />
              </Button>
            </div>
          </div>
        </div>

        {/* Financial Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <CardContent>
              <p className="text-blue-500 text-xl font-bold">
                ₹{(metrics.totalReceived ?? 0).toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">Total received</p>
            </CardContent>
          </Card>
          <Card className="p-4">
            <CardContent>
              <p className="text-red-500 text-xl font-bold">
                ₹{(metrics.pendingPayment ?? 0).toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">Pending payment</p>
            </CardContent>
          </Card>
        </div>

        <div className="p-0 space-y-4">
          {/* Transactions and Income */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Transactions Chart */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Transactions</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative w-48 h-48 mx-auto mb-4">
                  <svg
                    viewBox="0 0 100 100"
                    className="transform -rotate-90 w-full h-full"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="10"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="10"
                      strokeDasharray={`${receivedDash} ${circumference}`}
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#F44336"
                      strokeWidth="10"
                      strokeDasharray={`${pendingDash} ${circumference}`}
                      strokeDashoffset={-receivedDash}
                    />
                  </svg>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center">
                      <span className="w-3 h-3 bg-blue-500 rounded-full mr-2" />
                      Total received
                    </span>
                    <span
                      className={
                        transactionStats.received > 50
                          ? "text-green-500"
                          : "text-red-500"
                      }
                    >
                      {(transactionStats.received ?? 0).toFixed(1)}%{" "}
                      {transactionStats.received > 50 ? (
                        <ArrowUp className="inline h-4 w-4" />
                      ) : (
                        <ArrowDown className="inline h-4 w-4" />
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center">
                      <span className="w-3 h-3 bg-red-500 rounded-full mr-2" />
                      Total Pending
                    </span>
                    <span
                      className={
                        transactionStats.pending > 50
                          ? "text-green-500"
                          : "text-red-500"
                      }
                    >
                      {(transactionStats.pending ?? 0).toFixed(1)}%{" "}
                      {transactionStats.pending > 50 ? (
                        <ArrowUp className="inline h-4 w-4" />
                      ) : (
                        <ArrowDown className="inline h-4 w-4" />
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Income Summary */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Income</CardTitle>
                  <Badge variant="secondary">Today</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-bold">
                      ₹{income.today.toFixed(2)}
                    </span>
                    <span
                      className={
                        income.percentageChange >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      }
                    >
                      {income.percentageChange >= 0 ? (
                        <ArrowUp className="inline h-4 w-4" />
                      ) : (
                        <ArrowDown className="inline h-4 w-4" />
                      )}{" "}
                      {Math.abs(income.percentageChange).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Compared to ₹{income.yesterday.toFixed(2)} yesterday
                  </p>
                  <div className="flex justify-between text-sm">
                    <span>Last week incomes</span>
                    <span className="font-semibold">
                      ₹
                      {earningSummary
                        .reduce((sum, day) => sum + day.amount, 0)
                        .toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold">Earning Summary</h4>
                  </div>
                  <Card className="p-4">
                    <CardContent className="p-0">
                      <div style={{ width: 276, height: 160 }}>
                        <ChartContainer
                          config={{
                            amount: {
                              label: "Amount",
                              color: "black",
                            },
                          }}
                          className="h-40 w-full"
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={earningSummary}
                              margin={{
                                top: 20,
                                right: 30,
                                left: 0,
                                bottom: 0,
                              }}
                            >
                              <XAxis
                                dataKey="date"
                                tickFormatter={(value) =>
                                  new Date(value).toLocaleDateString("en-US", {
                                    weekday: "short",
                                  })
                                }
                                tickLine={false}
                                axisLine={{ stroke: "black" }}
                                tick={{ fill: "black" }}
                              />
                              <YAxis
                                tickFormatter={(value) => `₹${value}`}
                                tickLine={false}
                                axisLine={{ stroke: "black" }}
                                tick={{ fill: "black" }}
                                tickCount={6}
                                domain={[0, 50000]}
                                ticks={[0, 10000, 30000, 50000]}
                              />
                              <CartesianGrid strokeDasharray="3 3" />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Area
                                type="monotone"
                                dataKey="amount"
                                stroke="hsl(var(--purple-500))"
                                fill="rgba(142, 216, 255, 0.4)"
                                strokeWidth={2}
                                fillOpacity={1}
                              />
                              <Line
                                type="monotone"
                                dataKey="amount"
                                stroke="lightblue"
                                strokeWidth={2}
                                dot={true}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div>
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between bg-purple-100 p-4 rounded-lg mb-2 last:mb-0"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage
                        src={`https://api.dicebear.com/6.x/initials/svg?seed=${transaction.user}`}
                        alt={transaction.user}
                      />
                      <AvatarFallback>{transaction.user[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{transaction.user}</p>
                      <p className="text-sm text-gray-500">
                        {transaction.timestamp}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-semibold ${
                      transaction.amount > 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {transaction.amount > 0 ? "+" : "-"}₹
                    {Math.abs(transaction.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
