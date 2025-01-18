import { json, type LoaderFunction } from "@remix-run/node";
import { supabase } from "~/utils/supabase.server";
import { getAuthenticatedUser } from "~/utils/currentUser";

export const loader: LoaderFunction = async ({ params, request }) => {
  const facilityId = params.facilityId;
  const user = await getAuthenticatedUser(request);
  const url = new URL(request.url);
  const timelineFilter = url.searchParams.get("timeline") || "today";
  const planFilter = url.searchParams.get("plan") || "all";
  const searchTerm = url.searchParams.get("search") || "";

  // Verify facility access
  const { data: facility, error: facilityError } = await supabase
    .from("facilities")
    .select("name")
    .eq("id", facilityId)
    .eq("user_id", user.id)
    .single();

  if (facilityError) {
    throw new Response("No access", { status: 409 });
  }

  let startDate, endDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (timelineFilter) {
    case "today":
      startDate = today;
      endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      break;
    case "yesterday":
      startDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      endDate = today;
      break;
    case "thisMonth":
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    case "lastMonth":
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      endDate = new Date(today.getFullYear(), today.getMonth(), 0);
      break;
    case "last7Days":
      startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = today;
      break;
    case "last30Days":
      startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = today;
      break;
    case "allTime":
      startDate = new Date(0);
      endDate = new Date();
      break;
    default:
      startDate = today;
      endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  }

  // Parallel fetch all required data
  const [
    transactionsResponse,
    previousTransactionsResponse,
    membersBalanceResponse,
    plansResponse
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select(`
        id,
        amount,
        created_at,
        member_id,
        members (id, full_name, email),
        memberships (plans (id, name))
      `)
      .eq("type", "payment")
      .eq("facility_id", facilityId)
      .gte("created_at", startDate.toISOString())
      .lt("created_at", endDate.toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("amount")
      .eq("type", "payment")
      .eq("facility_id", facilityId)
      .gte("created_at", new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())).toISOString())
      .lt("created_at", startDate.toISOString()),
    supabase
      .from("members")
      .select("balance")
      .eq("facility_id", facilityId)
      .gt("balance", 0),
    supabase
      .from("plans")
      .select("id, name")
      .eq("facility_id", facilityId)
  ]);

  if (transactionsResponse.error) {
    throw new Error("Failed to fetch transactions");
  }

  const transactions = transactionsResponse.data;
  const income = transactions.reduce((sum, t) => sum + t.amount, 0);
  const previousIncome = previousTransactionsResponse.data?.reduce((sum, t) => sum + t.amount, 0) || 0;
  const totalPendingBalance = membersBalanceResponse.data?.reduce((sum, m) => sum + m.balance, 0) || 0;

  // Calculate daily/hourly earnings
  const dailyEarnings = [];
  if (timelineFilter === "today" || timelineFilter === "yesterday") {
    for (let h = 0; h < 24; h++) {
      const date = new Date(startDate);
      date.setHours(h, 0, 0, 0);
      const dateString = date.toISOString();
      const amount = transactions
        .filter(t => new Date(t.created_at).getHours() === h)
        .reduce((sum, t) => sum + t.amount, 0);
      dailyEarnings.push({ date: dateString, amount });
    }
  } else {
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      const dateString = d.toISOString().split("T")[0];
      const amount = transactions
        .filter(t => t.created_at.startsWith(dateString))
        .reduce((sum, t) => sum + t.amount, 0);
      dailyEarnings.push({ date: dateString, amount });
    }
  }

  return json({
    transactions: transactions.map(t => ({
      id: t.id,
      user: t.members.full_name,
      member_id: t.member_id,
      amount: t.amount,
      timestamp: new Date(t.created_at).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }),
      avatar: `https://api.dicebear.com/6.x/initials/svg?seed=${t.members.full_name}`,
      plan: t.memberships?.plans?.name || "N/A",
    })),
    income,
    previousIncome,
    totalPendingBalance,
    dailyEarnings,
    plans: plansResponse.data || [],
    timelineFilter,
    planFilter,
    searchTerm,
  }, {
    headers: {
      "Cache-Control": "private, max-age=60",
      "Vary": "Cookie",
    },
  });
};

