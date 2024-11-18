import { createServerClient } from '@supabase/ssr';

export async function isAdmin(request) {
  const supabase = createServerClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (key) => request.headers.get('Cookie'),
        set: () => {},
        remove: () => {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data, error } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    return false;
  }

  return data.is_admin;
}

export async function createUser(email, password, isAdmin) {
  const supabase = createServerClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { cookies: {} }
  );

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data.user) {
    const { error: profileError } = await supabase
      .from('users')
      .insert({ id: data.user.id, email: data.user.email, is_admin: isAdmin });

    if (profileError) {
      throw new Error('Failed to create user profile');
    }

    return data.user;
  }

  throw new Error('Failed to create user');
}

