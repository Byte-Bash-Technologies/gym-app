import { supabase } from "~/utils/supabase.server";
import { json, redirect } from "@remix-run/node";

export const action = async ({ request }) => {
    const { data, error } = await supabase.auth.signOut();

    if (error) {
        console.error("Error logging out:", error.message);
        return json({ error: error.message }, { status: 500 });
    }

    return redirect("/login");
};
