import { json, LoaderFunction, ActionFunction, redirect } from "@remix-run/node";
import { useLoaderData, Form, useActionData, Link, useNavigate } from "@remix-run/react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "~/utils/supabase.server";
import { getAuthenticatedUser } from "~/utils/currentUser";
import { Building2, Camera, ChevronRight, HelpCircle, KeyRound, LogOut } from 'lucide-react';
import { parse, serialize } from "cookie";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { ThemeToggle } from "~/components/theme-toggle";
import { createServerClient } from '@supabase/ssr';
import { useToast } from "~/hooks/use-toast";

export const loader: LoaderFunction = async ({ request }) => {
  const currentUser = await getAuthenticatedUser(request);
  if (!currentUser) {
    throw redirect("/login");
  }
  const { data: user } = await supabase
    .from("users")
    .select("id, full_name, email, phone, avatar_url")
    .eq("id", currentUser.id)
    .single();

  const { data: facilities } = await supabase
    .from("facilities")
    .select("id, name, address")
    .eq("user_id", currentUser.id);

  return json({ user, facilities: facilities || [] });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const action = formData.get("action");
  const currentUser = await getAuthenticatedUser(request);

  if (!currentUser) {
    throw redirect("/login");
  }
  const { data: user } = await supabase
    .from("users")
    .select("id, full_name, email, phone, avatar_url")
    .eq("id", currentUser.id)
    .single();

  if (action === "update-profile") {
    const fullName = formData.get("fullName");
    const email = formData.get("email");
    const phone = formData.get("phone");
    const avatar = formData.get("avatar");

    let avatarUrl = null;
    if (avatar instanceof File && avatar.size > 0) {
      const fileExt = avatar.name.split('.').pop();
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
      
      // Delete old avatar if exists
      if (user?.avatar_url) {
        const oldFileName = user.avatar_url.split('/').pop();
        await supabase.storage
          .from('member-photos')
          .remove([oldFileName]);
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('member-photos')
        .upload(`user-profile/${fileName}`, avatar);

      if (uploadError) {
        console.error("Failed to upload profile photo:", uploadError);
        return json({ error: "Failed to upload profile photo" }, { status: 400 });
      }

      const { data: { publicUrl } } = supabase.storage
        .from('member-photos')
        .getPublicUrl(`user-profile/${fileName}`);

      avatarUrl = publicUrl;
    }

    const { error } = await supabase
      .from("users")
      .update({
        full_name: fullName,
        email,
        phone,
        ...(avatarUrl && { avatar_url: avatarUrl }),
      })
      .eq("id", user?.id);

    if (error) {
        console.error("Failed to update profile:", error);
      return json({ error: "Failed to update profile" }, { status: 400 });
    }

    return json({ success: true, message: "Profile updated successfully" });
  }
  const supabaseAuth = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => parse(request.headers.get("Cookie") || "")[key],
        set: (key, value, options) => {
          const response = new Response(null);
          response.headers.append("Set-Cookie", serialize(key, value, options));
          return response;
        },
        remove: (key, options) => {
          const response = new Response(null);
          response.headers.append("Set-Cookie", serialize(key, "", options));
          return response;
        },
      },
    }
  );

  if (action === "change-password") {
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      return json({ error: "Passwords do not match" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return json({ error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    

    const { error } = await supabaseAuth.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return json({ error: "Failed to update password" }, { status: 400 });
    }

    return json({ success: true, message: "Password updated successfully" });
  }

  if (action === "logout") {
    const { error } = await supabaseAuth.auth.signOut();
    if (error) {
      return json({ error: "Failed to logout" }, { status: 400 });
    }
    return redirect("/login");
  }

  return null;
};

export default function Settings() {
  const { user, facilities } = useLoaderData<typeof loader>();
  const actionData = useActionData();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(user.avatar_url);
  
  const formRef = useRef<HTMLFormElement>(null);
  const passwordFormRef = useRef<HTMLFormElement>(null);

  const handlePasswordSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const newPassword = form.newPassword.value;
    const confirmPassword = form.confirmPassword.value;

    setPasswordError("");

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    form.submit();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (actionData?.success) {
      toast({
        title: "Success",
        description: actionData.message,
        duration: 3000,
      });
      setIsEditProfileOpen(false);
      setIsChangePasswordOpen(false);
      if (formRef.current) formRef.current.reset();
      if (passwordFormRef.current) passwordFormRef.current.reset();
      setPasswordError("");
    } else if (actionData?.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: actionData.error,
      });
    }
  }, [actionData, toast]);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>

        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Manage your profile information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between flex-wrap sm:flex-nowrap gap-4">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <Avatar className="h-16 w-16 shrink-0">
                  <AvatarImage src={user.avatar_url || `https://api.dicebear.com/6.x/initials/svg?seed=${user.full_name}`} />
                  <AvatarFallback>{user.full_name[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium truncate">{user.full_name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">Edit Profile</Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-lg sm:w-full">
                  <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                      Update your profile information
                    </DialogDescription>
                  </DialogHeader>
                  <Form ref={formRef} method="post" className="space-y-4" encType="multipart/form-data">
                    <input type="hidden" name="action" value="update-profile" />
                    <div className="space-y-2">
                      <Label htmlFor="avatar">Profile Picture</Label>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage
                            src={avatarPreview || `https://api.dicebear.com/6.x/initials/svg?seed=${user.full_name}`}
                          />
                          <AvatarFallback>{user.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            id="avatar"
                            name="avatar"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarChange}
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              document.getElementById('avatar')?.click();
                            }}
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            Change
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        defaultValue={user.full_name}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={user.email}
                        disabled
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        defaultValue={user.phone}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditProfileOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Save Changes</Button>
                    </div>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Owned Facilities */}
        <Card>
          <CardHeader>
            <CardTitle>Your Facilities</CardTitle>
            <CardDescription>
              Facilities you own and manage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {facilities.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                You don't own any facilities yet.
              </p>
            ) : (
              <div className="space-y-2">
                {facilities.map((facility) => (
                  <Link
                    key={facility.id}
                    to={`/${facility.id}/home`}
                    className="flex items-center justify-between p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{facility.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {facility.address}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
            <Button asChild className="w-full">
              <Link to="/add-facility">Add New Facility</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Security & Privacy */}
        <Card>
          <CardHeader>
            <CardTitle>Security & Privacy</CardTitle>
            <CardDescription>
              Manage your account security settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
              <DialogTrigger asChild>
                <div className="flex items-center justify-between p-2 hover:bg-muted rounded-lg transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <KeyRound className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Change Password</p>
                      <p className="text-sm text-muted-foreground">
                        Update your password
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-lg sm:w-full">
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>
                    Enter your new password below.
                  </DialogDescription>
                </DialogHeader>
                <Form 
                  ref={passwordFormRef}
                  method="post" 
                  className="space-y-4" 
                  onSubmit={handlePasswordSubmit}
                >
                  <input type="hidden" name="action" value="change-password" />
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      minLength={6}
                    />
                    {passwordError && (
                      <p className="text-sm text-destructive mt-1">{passwordError}</p>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsChangePasswordOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Update Password</Button>
                  </div>
                </Form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>
              Customize your app experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Toggle dark mode theme
                  </p>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        {/* Help & Support */}
        <Card>
          <CardHeader>
            <CardTitle>Help & Support</CardTitle>
            <CardDescription>
              Get help and learn more about Sportsdot
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              to="/help-center"
              className="flex items-center justify-between p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Help Center</p>
                  <p className="text-sm text-muted-foreground">
                    View guides and documentation
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>

        {/* Logout */}
        
            <Form method="post">
            <input type="hidden" name="action" value="logout" />
                <Button
                  variant="destructive"
                  className="w-full flex items-center gap-2"
                  type="submit"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
            </Form>
      </main>
    </div>
  );
}