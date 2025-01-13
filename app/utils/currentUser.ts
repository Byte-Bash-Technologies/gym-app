import { createServerClient, parse } from "@supabase/ssr";
import { redirect } from "@remix-run/node";

export async function getAuthenticatedUser(request: Request) {
  const supabaseAuth = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => parse(request.headers.get("Cookie") || "")[key],
        set: () => {},
        remove: () => {},
      },
    }
  );

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    throw redirect("/login");
  }

  return user;
}

export async function logoutUser(request: Request) {
  const supabaseAuth = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => parse(request.headers.get("Cookie") || "")[key],
        set: () => {},
        remove: () => {},
      },
    }
  );

  await supabaseAuth.auth.signOut();

  return redirect("/login", {
    headers: {
      "Set-Cookie": "sb:token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    },
  });
}
export async function updateUser(request: Request, updates: { [key: string]: any }) {
  const supabaseAuth = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => parse(request.headers.get("Cookie") || "")[key],
        set: () => {},
        remove: () => {},
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabaseAuth.auth.updateUser(updates);

  if (error) {
    return error.message;
  }

  return user;
}