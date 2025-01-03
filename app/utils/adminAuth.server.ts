import { createServerClient,parseCookieHeader,serializeCookieHeader } from '@supabase/ssr';

export const supabaseAuth = (request: Request, response: Response) => createServerClient(
  
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  {
    cookies: {
      get: (key) => parseCookieHeader(request.headers.get("Cookie") || "")[key],
      set: (key, value, options) => {
        response.headers.append("Set-Cookie", serializeCookieHeader(key, value, options));
      },
      remove: (key, options) => {
        response.headers.append("Set-Cookie", serializeCookieHeader(key, "", options));
      },
    },
  }
);