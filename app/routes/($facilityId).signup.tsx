import { useState } from 'react';
import { json, redirect, ActionFunction, LoaderFunction } from '@remix-run/node';
import { useActionData, useLoaderData, Form, Link, useNavigate } from '@remix-run/react';
import { createServerClient, parse, serialize } from '@supabase/ssr';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Checkbox } from '~/components/ui/checkbox';
import { Progress } from "~/components/ui/progress";
import { supabase } from "~/utils/supabase.server";
import iconImage from '~/assets/sportsdot-favicon-64-01.svg';
import { ImagePlus, Check, X, Eye, EyeOff } from 'lucide-react';

import { getAuthenticatedUser } from '~/utils/currentUser';
export const loader: LoaderFunction = async ({ request }) => {
  
  const user=await getAuthenticatedUser(request);

  if (!user) {
    return json({ isCurrentUserAdmin: false });
  }

  const { data: userData, error } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (error || !userData?.is_admin) {
    console.error('Error fetching user data or user is not an admin:', error);
    return json({ isCurrentUserAdmin: false });
  }

  return json({ isCurrentUserAdmin: userData.is_admin });
};

export const action: ActionFunction = async ({ request, params }) => {
  const response = new Response();

  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const phoneNumber = formData.get('phoneNumber') as string;
  const photo = formData.get('photo') as File;
  const isAdmin = formData.get('isAdmin') === 'on';
  

    // Validate password strength
    if (password.length < 8) {
      return json({ error: 'Password must be at least 8 characters long' });
    }
  
    if (!/[A-Z]/.test(password)) {
      return json({ error: 'Password must contain at least one uppercase letter' });
    }
  
    if (!/[a-z]/.test(password)) {
      return json({ error: 'Password must contain at least one lowercase letter' });
    }
  
    if (!/[0-9!@#$%^&*]/.test(password)) {
      return json({ error: 'Password must contain at least one number or special character' });
    }


  // Check if the current user is an admin
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (isAdmin && currentUser) {
    const { data: currentUserData, error: currentUserError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', currentUser.id)
      .single();

    if (currentUserError || !currentUserData?.is_admin) {
      return json({ error: 'Only admins can create admin accounts' });
    }
  } else if (isAdmin) {
    return json({ error: 'You must be logged in as an admin to create admin accounts' });
  }

  // Sign up the user (this creates an entry in auth.users)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    return json({ error: authError.message });
  }

  if (authData.user) {
    let photoUrl = null;

    // Upload photo if provided
    if (photo && photo.size > 0) {
      const fileExt = photo.name.split('.').pop();
      const fileName = `${authData.user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('member-photos')
        .upload(`user-profile/${fileName}`, photo);

      if (uploadError) {
        return json({ error: 'Failed to upload photo' });
      }

      const { data: { publicUrl } } = supabase.storage
        .from('member-photos')
        .getPublicUrl(`user-profile/${fileName}`);

      photoUrl = publicUrl;
    }

    // Create a corresponding entry in public.users
    const { error: profileError } = await supabase
      .from('users')
      .insert({ 
        id: authData.user.id, 
        email: authData.user.email, 
        full_name: fullName,
        phone: phoneNumber,
        avatar_url: photoUrl,
        is_admin: isAdmin
      });

    if (profileError) {
      return json({ error: 'Failed to create user profile' });
      
    }
    if (params.facilityId) {
      return redirect(`/${params.facilityId}/trainers`)
    } 
    else {
      return redirect('/admin/users');
    };
    }
  return json({ error: 'An unexpected error occurred' });
};

export default function Signup() {
  const actionData = useActionData();
  const { isCurrentUserAdmin } = useLoaderData<{ isCurrentUserAdmin: boolean }>();
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [strength, setStrength] = useState(0);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const calculateStrength = (value: string) => {
    let score = 0;
    if (value.length >= 8) score += 25;
    if (/[A-Z]/.test(value)) score += 25;
    if (/[a-z]/.test(value)) score += 25;
    if (/[0-9!@#$%^&*]/.test(value)) score += 25;
    return score;
  };

  const getStrengthColor = (strength: number) => {
    if (strength <= 25) return 'text-red-500';
    if (strength <= 50) return 'text-orange-500';
    if (strength <= 75) return 'text-yellow-500';
    return 'text-green-500';
  };


  return (
    <div className="min-h-screen bg-[#f0ebff] dark:bg-[#212237] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center">
          <div className='space-y-2 relative w-32 h-32'>
          <img src={iconImage} alt="logo" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Signup Form */}
        <div className="space-y-6">
          <h2 className="text-2xl font-medium text-center text-purple-600">Sign Up</h2>
          
          <Form method="post" onSubmit={() => setIsLoading(true)} className="space-y-6" encType="multipart/form-data">
            {actionData?.error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{actionData.error}</span>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  placeholder="Full Name"
                  className="h-12 rounded-2xl bg-background dark:bg-[#4A4A62]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Email"
                  className="h-12 bg-background dark:bg-[#4A4A62] rounded-2xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    className="h-12 bg-background dark:bg-[#4A4A62] rounded-2xl pr-10"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setStrength(calculateStrength(e.target.value));
                    }}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(password.length > 0)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <Eye className="h-4 w-4 text-gray-500" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    )}
                    <span className="sr-only">
                      {showPassword ? "Hide password" : "Show password"}
                    </span>
                  </Button>
                </div>
                {(isPasswordFocused || password.length > 0) && (
                  <div className="space-y-2">
                    <Progress value={strength} className="h-2" />
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Password requirements:</p>
                      <ul className="text-sm space-y-1">
                        <li className="flex items-center gap-2">
                          {password.length >= 8 ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                          At least 8 characters
                        </li>
                        <li className="flex items-center gap-2">
                          {/[A-Z]/.test(password) ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                          One uppercase letter
                        </li>
                        <li className="flex items-center gap-2">
                          {/[a-z]/.test(password) ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                          One lowercase letter
                        </li>
                        <li className="flex items-center gap-2">
                          {/[0-9!@#$%^&*]/.test(password) ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                          One number or special character
                        </li>
                      </ul>
                      <p className={`text-sm font-medium ${getStrengthColor(strength)}`}>
                        {strength === 0 && 'Very Weak'}
                        {strength === 25 && 'Weak'}
                        {strength === 50 && 'Medium'}
                        {strength === 75 && 'Strong'}
                        {strength === 100 && 'Very Strong'}
                      </p>
                  </div>
                </div>
  )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  placeholder="Phone Number"
                  className="h-12 bg-background dark:bg-[#4A4A62] rounded-2xl"
                  required
                />
              </div>
              {/* Photo */}
              <div className="space-y-2">
                <Label htmlFor="photo">Photo</Label>
                <label htmlFor="photo" className="block">
                  <Input
                    id="photo"
                    name="photo"
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer flex flex-col items-center">
                    {preview ? (
                      <img
                        src={preview}
                        alt="Selected"
                        className="h-32 w-32 object-cover mb-2"
                      />
                    ) : (
                      <>
                        <ImagePlus className="h-8 w-8 mb-2" />
                        <span>Upload photo</span>
                      </>
                    )}
                  </div>
                </label>
              </div>
              {isCurrentUserAdmin && (
                <div className="flex items-center space-x-2">
                  <Checkbox id="isAdmin" name="isAdmin" className="border-purple-300" />
                  <Label htmlFor="isAdmin" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Create as Admin User
                  </Label>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full h-12 text-lg font-medium bg-[#8e76af] hover:bg-[#8e76af]/90 dark:bg-[#3A3A52] text-white rounded-2xl" disabled={isLoading || strength < 100}>
              {isLoading ? 'Signing up...' : 'Sign up'}
            </Button>

            <div className="text-center space-x-1">
              <span className="text-sm text-gray-600">Already have an account?</span>
              <Link
                to="/login"
                className="text-sm font-medium text-purple-600 hover:text-purple-500"
              >
                Log in
              </Link>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}