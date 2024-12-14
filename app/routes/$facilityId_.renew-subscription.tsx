import { json, LoaderFunction, redirect } from '@remix-run/node';
import { useLoaderData, Form } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { supabase } from '~/utils/supabase.server';
import { Button } from '~/components/ui/button';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { Label } from '~/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '~/components/ui/card';
import { getAuthenticatedUser } from '~/utils/currentUser';

export const loader: LoaderFunction = async ({ request,params }) => {
  const facilityId = params.facilityId
  if (!facilityId) {
    return json({ error: 'Facility ID is required' }, { status: 400 });
  }

  const user = await getAuthenticatedUser(request);

  if (!user) {
    return redirect('/login');
  }
  const {data:user_role} = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id);
    
  
  if (user_role && user_role[0] && user_role[0].is_admin) {

    return redirect(`https://app.sportsdot.in/admin/facilities/${facilityId}`);
  }

  return redirect("/");
};

