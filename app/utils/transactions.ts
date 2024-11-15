import { supabase } from "~/utils/supabase.server"

export async function fetchTransactions() {
    const { data, error } = await supabase.from("transactions").select("*");
    if (error) throw error;
    return data;
  }

export async function calculateIncome() {
  const { data, error } = await supabase
    .from("transactions")
    .select("amount")
    .eq("type", "income");
  if (error) throw error;

  const totalIncome = data.reduce((sum, { amount }) => sum + amount, 0);
  const previousIncome = /* calculate based on previous period */;
  const weeklyIncome = /* calculate based on last 7 days */;

  return {
    income: totalIncome,
    previousIncome,
    weeklyIncome,
  };
}

export async function calculateStats() {
  const { data, error } = await supabase
    .from("transactions")
    .select("status");
  if (error) throw error;

  const stats = {
    received: data.filter((item) => item.status === "received").length,
    paid: data.filter((item) => item.status === "paid").length,
    pending: data.filter((item) => item.status === "pending").length,
  };

  return stats;
}
