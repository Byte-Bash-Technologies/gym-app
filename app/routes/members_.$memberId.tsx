import { json, type LoaderFunction, type ActionFunction } from "@remix-run/node";
import { useLoaderData, Link, useFetcher } from "@remix-run/react";
import { useState } from "react";
import { ArrowLeft, Bell, Phone, Settings, Download, RefreshCcw, Pencil, Trash2, CreditCard, Plus } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "~/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog"
import { Label } from "~/components/ui/label"
import { Input } from "~/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { supabase } from "~/utils/supabase.server"
import { toast } from "~/hooks/use-toast"
import { useNavigate } from 'react-router-dom';
interface Member {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  blood_type: string;
  height: number;
  weight: number;
  admission_no: string;
  joined_date: string;
  status: string;
  balance: number;
}

interface Membership {
  id: string;
  plans: {
    name: string;
    duration: number;
    price: number;
  } | null;
  start_date: string;
  end_date: string;
  status: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  payment_method: string;
  created_at: string;
}

interface LoaderData {
  member: Member;
  memberships: Membership[];
  recentTransactions: Transaction[];
}

export const loader: LoaderFunction = async ({ params }) => {
  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('*')
    .eq('id', params.memberId)
    .single();

  if (memberError) throw new Response("Member not found", { status: 404 });

  const { data: memberships, error: membershipsError } = await supabase
    .from('memberships')
    .select(`
      id,
      start_date,
      end_date,
      status,
      plans (
        name,
        duration,
        price
      )
    `)
    .eq('member_id', params.memberId)
    .order('start_date', { ascending: false });

  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select('*')
    .eq('member_id', params.memberId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (membershipsError) console.error("Error fetching memberships:", membershipsError);
  if (transactionsError) console.error("Error fetching transactions:", transactionsError);

  return json({
    member,
    memberships: memberships ?? [],
    recentTransactions: transactions ?? []
  });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const action = formData.get('_action');

  if (action === 'updateMember') {
    const memberId = formData.get('memberId') as string;
    const height = parseFloat(formData.get('height') as string);
    const weight = parseFloat(formData.get('weight') as string);

    const { error } = await supabase
      .from('members')
      .update({ height, weight })
      .eq('id', memberId);

    if (error) {
      return json({ error: "Failed to update member details" }, { status: 400 });
    }

    return json({ success: true, message: "Member details updated successfully" });
  } else if (action === 'payBalance') {
    const memberId = formData.get('memberId') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const paymentMethod = formData.get('paymentMethod') as string;

    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('balance')
      .eq('id', memberId)
      .single();

    if (memberError) {
      return json({ error: "Failed to fetch member balance" }, { status: 400 });
    }

    if (amount <= 0 || amount > member.balance) {
      return json({ error: "Invalid payment amount" }, { status: 400 });
    }

    const newBalance = member.balance - amount;

    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        member_id: memberId,
        amount,
        type: 'payment',
        payment_method: paymentMethod,
        status: 'completed'
      });

    if (transactionError) {
      return json({ error: "Failed to record transaction" }, { status: 500 });
    }

    const { error: updateError } = await supabase
      .from('members')
      .update({ balance: newBalance })
      .eq('id', memberId);

    if (updateError) {
      return json({ error: "Failed to update member balance" }, { status: 500 });
    }

    return json({ success: true, message: "Payment processed successfully" });
  }

  return json({ error: "Invalid action" }, { status: 400 });
};

export default function MemberProfile(Params) {
  const { member, memberships, recentTransactions } = useLoaderData<LoaderData>();
  console.log(memberships);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
  const fetcher = useFetcher();
const navigate = useNavigate();
  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.append('_action', 'updateMember');
    fetcher.submit(formData, { method: 'post' });
    setIsEditDialogOpen(false);
  };

  const handlePaymentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.append('_action', 'payBalance');
    fetcher.submit(formData, { method: 'post' });
    setIsPaymentSheetOpen(false);
  };

  if (fetcher.type === 'done') {
    if (fetcher.data.success) {
      toast({
        title: "Success",
        description: fetcher.data.message,
      });
    } else if (fetcher.data.error) {
      toast({
        title: "Error",
        description: fetcher.data.error,
        variant: "destructive",
      });
    }
  }
    const handleAddPlanClick = () => {
    navigate(`/members/${Params.memberId}/addplans`);
  };

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
          <Settings className="h-6 w-6 text-purple-500" />
        </div>
      </header>

      {/* Profile Section */}
      <div className="flex flex-col items-center mb-6">
        <Avatar className="w-24 h-24 mb-2">
          <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${member.full_name}`} alt={member.full_name} />
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

      {/* Memberships */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">Memberships</CardTitle>
          <span className="text-sm text-gray-500">#{member.admission_no}</span>
        </CardHeader>
        <CardContent>
          {memberships.length > 0 ? (
            <div className="space-y-4">
              {memberships.map((membership) => (
                <div key={membership.id} className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{membership.plans?.name || 'Unknown Plan'}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(membership.start_date).toLocaleDateString()} - {new Date(membership.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₹{membership.plans?.price || 'N/A'}</p>
                    <p className="text-sm text-gray-500">{membership.plans?.duration || 'N/A'} days</p>
                  </div>
                  <Badge variant={membership.status === 'active' ? "success" : "secondary"}>
                    {membership.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-yellow-500">No memberships found</p>
          )}
          <Button onClick={handleAddPlanClick()} variant="outline" size="sm" className="mt-4" onClick={() => window.location.href = `/members/${params.MemberId}/addplans`}>
            <Plus className="h-4 w-4 mr-2" />
            Add Membership
          </Button>
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
            {member.balance > 0 ? "Outstanding balance on your account" : "Your account is up to date"}
          </p>
          {member.balance > 0 && (
            <Sheet open={isPaymentSheetOpen} onOpenChange={setIsPaymentSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay Balance
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Pay Balance</SheetTitle>
                </SheetHeader>
                <fetcher.Form onSubmit={handlePaymentSubmit} className="space-y-4 mt-4">
                  <input type="hidden" name="memberId" value={member.id} />
                  <div>
                    <Label htmlFor="amount">Amount to Pay</Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      max={member.balance}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select name="paymentMethod" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="debit_card">Debit Card</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">Process Payment</Button>
                </fetcher.Form>
              </SheetContent>
            </Sheet>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length > 0 ? (
            <ul className="space-y-2">
              {recentTransactions.map((transaction) => (
                <li key={transaction.id} className="flex justify-between items-center">
                  <span className="text-sm">{new Date(transaction.created_at).toLocaleDateString()}</span>
                  <span className="text-sm font-medium">{transaction.type}</span>
                  <span className={`text-sm font-bold ${transaction.type === 'payment' ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.type === 'payment' ? '-' : '+'} ₹{transaction.amount}
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
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Member Details</DialogTitle>
                </DialogHeader>
                <fetcher.Form onSubmit={handleEditSubmit} className="space-y-4">
                  <input type="hidden" name="memberId" value={member.id} />
                  <div>
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input id="height" name="height" type="number" defaultValue={member.height} required />
                  </div>
                  <div>
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input id="weight" name="weight" type="number" defaultValue={member.weight} required />
                  </div>
                  <Button type="submit">Save Changes</Button>
                </fetcher.Form>
              </DialogContent>
            </Dialog>
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
              <p className="font-semibold">{new Date(member.date_of_birth).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-500">Blood Type</p>
              <p className="font-semibold">{member.blood_type}</p>
            </div>
            <div>
              <p className="text-gray-500">Height</p>
              <p className="font-semibold">{member.height} cm</p>
            </div>
            <div>
              <p className="text-gray-500">Weight</p>
              <p className="font-semibold">{member.weight} kg</p>
            </div>
            <div>
              <p className="text-gray-500">Joined Date</p>
              <p className="font-semibold">{new Date(member.joined_date).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}