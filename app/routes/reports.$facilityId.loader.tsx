import { json, type LoaderFunction } from "@remix-run/node";
import { getAuthenticatedUser } from "~/utils/currentUser";
import { supabase } from "~/utils/supabase.server";

export const loader: LoaderFunction = async ({ params,request }) => {
  const user = await getAuthenticatedUser(request);
  const facilityId = params.facilityId;
  const { data: facility, error: facilityError } = await supabase
  .from("facilities")
  .select("name")
  .eq("id", facilityId)
  .eq("user_id", user.id)
  .single();
if (facilityError) {
  throw new Response("No access", { status: 409 });
}

  if (!facilityId) {
    throw new Error("Facility ID is required");
  }

  try {
    const [
      totalReceivedData,
      pendingPaymentData,
      recentTransactions,
      todayIncome,
      yesterdayIncome,
      earningSummaryData
    ] = await Promise.all([
      supabase
        .from('transactions')
        .select('amount')
        .eq('facility_id', facilityId)
        .eq('type', 'payment')
        .gt('amount', 0),
      supabase
        .from('members')
        .select('balance')
        .eq('facility_id', facilityId)
        .gt('balance', 0),
      supabase
        .from('transactions')
        .select('id, amount, created_at, members (full_name)')
        .eq('facility_id', facilityId)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('transactions')
        .select('amount')
        .eq('facility_id', facilityId)
        .eq('type', 'payment')
        .gte('created_at', new Date().toISOString().split('T')[0]),
      supabase
        .from('transactions')
        .select('amount')
        .eq('facility_id', facilityId)
        .eq('type', 'payment')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .lt('created_at', new Date().toISOString().split('T')[0]),
      supabase
        .from('transactions')
        .select('amount, created_at')
        .eq('facility_id', facilityId)
        .eq('type', 'payment')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true })
    ]);

    const totalReceived = totalReceivedData.data?.reduce((sum, transaction) => sum + transaction.amount, 0) || 0;
    const pendingPayment = pendingPaymentData.data?.reduce((sum, member) => sum + member.balance, 0) || 0;

    const totalAmount = totalReceived + pendingPayment;
    const transactionStats = {
      received: (totalReceived / totalAmount) * 100,
      pending: (pendingPayment / totalAmount) * 100,
    };

    const todayTotal = todayIncome.data?.reduce((sum, t) => sum + t.amount, 0) || 0;
    const yesterdayTotal = yesterdayIncome.data?.reduce((sum, t) => sum + t.amount, 0) || 0;
    const percentageChange = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;

    const earningSummary = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateString = date.toISOString().split('T')[0];
      const amount = earningSummaryData.data
        ?.filter(t => t.created_at.startsWith(dateString))
        .reduce((sum, t) => sum + t.amount, 0) || 0;
      return { date: dateString, amount };
    }).reverse();

    return json({
      metrics: {
        totalReceived,
        pendingPayment,
      },
      transactions: recentTransactions.data?.map(t => ({
        id: t.id,
        user: t.members.full_name,
        amount: t.amount,
        timestamp: new Date(t.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      })) || [],
      transactionStats,
      income: {
        today: todayTotal,
        yesterday: yesterdayTotal,
        percentageChange,
      },
      earningSummary,
    });
  } catch (error) {
    console.error('Error in loader:', error);
    throw new Response("Error loading data", { status: 500 });
  }
};

