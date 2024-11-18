import { json, redirect, LoaderFunction, ActionFunction } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import Select from 'react-select';
import { supabase } from "~/utils/supabase.server";
import {  serialize,parse,createServerClient } from '@supabase/ssr';

// Define the loader function to check admin status and fetch users
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
    return redirect('/');
  }

  const { data: userData, error } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (error || !userData?.is_admin) {
    console.error('Error fetching user data or user is not an admin:', error);
    return redirect('/');
  }

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, full_name');

  if (usersError) {
    console.error('Error fetching users:', usersError);
    return redirect('/');
  }

  return json({ isCurrentUserAdmin: userData.is_admin, users });
};

// Define the action function to handle form submission
export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const name = formData.get('name');
  const type = formData.get('type');
  const userId = formData.get('user_id');

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return json({ error: 'You must be logged in to add facilities' });
  }

  const { data: userData, error } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (error || !userData?.is_admin) {
    return json({ error: 'Only admins can add facilities' });
  }

  const { error: insertError } = await supabase
    .from('facilities')
    .insert({ name, type, user_id: userId });

  if (insertError) {
    console.error('Error inserting facility:', insertError);
    return json({ error: insertError.message });
  }

  return redirect('/facilities');
};

// Define the AddFacility component
export default function AddFacility() {
  const { isCurrentUserAdmin, users } = useLoaderData();

  if (!isCurrentUserAdmin) {
    return <p>You do not have permission to access this page.</p>;
  }

  const userOptions = users.map(user => ({
    value: user.id,
    label: `${user.full_name} (${user.phone})`
  }));

  return (
    <div>
      <h1>Add Facility</h1>
      <Form method="post">
        <div>
          <label htmlFor="name">Facility Name</label>
          <input type="text" name="name" id="name" required />
        </div>
        <div>
          <label htmlFor="type">Facility Type</label>
          <input type="text" name="type" id="type" required />
        </div>
        <div>
          <label htmlFor="user_id">Assign User</label>
          <Select
            name="user_id"
            options={userOptions}
            isSearchable
            placeholder="Select a user"
          />
        </div>
        <button type="submit">Add Facility</button>
      </Form>
    </div>
  );
}

