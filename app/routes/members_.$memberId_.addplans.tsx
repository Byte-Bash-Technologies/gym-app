import { json, type LoaderFunction } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { useState } from "react";
import { ArrowLeft, Search, Check } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "~/components/ui/command";
import { cn } from "~/lib/utils";
import { supabase } from "~/utils/supabase.server";

interface Member {
  id: string;
  name: string;
  phone: string;
  admissionNo: string;
  joinDate: string;
  gender: string;
  avatar: string;
}

interface Plan {
  id: string;
  name: string;
  duration: string;
  price: number;
}

interface LoaderData {
  member: Member;
  plans: Plan[];
}

export const loader: LoaderFunction = async ({ params }) => {
  const { data: memberData, error: memberError } = await supabase
    .from("members")
    .select("*")
    .eq("id", params.memberId)
    .single();

  if (memberError) {
    throw new Error(memberError.message);
  }

  const { data: plansData, error: plansError } = await supabase
    .from("plans")
    .select("*");

  if (plansError) {
    throw new Error(plansError.message);
  }

  const member: Member = {
    id: memberData.id,
    name: memberData.name,
    phone: memberData.phone,
    admissionNo: memberData.admission_no,
    joinDate: memberData.joined_date,
    gender: memberData.gender,
    avatar: memberData.avatar || "/placeholder.svg",
  };

  const plans: Plan[] = plansData.map((plan: any) => ({
    id: plan.id,
    name: plan.name,
    duration: plan.duration,
    price: plan.price,
  }));

  return json({ member, plans });
};

export default function RenewMembership() {
  const { member, plans } = useLoaderData<LoaderData>();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          <Link to={`/members/${member.id}`}>
            <ArrowLeft className="h-6 w-6 mr-2" />
          </Link>
          <h1 className="text-xl font-bold">Renew Membership</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 max-w-md">
        {/* Member Info Card */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback>{member.name}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{member.name}</h2>
                  <Badge variant="secondary">{member.gender}</Badge>
                </div>
                <p className="text-gray-600">{member.phone}</p>
                <div className="text-sm text-gray-500">
                  <p>Admission No: {member.admissionNo}</p>
                  <p>Joined on {member.joinDate} (0 days)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Renewal Form */}
        <form className="space-y-6">
          <div className="space-y-2">
            <Label>Select Plan</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {selectedPlan ? selectedPlan.name : "Choose a plan"}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandInput placeholder="Search plans..." className="h-9" />
                  <CommandEmpty>No plan found.</CommandEmpty>
                  <CommandGroup>
                    {plans.map((plan) => (
                      <CommandItem
                        key={plan.id}
                        onSelect={() => {
                          setSelectedPlan(plan);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedPlan?.id === plan.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <div className="flex justify-between w-full">
                          <span>{plan.name}</span>
                          <span className="text-sm text-gray-500">
                            ₹{plan.price} - {plan.duration}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedPlan && (
              <p className="text-sm text-gray-500 mt-2">
                Selected: {selectedPlan.name} - ₹{selectedPlan.price} for{" "}
                {selectedPlan.duration}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="discount">Discount</Label>
            <Input
              id="discount"
              type="number"
              placeholder="Enter discount amount"
            />
          </div>

          <div className="space-y-2">
            <Label>Amount</Label>
            <div className="flex items-center space-x-2">
              <Checkbox id="fullPrice" defaultChecked />
              <Label htmlFor="fullPrice">Paying full price</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select defaultValue="cash">
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="credit">Credit card</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full">
            Renew Membership
          </Button>
        </form>
      </main>
    </div>
  );
}
