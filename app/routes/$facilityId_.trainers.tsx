import { json, LoaderFunction, ActionFunction,  } from "@remix-run/node";
import { useLoaderData, Form, useActionData, Link,  } from "@remix-run/react";
import { supabase } from "~/utils/supabase.server";
import { getAuthenticatedUser } from "~/utils/currentUser";
import { UserPlus2, UserX2, AlertCircle, Phone, Mail, ArrowLeft } from 'lucide-react';
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { createServerClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";
import { useToast } from "~/hooks/use-toast";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { useState, useEffect } from "react";
import { Badge } from "~/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "~/components/ui/alert-dialog";

interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
}

interface Trainer {
  id: string;
  users: User;
}

interface Facility {
  id: string;
  name: string;
  user_id: string;
}

interface LoaderData {
  facility: Facility;
  trainers: Trainer[];
}

interface ActionData {
  success?: boolean;
  message?: string;
  error?: string;
  action?: "add-trainer" | "remove-trainer";
}

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
    throw new Response("Not Found", { status: 409 });
  }

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
export { ErrorBoundary } from "~/components/CatchErrorBoundary";

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

  if (action === "add-trainer") {
    const trainerEmail = formData.get("trainerEmail") as string;
    const facilityId = formData.get("facilityId") as string;

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", trainerEmail)
      .single();

    if (userError) {
      return json({ 
        error: "No user found with this email. Please verify the email or invite them to create an account.", 
        action: "add-trainer" 
      }, { status: 404 });
    }

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
    const trainerId = formData.get("trainerId") as string;
    const facilityId = formData.get("facilityId") as string;

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

export default function TrainersPage() {
  const { facility, trainers } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const { toast } = useToast();
  const [isAddTrainerDialogOpen, setIsAddTrainerDialogOpen] = useState(false);
  const [trainerEmail, setTrainerEmail] = useState("");
  const [deleteConfirmTrainer, setDeleteConfirmTrainer] = useState<Trainer | null>(null);

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
      }
    }
  }, [actionData, toast]);

  const handleDeleteTrainer = (trainer: Trainer) => {
    setDeleteConfirmTrainer(trainer);
  };

  return (
    <div className="min-h-screen bg-background dark:bg-[#212237] text-foreground">
      <Card className="rounded-none border-x-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4">
          <Link to={`/${facility.id}/settings`} className="flex items-center space-x-2">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <CardTitle className="text-xl font-bold">Manage Trainers</CardTitle>
          <div className="w-6" /> {/* Spacer for alignment */}
        </CardHeader>
      </Card>

      <div className="p-4 space-y-6">
        {trainers.length === 0 ? (
          <Card className="p-6">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">No trainers assigned yet</p>
              <Button
                onClick={() => setIsAddTrainerDialogOpen(true)}
                className="bg-[#8e76af] hover:bg-[#8e76af]/90 dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]/90 text-white"
              >
                <UserPlus2 className="h-4 w-4 mr-2" />
                Add Your First Trainer
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {trainers.map((trainer) => (
              <Card key={trainer.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={trainer.users.avatar_url || `https://api.dicebear.com/6.x/initials/svg?seed=${trainer.users.full_name}`}
                          alt={trainer.users.full_name}
                        />
                        <AvatarFallback>{trainer.users.full_name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{trainer.users.full_name}</h3>
                        <Badge variant="secondary" className="mt-1">Trainer</Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive/90"
                      onClick={() => handleDeleteTrainer(trainer)}
                    >
                      <UserX2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 mr-2" />
                      {trainer.users.email}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 mr-2" />
                      {trainer.users.phone}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {trainers.length > 0 && (
          <Button
            onClick={() => setIsAddTrainerDialogOpen(true)}
            className="fixed right-6 bottom-24 h-14 w-14 rounded-full bg-[#8e76af] hover:bg-[#8e76af]/90 dark:bg-[#4A4A62] text-white shadow-lg"
          >
            <UserPlus2 className="h-6 w-6" />
          </Button>
        )}

        <Dialog open={isAddTrainerDialogOpen} onOpenChange={setIsAddTrainerDialogOpen}>
          <DialogContent className="dark:bg-[#212237]">
            <DialogHeader>
              <DialogTitle>Add Trainer</DialogTitle>
            </DialogHeader>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="action" value="add-trainer" />
              <input type="hidden" name="facilityId" value={facility.id} />
              
              {actionData?.action === "add-trainer" && actionData.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {actionData.error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="trainerEmail">Trainer Email</Label>
                <Input
                  id="trainerEmail"
                  name="trainerEmail"
                  className="dark:bg-[#4A4A62]"
                  type="email"
                  placeholder="trainer@example.com"
                  value={trainerEmail}
                  onChange={(e) => setTrainerEmail(e.target.value)}
                  required
                />
              </div>
              
              <DialogDescription className="text-sm text-muted-foreground">
                Enter the email address of the trainer you want to add. They must have a Sportsdot account.
                <div className="mt-2">
                  <span>Don&apos;t have an account? </span>
                  <Link to={`/${facility.id}/signup`} className="font-medium text-[#8e76af] hover:text-[#8e76af]/90">
                    Create one
                  </Link>
                </div>
              </DialogDescription>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  className="dark:bg-[#4A4A62] dark:hover:bg-[#4A4A62]/90"
                  variant="outline"
                  onClick={() => {
                    setIsAddTrainerDialogOpen(false);
                    setTrainerEmail("");
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#8e76af] hover:bg-[#8e76af]/90 dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]/90 text-white">
                  Add Trainer
                </Button>
              </div>
            </Form>
          </DialogContent>
        </Dialog>
        <AlertDialog 
          open={!!deleteConfirmTrainer} 
          onOpenChange={(open) => !open && setDeleteConfirmTrainer(null)}
        >
          <AlertDialogContent className="dark:bg-[#212237]">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Trainer</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {deleteConfirmTrainer?.users.full_name} as a trainer? 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="dark:bg-[#3A3A52]">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteConfirmTrainer) {
                    const form = document.createElement('form');
                    form.method = 'post';
                    
                    const actionInput = document.createElement('input');
                    actionInput.type = 'hidden';
                    actionInput.name = 'action';
                    actionInput.value = 'remove-trainer';
                    
                    const trainerIdInput = document.createElement('input');
                    trainerIdInput.type = 'hidden';
                    trainerIdInput.name = 'trainerId';
                    trainerIdInput.value = deleteConfirmTrainer.id;
                    
                    const facilityIdInput = document.createElement('input');
                    facilityIdInput.type = 'hidden';
                    facilityIdInput.name = 'facilityId';
                    facilityIdInput.value = facility.id;
                    
                    form.appendChild(actionInput);
                    form.appendChild(trainerIdInput);
                    form.appendChild(facilityIdInput);
                    
                    document.body.appendChild(form);
                    form.submit();
                    document.body.removeChild(form);
                    
                    setDeleteConfirmTrainer(null);
                  }
                }}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

