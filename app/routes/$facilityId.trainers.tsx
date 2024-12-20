import { json, LoaderFunction, ActionFunction, redirect } from "@remix-run/node";
import { useLoaderData, Form, useActionData, useNavigate, Link } from "@remix-run/react";
import { supabase } from "~/utils/supabase.server";
import { getAuthenticatedUser } from "~/utils/currentUser";
import { UserPlus2, UserX2, AlertCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { createServerClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";
import { useToast } from "~/hooks/use-toast";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { useState, useEffect } from "react";

export const loader: LoaderFunction = async ({ params, request }) => {
  const user = await getAuthenticatedUser(request);
  const facilityId = params.facilityId;

  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const { data: facility, error } = await supabase
    .from("facilities")
    .select("*")
    .eq("id", facilityId)
    .single();

  if (error || facility.user_id !== user.id) {
    throw new Response("Not Found", { status: 404 });
  }

  // Fetch assigned trainers
  const { data: trainers, error: trainersError } = await supabase
    .from("facility_trainers")
    .select(`
      id,
      users (
        id,
        full_name,
        email,
        phone,
        avatar_url
      )
    `)
    .eq("facility_id", facilityId);

  if (trainersError) {
    console.error("Error fetching trainers:", trainersError);
  }

  return json({ facility, trainers: trainers || [] });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const action = formData.get("action");
  const response = new Response();

  const supabaseClient = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => parse(request.headers.get("Cookie") || "")[key],
        set: (key, value, options) => {
          response.headers.append("Set-Cookie", serialize(key, value, options));
        },
        remove: (key, options) => {
          response.headers.append("Set-Cookie", serialize(key, "", options));
        },
      },
    }
  );

  if (action === "logout") {
    await supabaseClient.auth.signOut();
    return redirect("/login");
  }

  if (action === "add-trainer") {
    const trainerEmail = formData.get("trainerEmail");
    const facilityId = formData.get("facilityId");

    // First, find the user by email
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", trainerEmail)
      .single();

    if (userError) {
      return json({ 
        error: "No user found with this email. Please verify the email or ",
        action: "add-trainer" 
      }, { status: 404 });
    }

    // Then, add the trainer to facility_trainers
    const { error: assignError } = await supabase
      .from("facility_trainers")
      .insert([
        {
          facility_id: facilityId,
          user_id: userData.id,
        },
      ]);

    if (assignError) {
      return json({ 
        error: "Failed to assign trainer. Please try again.", 
        action: "add-trainer" 
      }, { status: 500 });
    }

    return json({ 
      success: true, 
      message: "Trainer added successfully",
      action: "add-trainer" 
    });
  }

  if (action === "remove-trainer") {
    const trainerId = formData.get("trainerId");
    const facilityId = formData.get("facilityId");

    const { error: removeError } = await supabaseClient
      .from("facility_trainers")
      .delete()
      .match({ facility_id: facilityId, id: trainerId });

    if (removeError) {
      return json({ error: "Failed to remove trainer" }, { status: 500 });
    }

    return json({ success: true });
  }

  return null;
};

export default function FacilitySettings() {
  const { facility, trainers } = useLoaderData<typeof loader>();
  const actionData = useActionData();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [isAddTrainerDialogOpen, setIsAddTrainerDialogOpen] = useState(false);
  const [trainerEmail, setTrainerEmail] = useState("");

  // Handle action responses
  useEffect(() => {
    if (actionData?.action === "add-trainer") {
      if (actionData.success) {
        toast({
          title: "Success",
          description: actionData.message,
          duration: 3000,
        });
        setIsAddTrainerDialogOpen(false);
        setTrainerEmail("");
      } else {
        // Handle errors appropriately, e.g., display an error message
        console.error("Error adding trainer:", actionData.error);
      }
    }
  }, [actionData, toast]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Facility Settings</h1>
      <div className="grid gap-6">
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Manage Trainers</h2>
            <Button
              variant="outline"
              onClick={() => setIsAddTrainerDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <UserPlus2 className="h-4 w-4" />
              Add Trainer
            </Button>
          </div>
          <Card className="p-4">
            {trainers.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                No trainers assigned yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trainer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainers.map((trainer: any) => (
                    <TableRow key={trainer.id}>
                      <TableCell className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={trainer.users.avatar_url || "/placeholder.svg"}
                            alt={trainer.users.full_name}
                          />
                          <AvatarFallback>
                            {trainer.users.full_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{trainer.users.full_name}</p>
                          <p className="text-sm text-gray-500">
                            {trainer.users.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{trainer.users.phone}</TableCell>
                      <TableCell>
                        <Form method="post">
                          <input type="hidden" name="action" value="remove-trainer" />
                          <input type="hidden" name="trainerId" value={trainer.id} />
                          <input type="hidden" name="facilityId" value={facility.id} />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            type="submit"
                          >
                            <UserX2 className="h-4 w-4" />
                          </Button>
                        </Form>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </section>

        <Dialog open={isAddTrainerDialogOpen} onOpenChange={setIsAddTrainerDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Trainer</DialogTitle>
            </DialogHeader>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="action" value="add-trainer" />
              <input type="hidden" name="facilityId" value={facility.id} />
              
              {actionData?.action === "add-trainer" && actionData.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{actionData.error} <Link to="/signup" className="underline">invite</Link> them to create an account.</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="trainerEmail">Trainer Email</Label>
                <Input
                  id="trainerEmail"
                  name="trainerEmail"
                  type="email"
                  placeholder="trainer@example.com"
                  value={trainerEmail}
                  onChange={(e) => setTrainerEmail(e.target.value)}
                  required
                />
              </div>
              
              <DialogDescription className="text-sm text-gray-500">
                Enter the email address of the trainer you want to add. They must have a Sportsdot account.
                <div className=" space-x-1">
              <span className="text-sm text-gray-600">
                Don't have an account?
              </span>
              <Link
                to="/signup"
                className="text-sm font-medium text-purple-600 hover:text-purple-500"
              >
                create one
              </Link>
            </div>
              </DialogDescription>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddTrainerDialogOpen(false);
                    setTrainerEmail("");
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Add Trainer</Button>
              </div>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}