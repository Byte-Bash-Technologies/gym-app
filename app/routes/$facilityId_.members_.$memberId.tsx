import {
  json,
  type LoaderFunction,
  type ActionFunction,
} from "@remix-run/node";
import { useLoaderData, Link, useFetcher, useParams } from "@remix-run/react";
import { useState } from "react";
import {
  ArrowLeft,
  Bell,
  Phone,
  Settings,
  Download,
  Pencil,
  CreditCard,
  Plus,
  MessageCircle,
  Clock,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { jsPDF } from "jspdf";
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

export const loader: LoaderFunction = async ({ params }) => {
  const facilityId = params.facilityId;
  const { data: facility, error: facilityError } = await supabase
    .from("facilities")
    .select("name")
    .eq("id", facilityId)
    .single();

  if (facilityError) {
    throw new Response("Facility not found", { status: 404 });
  }

  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("*")
    .eq("facility_id", facilityId)
    .eq("id", params.memberId)
    .single();

  if (memberError) throw new Response("Member not found", { status: 405 });

  const { data: memberships, error: membershipsError } = await supabase
    .from("memberships")
    .select(
      `
      id,
      start_date,
      end_date,
      status,
      plans (
        name,
        duration,
        price
      )
    `
    )
    .eq("member_id", params.memberId)
    .order("start_date", { ascending: false });

  const now = new Date();
  const activeMembership =
    memberships?.find((m) => new Date(m.end_date) >= now) || null;
  const expiredMemberships =
    memberships?.filter((m) => new Date(m.end_date) < now) || [];

  // Update membership statuses
  if (activeMembership && activeMembership.status !== "active") {
    await supabase
      .from("memberships")
      .update({ status: "active" })
      .eq("id", activeMembership.id);
    activeMembership.status = "active";
  }

  for (const membership of expiredMemberships) {
    if (membership.status !== "expired") {
      await supabase
        .from("memberships")
        .update({ status: "expired" })
        .eq("id", membership.id);
      membership.status = "expired";
    }
  }

  const { data: transactions, error: transactionsError } = await supabase
    .from("transactions")
    .select("*")
    .eq("member_id", params.memberId)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: messageTemplates, error: messageTemplatesError } =
    await supabase.from("message_templates").select("*").order("title");

  if (membershipsError)
    console.error("Error fetching memberships:", membershipsError);
  if (transactionsError)
    console.error("Error fetching transactions:", transactionsError);
  if (messageTemplatesError)
    console.error("Error fetching message templates:", messageTemplatesError);

  return json({
    member,
    activeMembership,
    expiredMemberships,
    recentTransactions: transactions ?? [],
    messageTemplates: messageTemplates ?? [],
  });
};
export { ErrorBoundary } from "~/components/CatchErrorBoundary";
export const action: ActionFunction = async ({ request, params }) => {
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
      .select("balance")
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

    return json({ success: true, message: "Payment processed successfully" });
  }

  return json({ error: "Invalid action" }, { status: 400 });
};

export default function MemberProfile() {
  const {
    member,
    activeMembership,
    expiredMemberships,
    recentTransactions,
    messageTemplates,
  } = useLoaderData<LoaderData>();
  const params = useParams();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isWhatsAppDrawerOpen, setIsWhatsAppDrawerOpen] = useState(false);
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const fetcher = useFetcher();

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
    const encodedMessage = encodeURIComponent(messageContent);
    window.open(
      `https://wa.me/${member.phone}?text=${encodedMessage}`,
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
  // const handleDownloadProfile = () => {
  //   const doc = new jsPDF();

  //   // Add a border
  //   doc.setDrawColor(0, 0, 0);
  //   doc.setLineWidth(0.5);
  //   doc.roundedRect(10, 10, 190, 270, 5, 5);

  //   // Add a logo at the top
  //   const logo = new Image();
  //   logo.src = "/favicon.ico";
  //   doc.addImage(logo, "PNG", 15, 15, 30, 30);

  //   // Gym name, address, and contact information
  //   doc.setFontSize(20);
  //   doc.setFont("helvetica", "bold");
  //   doc.text("Sports Dot", 105, 30, { align: "center" });

  //   doc.setFontSize(10);
  //   doc.setFont("helvetica", "normal");
  //   doc.text("123 Fitness Street, FitCity, 456789", 105, 38, {
  //     align: "center",
  //   });
  //   doc.text("Phone: +91 7010976271 | Email: info@sportsdot.com", 105, 43, {
  //     align: "center",
  //   });

  //   // Add a horizontal line
  //   doc.setLineWidth(0.2);
  //   doc.line(15, 50, 195, 50);

  //   // Date in the top-right corner
  //   const today = new Date();
  //   const formattedDate = `Date: ${today
  //     .getDate()
  //     .toString()
  //     .padStart(2, "0")}/${(today.getMonth() + 1)
  //     .toString()
  //     .padStart(2, "0")}/${today.getFullYear()}`;
  //   doc.setFontSize(10);
  //   doc.text(formattedDate, 190, 20, { align: "right" });

  //   // Member profile section header
  //   doc.setFontSize(16);
  //   doc.setFont("helvetica", "bold");
  //   doc.text("Member Profile", 105, 60, { align: "center" });

  //   // Member details, listed one by one
  //   const detailsStartY = 70;
  //   const lineHeight = 15;
  //   const details = [
  //     `Name: ${member.full_name}`,
  //     `Email: ${member.email}`,
  //     `Phone: ${member.phone}`,
  //     `Gender: ${member.gender}`,
  //     `Date of Birth: ${new Date(member.date_of_birth).toLocaleDateString()}`,
  //     `Blood Type: ${member.blood_type}`,
  //     `Height: ${member.height} cm`,
  //     `Weight: ${member.weight} kg`,
  //   ];

  //   // Add each detail to the PDF
  //   details.forEach((detail, index) => {
  //     const textY = detailsStartY + index * lineHeight;
  //     doc.setFont("helvetica", "normal");
  //     doc.text(detail, 20, textY);
  //   });

  //   // Footer for branding
  //   doc.setFontSize(10);
  //   doc.setFont("helvetica", "italic");
  //   doc.text("Generated by Sports Dot Gym Management System", 105, 280, {
  //     align: "center",
  //   });

  //   // Save the PDF
  //   doc.save(`${member.full_name}_profile.pdf`);
  // };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link to={`/${params.facilityId}/members`}>
            <ArrowLeft className="h-6 w-6 mr-2" />
          </Link>
          <h1 className="text-xl font-bold">Member Profile</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Bell className="h-6 w-6 text-purple-500" />
          <a href="tel:7010976271">
            <Phone className="h-6 w-6 text-purple-500" />
          </a>
          <a href={`/${params.facilityId}/settings`}>
            <Settings className="h-6 w-6 text-purple-500" />
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
        {/* <Button
          variant="ghost"
          className="mt-2"
          onClick={handleDownloadProfile}
        >
          <Download className="h-4 w-4 mr-2" />
          Download Profile
        </Button> */}
      </div>

      {/* Contact Section */}
      <CardContent className="flex justify-center space-x-4">
        <Button onClick={handlePhoneClick}>
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
            <Button>
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Send WhatsApp Message</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 space-y-4">
              {messageTemplates.map((template) => (
                <Button
                  key={template.id}
                  onClick={() => handleWhatsAppSend(template.content)}
                  className="w-full justify-start"
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
              <Badge variant="success">{activeMembership.status}</Badge>
            </div>
          ) : (
            <p className="text-sm text-yellow-500">
              No active membership found
            </p>
          )}
          <Link to="addplans">
            <Button variant="outline" size="sm" className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              {activeMembership ? "Change Membership" : "Add Membership"}
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Membership History */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
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
                  <Badge variant="secondary">{membership.status}</Badge>
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
                  <Button variant="outline" size="sm">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay Balance
                  </Button>
                </SheetTrigger>
                <SheetContent>
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
                          <SelectItem value="credit_card">
                            Credit Card
                          </SelectItem>
                          <SelectItem value="debit_card">Debit Card</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full">
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
                  <Button variant="outline" size="sm">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Send Reminder
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Send Reminder</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-4 mt-4">
                    <Label htmlFor="reminder-message">Message</Label>
                    <textarea
                      id="reminder-message"
                      className="w-full border rounded p-2 h-64"
                      rows={4}
                      defaultValue={`Hello ${member.full_name},\n\nYou have a pending balance amount of ₹${member.balance}.\n\n Please settle as soon as possible.\n\nThank you,\n\n+91 7540024044`}
                    />
                    <Button onClick={handleSendReminder} className="w-full">
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
              className="flex justify-between items-center"
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
              <DialogContent className="max-h-[80vh] flex flex-col">
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
                        defaultValue={member.full_name}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
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
                        defaultValue={member.phone}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="gender">Gender</Label>
                      <Select name="gender" defaultValue={member.gender}>
                        <SelectTrigger className="w-full select-trigger">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
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
                        <SelectTrigger className="w-full select-trigger">
                          <SelectValue placeholder="Select blood type" />
                        </SelectTrigger>
                        <SelectContent>
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
                    className="w-full"
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
              <p className="font-semibold">{member.email}</p>
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
    </div>
  );
}
