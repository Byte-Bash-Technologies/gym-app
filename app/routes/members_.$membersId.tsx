"use client";

import { useState } from "react";
import { json, type LoaderFunction, ActionFunction } from "@remix-run/node";
import {
  useLoaderData,
  useActionData,
  useFetcher,
  Link,
  Outlet,
} from "@remix-run/react";
import {
  ArrowLeft,
  Bell,
  Phone,
  Settings,
  Download,
  RefreshCcw,
  Pencil,
  CreditCard,
  CalendarPlus,
  Save,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Sheet, SheetTrigger } from "~/components/ui/sheet";
import { Input } from "~/components/ui/input";
import { supabase } from "~/utils/supabase.server";

// interface Member {
//   id: string;
//   full_name: string;
//   email: string;
//   phone: string;
//   gender: string;
//   date_of_birth: string;
//   blood_type: string;
//   height: number;
//   weight: number;
//   admission_no: string;
//   joined_date: string;
//   status: string;
//   balance: number;
// }

// interface Plan {
//   name: string;
//   duration: number;
//   price: number;
// }

// interface Transaction {
//   id: string;
//   amount: number;
//   type: string;
//   payment_method: string;
//   created_at: string;
// }

export const loader: LoaderFunction = async ({ params }) => {
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("*")
    .eq("id", params.membersId)
    .single();

  if (memberError) throw new Response("Member not found", { status: 404 });

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("*, plans(*)")
    .eq("member_id", params.membersId)
    .eq("status", "active")
    .single();

  const { data: transactions, error: transactionsError } = await supabase
    .from("transactions")
    .select("*")
    .eq("member_id", params.membersId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (membershipError)
    console.error("Error fetching membership:", membershipError);
  if (transactionsError)
    console.error("Error fetching transactions:", transactionsError);

  return json({
    member,
    currentPlan: membership?.plans ?? null,
    recentTransactions: transactions ?? [],
  });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const memberId = formData.get("memberId") as string;
  const height = Number(formData.get("height"));
  const weight = Number(formData.get("weight"));

  const { data, error } = await supabase
    .from("members")
    .update({ height, weight })
    .eq("id", memberId)
    .single();

  if (error) {
    return json({ error: error.message }, { status: 400 });
  }

  return json({ success: true, member: data });
};

export default function MemberProfile() {
  const { member, currentPlan, recentTransactions } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const fetcher = useFetcher();

  const [isEditing, setIsEditing] = useState(false);
  const [newHeight, setNewHeight] = useState(member.height);
  const [newWeight, setNewWeight] = useState(member.weight);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    fetcher.submit(
      {
        memberId: member.id,
        height: newHeight,
        weight: newWeight,
      },
      { method: "post" }
    );
    setIsEditing(false);
  };

  // Update local state if the action was successful
  if (actionData?.success) {
    member.height = actionData.member.height;
    member.weight = actionData.member.weight;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link to="/members">
            <ArrowLeft className="h-6 w-6 mr-2" />
          </Link>
          <h1 className="text-xl font-bold">Member Profile</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Bell className="h-6 w-6 text-purple-500" />
          <Phone className="h-6 w-6 text-purple-500" />
          <Link to="/settings">
            <Settings className="h-6 w-6 text-purple-500" />
          </Link>
        </div>
      </header>

      {/* Profile Section */}
      <div className="flex flex-col items-center mb-6">
        <Avatar className="w-24 h-24 mb-2">
          <AvatarImage
            src={`https://api.dicebear.com/6.x/initials/svg?seed=${member.full_name}`}
            alt={member.full_name}
          />
          <AvatarFallback>{member.full_name[0]}</AvatarFallback>
        </Avatar>
        <h2 className="text-xl font-bold">{member.full_name}</h2>
        <p className="text-gray-500">{member.email}</p>
        <p className="text-gray-500">{member.phone}</p>
        <Button variant="ghost" className="mt-2">
          <Download className="h-4 w-4 mr-2" />
          Download Profile
        </Button>
      </div>

      {/* Current Plan */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">Current Plan</CardTitle>
          <span className="text-sm text-gray-500">#{member.admission_no}</span>
        </CardHeader>
        <CardContent>
          {currentPlan ? (
            <>
              <h3 className="font-semibold mb-2">{currentPlan.name}</h3>
              <p className="text-lg font-bold mb-1">
                ₹{currentPlan.price} for {currentPlan.duration} days
              </p>
              <p className="text-sm text-green-500 mb-2">• Active</p>
            </>
          ) : (
            <p className="text-sm text-yellow-500">No active plan</p>
          )}
          <div className="flex space-x-4">
            <Button variant="outline" size="sm">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Change plan
            </Button>
            <Link to="/addplans">
              <Button variant="outline" size="sm">
                <CalendarPlus className="h-4 w-4 mr-2" />
                Add plans
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Balance Section */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">Balance</CardTitle>
          <Badge variant={member.balance > 0 ? "destructive" : "secondary"}>
            ₹{member.balance}
          </Badge>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-2">
            {member.balance > 0
              ? "Outstanding balance on your account"
              : "Your account is up to date"}
          </p>
          {member.balance > 0 && (
            <Sheet open={isPaymentOpen}>
              <SheetTrigger asChild>
                <Link to="payment">
                  <Button variant="outline" size="sm">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay Balance
                  </Button>
                </Link>
              </SheetTrigger>
              <Outlet />
            </Sheet>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg font-bold">
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length > 0 ? (
            <ul className="space-y-2">
              {recentTransactions.map((transaction) => (
                <li
                  key={transaction.id}
                  className="flex justify-between items-center"
                >
                  <span className="text-sm">
                    {new Date(transaction.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-sm font-medium">
                    {transaction.type}
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      transaction.type === "payment"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {transaction.type === "payment" ? "-" : "+"} ₹
                    {transaction.amount}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No recent transactions</p>
          )}
        </CardContent>
      </Card>

      {/* Member Details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">Member details</CardTitle>
          <div className="flex space-x-2">
            {isEditing ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={fetcher.state === "submitting"}
              >
                <Save className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={handleEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
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
              <p className="font-semibold">
                {new Date(member.date_of_birth).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Blood Type</p>
              <p className="font-semibold">{member.blood_type}</p>
            </div>
            <div>
              <p className="text-gray-500">Height</p>
              {isEditing ? (
                <Input
                  type="number"
                  value={newHeight}
                  onChange={(e) => setNewHeight(Number(e.target.value))}
                  className="w-full"
                />
              ) : (
                <p className="font-semibold">{member.height} cm</p>
              )}
            </div>
            <div>
              <p className="text-gray-500">Weight</p>
              {isEditing ? (
                <Input
                  type="number"
                  value={newWeight}
                  onChange={(e) => setNewWeight(Number(e.target.value))}
                  className="w-full"
                />
              ) : (
                <p className="font-semibold">{member.weight} kg</p>
              )}
            </div>
            <div>
              <p className="text-gray-500">Joined Date</p>
              <p className="font-semibold">
                {new Date(member.joined_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {actionData?.error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          Error: {actionData.error}
        </div>
      )}
    </div>
  );
}
