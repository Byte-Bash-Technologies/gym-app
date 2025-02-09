import { ActionFunction, json, LoaderFunction } from "@remix-run/node";
import { useLoaderData,redirect, Link, useFetcher, useParams, useActionData, useNavigate } from "@remix-run/react";
import { useState, useEffect } from "react";
import { ArrowLeft, Bell, Phone, Settings, Download, Pencil, CreditCard, Plus, MessageCircle, Clock, RefreshCcw, Trash2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { supabase } from "~/utils/supabase.server";
import { toast } from "~/hooks/use-toast";
import FacilityLayout from "./$facilityId";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "~/components/ui/alert-dialog";

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
  photo_url: string;
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

interface MessageTemplate {
  id: string;
  title: string;
  content: string;
}

interface LoaderData {
  member: Member;
  activeMembership: Membership | null;
  expiredMemberships: Membership[];
  recentTransactions: Transaction[];
  messageTemplates: MessageTemplate[];
}

// Add cache headers helper
function createCacheHeaders(maxAge: number = 60) {
  return {
    "Cache-Control": `private, max-age=${maxAge}`,
    "Vary": "Cookie",
  };
}

// Optimize loader with caching and error handling
export const loader: LoaderFunction = async ({ params, request }) => {
  // Add cache control
  const headers = createCacheHeaders(300); // Cache for 5 minutes

  try {
    // Parallel data fetching for better performance
    const [
      facilityResponse,
      memberResponse,
      membershipsResponse,
      transactionsResponse,
      templatesResponse
    ] = await Promise.all([
      supabase
        .from("facilities")
        .select("name,phone")
        .eq("id", params.facilityId)
        .single(),
      
      supabase
        .from("members")
        .select("*")
        .eq("facility_id", params.facilityId)
        .eq("id", params.memberId)
        .single(),
      
      supabase
        .from("memberships")
        .select(`
          id,
          start_date,
          end_date,
          is_disabled,
          status,
          plans (
            name,
            duration,
            price
          )
        `)
        .eq("member_id", params.memberId)
        .order("start_date", { ascending: false }),
      
      supabase
        .from("transactions")
        .select("*")
        .eq("member_id", params.memberId)
        .order("created_at", { ascending: false })
        .limit(5),
      
      supabase
        .from("message_templates")
        .select("*")
        .order("title")
    ]);

    // Early error checking
    if (facilityResponse.error) throw new Response("Facility not found", { status: 404 });
    if (memberResponse.error) throw new Response("Member not found", { status: 404 });

    const now = new Date();
    const memberships = membershipsResponse.data || [];
    
    // Optimize membership status updates by doing them in parallel
    const activeMembership = memberships.find(m => new Date(m.start_date) <= now && new Date(m.end_date) && m.is_disabled===false ) || null;
    const expiredMemberships = memberships.filter(m => new Date(m.end_date) < now || m.is_disabled === true);
    const pendingMemberships = memberships.filter(m => new Date(m.start_date) > now);
    // Batch update membership statuses if needed
    const statusUpdates = [];
    
    if (activeMembership?.status !== "active") {
      statusUpdates.push(
      supabase
        .from("memberships")
        .update({ status: "active" })
        .eq("id", activeMembership?.id)
      );
    }

    expiredMemberships.forEach(membership => {
      if (membership.status !== "expired") {
      statusUpdates.push(
        supabase
        .from("memberships")
        .update({ status: "expired" })
        .eq("id", membership.id)
      );
      }
    });

    pendingMemberships.forEach(membership => {
      if (membership.status !== "pending") {
      statusUpdates.push(
        supabase
        .from("memberships")
        .update({ status: "pending" })
        .eq("id", membership.id)
      );
      }
    });

    // Execute all status updates in parallel if any exist
    if (statusUpdates.length > 0) {
      await Promise.all(statusUpdates);
    }

    return json(
      {
        member: memberResponse.data,
        facility: facilityResponse.data,
        activeMembership,
        expiredMemberships,
        pendingMemberships,
        recentTransactions: transactionsResponse.data || [],
        messageTemplates: templatesResponse.data || [],
      },
      {
        headers,
        status: 200,
      }
    );
  } catch (error) {
    console.error("Loader error:", error);
    throw new Response("Error loading member profile", { status: 500 });
  }
};
export { ErrorBoundary} from "~/components/CatchErrorBoundary";

export const action: ActionFunction = async ({ request, params }) => {
  let whatsappUrl;
  const formData = await request.formData();
  const action = formData.get("_action");
  if (action === "updateMember") {
    const memberId = formData.get("memberId") as string;
    const updatedFields = {
      full_name: formData.get("full_name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      gender: formData.get("gender") as string,
      date_of_birth: formData.get("date_of_birth") as string,
      blood_type: formData.get("blood_type") as string,
      height: parseFloat(formData.get("height") as string),
      weight: parseFloat(formData.get("weight") as string),
    };
    const { error } = await supabase
      .from("members")
      .update(updatedFields)
      .eq("id", memberId);
    if (error) {
      return json(
        { error: "Failed to update member details" },
        { status: 400 }
      );
    }
    return json({
      success: true,
      message: "Member details updated successfully",
    });
  } else if (action === "payBalance") {
    const memberId = formData.get("memberId") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const paymentMethod = formData.get("paymentMethod") as string;
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("balance, full_name, phone")
      .eq("id", memberId)
      .single();
    if (memberError) {
      return json({ error: "Failed to fetch member balance" }, { status: 400 });
    }
    if (amount <= 0 || amount > member.balance) {
      return json({ error: "Invalid payment amount" }, { status: 400 });
    }
    const newBalance = member.balance - amount;
    const { error: transactionError } = await supabase
      .from("transactions")
      .insert({
        member_id: memberId,
        amount,
        facility_id: params.facilityId,
        type: "payment",
        payment_method: paymentMethod,
        status: "completed",
      });
    if (transactionError) {
      return json({ error: "Failed to record transaction" }, { status: 500 });
    }
    const { error: updateError } = await supabase
      .from("members")
      .update({ balance: newBalance })
      .eq("id", memberId);
    if (updateError) {
      return json(
        { error: "Failed to update member balance" },
        { status: 500 }
      );
    }
    const messageContent = `Hello ${member.full_name}, your payment of ₹${amount} has been successfully processed. Thank you!`;
    const encodedMessage = encodeURIComponent(messageContent);
    whatsappUrl=`https://api.whatsapp.com/send?phone=${member.phone}&text=${encodedMessage}`;
    return redirect(whatsappUrl);
  } else if (action === "deleteMember") {
    const memberId = formData.get("memberId") as string;
    const facilityId = params.facilityId;

    // Delete related records first (memberships, transactions)
    const { error: membershipError } = await supabase
      .from("memberships")
      .delete()
      .eq("member_id", memberId);

    if (membershipError) {
      return json({ error: "Failed to delete memberships" }, { status: 500 });
    }

    const { error: transactionError } = await supabase
      .from("transactions")
      .delete()
      .eq("member_id", memberId);

    if (transactionError) {
      return json({ error: "Failed to delete transactions" }, { status: 500 });
    }

    // Finally delete the member
    const { error: memberError } = await supabase
      .from("members")
      .delete()
      .eq("id", memberId);

    if (memberError) {
      return json({ error: "Failed to delete member" }, { status: 500 });
    }

    return redirect(`/${facilityId}/members`);
  }


  return json({ error: "Invalid action" }, { status: 400 });
};


export default function MemberProfile() {
  const {
    member,
    facility,
    activeMembership,
    expiredMemberships,
    pendingMemberships,
    recentTransactions,
    messageTemplates,
  } = useLoaderData<LoaderData>();
  const params = useParams();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isWhatsAppDrawerOpen, setIsWhatsAppDrawerOpen] = useState(false);
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const fetcher = useFetcher();
  const actionData = useActionData();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    if (actionData?.success && actionData?.whatsappUrl) {
      window.open(actionData.whatsappUrl, '_blank');
    }
  }, [actionData]);
  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.append("_action", "updateMember");
    fetcher.submit(formData, { method: "post" });
    setIsEditDialogOpen(false);
  };

  const handlePaymentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.append("_action", "payBalance");
    fetcher.submit(formData, { method: "post" });
    setIsPaymentSheetOpen(false);
  };

  if (fetcher.type === "done") {
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

  const handlePhoneClick = () => {
    window.location.href = `tel:${member.phone}`;
  };

  const handleWhatsAppSend = (messageContent: string) => {
    messageContent = messageContent.replace("{name}", member.full_name);
    console.log(messageContent);
    const encodedMessage = encodeURIComponent(messageContent);
    window.open(
      `https://wa.me/91${member.phone}?text=${encodedMessage}`,
      "_blank"
    );
    setIsWhatsAppDrawerOpen(false);
  };

  const handleSendReminder = () => {
    const message = document.getElementById(
      "reminder-message"
    ) as HTMLTextAreaElement;
    const encodedMessage = encodeURIComponent(message.value);
    window.open(
      `https://wa.me/${member.phone}?text=${encodedMessage}`,
      "_blank"
    );
    setIsReminderDialogOpen(false);
    setIsPaymentSheetOpen(false);
  };

  const handleDelete = () => {
    const form = new FormData();
    form.append("_action", "deleteMember");
    form.append("memberId", member.id);
    fetcher.submit(form, { method: "post" });
    setIsDeleteDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f0ebff] dark:bg-[#212237] p-4">
      {/* Header */}
      <header className="flex items-center  justify-between mb-6">
        <div className="flex items-center">
          <Link to={`/${params.facilityId}/members`}>
            <ArrowLeft className="h-6 w-6 mr-2" />
          </Link>
          <h1 className="text-xl font-bold">Member Profile</h1>
        </div>
        <div className="flex items-center space-x-4">
          {/* <Bell className="h-6 w-6 text-purple-500" /> */}
          <a href="tel:7010976271">
            <Phone className="h-6 w-6 text-[#886fa6]" />
          </a>
          <a href={`/${params.facilityId}/settings`}>
            <Settings className="h-6 w-6 text-[#886fa6]" />
          </a>
        </div>
      </header>

      {/* Profile Section */}
      <div className="flex flex-col items-center mb-6">
        <Avatar className="w-24 h-24 mb-2">
          <AvatarImage src={member.photo_url} alt={member.full_name} />
          <AvatarFallback>{member.full_name[0]}</AvatarFallback>
        </Avatar>
        <h2 className="text-xl font-bold">{member.full_name}</h2>
        <p className="text-gray-500">{member.email}</p>
        <p className="text-gray-500">{member.phone}</p>
      </div>

      {/* Contact Section */}
      <CardContent className="flex justify-center space-x-4">
        <Button onClick={handlePhoneClick}
        className="bg-[#886fa6] hover:bg-[#886fa6]/90 dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]/90 text-white">
          <a href={`tel:${member.phone}`}>
            <Phone className="h-4 w-4 mr-2" />
          </a>
          Call
        </Button>
        <Drawer
          open={isWhatsAppDrawerOpen}
          onOpenChange={setIsWhatsAppDrawerOpen}
        >
          <DrawerTrigger asChild>
            <Button
            className="bg-[#886fa6] hover:bg-[#886fa6]/90 dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]/90 text-white">
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
          </DrawerTrigger>
          <DrawerContent className="dark:bg-[#212237] text-white">
            <DrawerHeader>
              <DrawerTitle>Send WhatsApp Message</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 space-y-4">
              {messageTemplates.map((template) => (
                <Button
                  key={template.id}
                  onClick={() => handleWhatsAppSend(template.content)}
                  className="w-full justify-start bg-[#886fa6] hover:bg-[#886fa6]/90 dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]/90 text-white"
                >
                  {template.title}
                </Button>
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      </CardContent>

      {/* Active Membership */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">Active Membership</CardTitle>
          <span className="text-sm text-gray-500">#{member.admission_no}</span>
        </CardHeader>
        <CardContent>
          {activeMembership ? (
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">
                  {activeMembership.plans?.name || "Unknown Plan"}
                </h3>
                <p className="text-sm text-gray-500">
                  {new Date(activeMembership.start_date).toLocaleDateString()} -{" "}
                  {new Date(activeMembership.end_date).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold">
                  ₹{activeMembership.plans?.price || "N/A"}
                </p>
                <p className="text-sm text-gray-500">
                  {activeMembership.plans?.duration || "N/A"} days
                </p>
              </div>
              <Badge variant="success" className={`text-sm inline-block px-3 py-1 dark:bg-[#3A3A52] rounded-full ${activeMembership.status === "active" ? "bg-green-50 text-green-500" : "bg-red-50 text-red-500"}`}>
              
              •  {activeMembership.status}</Badge>
            </div>
          ) : (
            <p className="text-sm text-yellow-500 ">
               No active membership found
            </p>
          )}
          <Link to="addplans">
            <Button variant="outline" size="sm" className="mt-4 dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]/90 text-black dark:text-white">
              
              {activeMembership ? (<><RefreshCcw className="h-4 w-4 mr-2" /> Change Membership</>) : (<><Plus className="h-4 w-4 mr-2" /> Add Membership</>)}
            </Button>
          </Link>
        </CardContent>
      </Card>
        {/*Pending Membership */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">
            Pending Membership
          </CardTitle>
          <Clock className="h-5 w-5 text-gray-400" />
        </CardHeader>
        <CardContent>
          {pendingMemberships.length > 0 ? (
            <div className="space-y-4">
              {pendingMemberships.map((membership: { id: Key | null | undefined; plans: { name: any; price: any; duration: any; }; start_date: string | number | Date; end_date: string | number | Date; status: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | null | undefined; }) => (
                <div
                  key={membership.id}
                  className="flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-semibold">
                      {membership.plans?.name || "Unknown Plan"}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(membership.start_date).toLocaleDateString()} -{" "}
                      {new Date(membership.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      ₹{membership.plans?.price || "N/A"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {membership.plans?.duration || "N/A"} days
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-sm inline-block px-3 py-1 dark:bg-[#3A3A52] rounded-full bg-yellow-50 text-yellow-500">• {membership.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No pending memberships found
            </p>
          )}
        </CardContent>
      </Card>

      {/* Membership History */}
      <Card className="mb-6">
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">
            Membership History
          </CardTitle>
          <Clock className="h-5 w-5 text-gray-400" />
        </CardHeader>
        <CardContent>
          {expiredMemberships.length > 0 ? (
            <div className="space-y-4">
              {expiredMemberships.map((membership) => (
                <div
                  key={membership.id}
                  className="flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-semibold">
                      {membership.plans?.name || "Unknown Plan"}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(membership.start_date).toLocaleDateString()} -{" "}
                      {new Date(membership.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      ₹{membership.plans?.price || "N/A"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {membership.plans?.duration || "N/A"} days
                    </p>
                  </div>
                  <Badge variant="destructive" className="text-sm inline-block px-3 py-1 dark:bg-[#3A3A52] rounded-full bg-red-50 text-red-500">• {membership.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No expired memberships found
            </p>
          )}
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
            <div className="flex space-x-2">
              <Sheet
                open={isPaymentSheetOpen}
                onOpenChange={setIsPaymentSheetOpen}
              >
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]/90 text-black dark:text-white">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay Balance
                  </Button>
                </SheetTrigger>
                <SheetContent className="dark:bg-[#212237]">
                  <SheetHeader>
                    <SheetTitle>Pay Balance</SheetTitle>
                  </SheetHeader>
                  <fetcher.Form
                    onSubmit={handlePaymentSubmit}
                    className="space-y-4 mt-4"
                  >
                    <input type="hidden" name="memberId" value={member.id} />
                    <div>
                      <Label htmlFor="amount">Amount to Pay</Label>
                      <Input
                        id="amount"
                        name="amount"
                        className="dark:bg-[#4A4A62]"
                        type="number"
                        step="0.01"
                        max={member.balance}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="paymentMethod">Payment Method</Label>
                      <Select name="paymentMethod" required>
                        <SelectTrigger className="dark:bg-[#4A4A62]">
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-[#4A4A62]">
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="credit_card">
                            Credit Card
                          </SelectItem>
                          <SelectItem value="debit_card">Debit Card</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full bg-[#886fa6] dark:bg-[#3A3A52] hover:bg-[#886fa6]/90 dark:hover:bg-[#3A3A52]/90 text-white">
                      Process Payment
                    </Button>
                  </fetcher.Form>
                </SheetContent>
              </Sheet>
              <Sheet
                open={isReminderDialogOpen}
                onOpenChange={setIsReminderDialogOpen}
              >
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]/90 text-black dark:text-white">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Send Reminder
                  </Button>
                </SheetTrigger>
                <SheetContent className="dark:bg-[#212237]">
                  <SheetHeader>
                    <SheetTitle>Send Reminder</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-4 mt-4">
                    <Label htmlFor="reminder-message">Message</Label>
                    <textarea
                      id="reminder-message"
                      className="w-full border rounded p-2 h-64 dark:bg-[#4A4A62]"
                      rows={4}
                      defaultValue={`Hello ${member.full_name},\n\nYou have a pending balance amount of ₹${member.balance}.\n\n Please settle as soon as possible.\n\nThank you,\n${facility.name}\n${facility.phone}`}
                    />
                    <Button onClick={handleSendReminder} className="w-full bg-[#886fa6] dark:bg-[#3A3A52] hover:bg-[#886fa6]/90 dark:hover:bg-[#3A3A52]/90 text-white">
                      Send Reminder
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions Section */}
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
                  className="flex justify-between items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-[#3A3A52] p-2 rounded"
                  onClick={() => setSelectedTransaction(transaction)}
                >
                  <span className="text-sm w-1/4">
                    {new Date(transaction.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-sm font-medium w-1/4 text-center">
                    {transaction.type}
                  </span>
                  <span
                    className={`text-sm font-bold w-1/4 text-right ${
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

      {/* Transaction Details Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="dark:bg-[#212237]">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-semibold">{new Date(selectedTransaction.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <p className="font-semibold">{selectedTransaction.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="font-semibold">₹{selectedTransaction.amount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Payment Method</p>
                <p className="font-semibold">{selectedTransaction.payment_method}</p>
              </div>
              <Button
                onClick={() => window.open(`/invoice/${selectedTransaction.id}`, '_blank')}
                className="w-full bg-[#886fa6] hover:bg-[#886fa6]/90 dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]/90 text-white"
              >
                View Invoice
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
          {/* Member Details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">Member details</CardTitle>
          <div className="flex space-x-2">
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="dark:bg-[3A3A52] dark:hover:bg-[#3A3A52]" size="sm">
                  <Pencil className="h-4 w-4 " />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] flex flex-col dark:bg-[#212237]">
                <DialogHeader>
                  <DialogTitle>Edit Member Details</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-4">
                  <fetcher.Form
                    id="editMemberForm"
                    onSubmit={handleEditSubmit}
                    className="space-y-4"
                  >
                    <input type="hidden" name="memberId" value={member.id} />
                    <div>
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        name="full_name"
                        className="dark:bg-[#4A4A62]"
                        defaultValue={member.full_name}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        className="dark:bg-[#4A4A62]"
                        type="email"
                        defaultValue={member.email}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        className="dark:bg-[#4A4A62]"
                        defaultValue={member.phone}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="gender">Gender</Label>
                      <Select name="gender" defaultValue={member.gender}>
                        <SelectTrigger className="w-full select-trigger dark:bg-[#4A4A62]">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-[#4A4A62]">
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="date_of_birth">Date of Birth</Label>
                      <Input
                        id="date_of_birth"
                        name="date_of_birth"
                        className="dark:bg-[#4A4A62]"
                        type="date"
                        defaultValue={member.date_of_birth.split("T")[0]}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="blood_type">Blood Type</Label>
                      <Select
                        name="blood_type"
                        defaultValue={member.blood_type}
                      >
                        <SelectTrigger className="w-full select-trigger dark:bg-[#4A4A62]">
                          <SelectValue placeholder="Select blood type" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-[#4A4A62]">
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A-">A-</SelectItem>
                          <SelectItem value="B+">B+</SelectItem>
                          <SelectItem value="B-">B-</SelectItem>
                          <SelectItem value="AB+">AB+</SelectItem>
                          <SelectItem value="AB-">AB-</SelectItem>
                          <SelectItem value="O+">O+</SelectItem>
                          <SelectItem value="O-">O-</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="height">Height (cm)</Label>
                      <Input
                        id="height"
                        name="height"
                        className="dark:bg-[#4A4A62]"
                        type="number"
                        defaultValue={member.height}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input
                        id="weight"
                        name="weight"
                        className="dark:bg-[#4A4A62]"
                        type="number"
                        defaultValue={member.weight}
                        required
                      />
                    </div>
                  </fetcher.Form>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Button
                    type="submit"
                    className="w-full bg-[#886fa6] hover:bg-[#886fa6]/90 dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]/90 text-white"
                    form="editMemberForm"
                  >
                    Save Changes
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500">Full Name</p>
              <p className="font-semibold">{member.full_name}</p>
            </div>
            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-semibold truncate">{member.email}</p>
            </div>
            <div>
              <p className="text-gray-500">Phone</p>
              <p className="font-semibold">{member.phone}</p>
            </div>
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
              <p className="font-semibold">{member.height} cm</p>
            </div>
            <div>
              <p className="text-gray-500">Weight</p>
              <p className="font-semibold">{member.weight} kg</p>
            </div>
          </div>
        </CardContent>
      </Card>
                {/* Add Delete Button after the header */}
      <div className="mt-2 flex justify-center ">
        <Button
          variant="destructive"
          onClick={() => setIsDeleteDialogOpen(true)}
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          <Trash2 className="h-4 w-4" />
          Delete Member
        </Button>
      </div>
      {/* Add Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {member.full_name}? This action cannot be undone.
              All related data including memberships and transactions will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
    </div>
  );
}

