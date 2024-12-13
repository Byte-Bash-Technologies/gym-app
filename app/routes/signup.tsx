import { useState } from 'react';
import { json, redirect, ActionFunction, LoaderFunction } from '@remix-run/node';
import { useActionData, useLoaderData, Form, Link } from '@remix-run/react';
import { createServerClient, parse, serialize } from '@supabase/ssr';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Checkbox } from '~/components/ui/checkbox';
import { supabase } from "~/utils/supabase.server";
import iconImage from '~/assets/sportsdot-favicon-64-01.svg';
import { ImagePlus } from 'lucide-react';

export const loader: LoaderFunction = async ({ request }) => {
  const response = new Response();
  const supabase = createServerClient(
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
  const { data: { user } } = await supabase.auth.getUser();

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

export const action: ActionFunction = async ({ request }) => {
  const response = new Response();

  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const phoneNumber = formData.get('phoneNumber') as string;
  const photo = formData.get('photo') as File;
  const isAdmin = formData.get('isAdmin') === 'on';

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

    return redirect('/admin/users', {
      headers: response.headers,
    });
  }

  return json({ error: 'An unexpected error occurred' });
};

export default function Signup() {
  const actionData = useActionData();
  const { isCurrentUserAdmin } = useLoaderData<{ isCurrentUserAdmin: boolean }>();
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-purple-100 flex flex-col items-center px-4 py-8">
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
                  className="h-12 bg-white rounded-2xl"
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
                  className="h-12 bg-white rounded-2xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Password"
                  className="h-12 bg-white rounded-2xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  placeholder="Phone Number"
                  className="h-12 bg-white rounded-2xl"
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

            <Button type="submit" className="w-full h-12 text-lg font-medium bg-purple-400 hover:bg-purple-500 rounded-2xl" disabled={isLoading}>
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