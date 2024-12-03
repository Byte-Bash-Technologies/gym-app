import { json, LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Printer } from 'lucide-react';
import { supabase } from "~/utils/supabase.server";
import { format } from "date-fns";

interface Facility {
  id: string;
  name: string;
  type: 'gym' | 'badminton';
  address: string | null;
  phone: string | null;
  email: string | null;
}

interface Member {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  admission_no: string | null;
  status: 'active' | 'inactive' | 'expired';
  balance: number | null;
}

interface Membership {
  id: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled';
  price: number;
  discount: number | null;
  payment_amount: number | null;
  balance: number | null;
  plan: {
    id: string;
    name: string;
  };
}

interface Transaction {
  id: string;
  amount: number;
  type: 'payment' | 'refund';
  payment_method: 'cash' | 'credit_card' | 'online';
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  member: Member;
  membership: Membership;
  facility: Facility;
}

export const loader: LoaderFunction = async ({ params }) => {
  const { id } = params;

  const { data: transaction, error } = await supabase
    .from('transactions')
    .select(`
      *,
      member:members(
        id, full_name, email, phone, address, 
        admission_no, status, balance
      ),
      membership:memberships(
        id, start_date, end_date, status, 
        price, discount, payment_amount, balance,
        plan:plans(id, name)
      ),
      facility:facilities(
        id, name, type, address, phone, email
      )
    `)
    .eq('id', id)
    .single();

  if (error || !transaction) {
    throw new Response("Transaction not found", { status: 404 });
  }

  // Get all payments for this membership
  const { data: allPayments } = await supabase
    .from('transactions')
    .select('amount, type')
    .eq('membership_id', transaction.membership_id)
    .eq('status', 'completed');

  // Calculate totals
  const totalAmount = transaction.membership.price;
  const discount = transaction.membership.discount || 0;
  const netAmount = totalAmount - discount;
  const totalPaid = allPayments?.reduce((sum, payment) => {
    return payment.type === 'payment' ? sum + payment.amount : sum - payment.amount;
  }, 0) || 0;
  const balance = Math.max(0, netAmount - totalPaid);

  return json({
    transaction,
    calculations: {
      totalAmount,
      discount,
      netAmount,
      totalPaid,
      balance
    }
  });
};

export default function InvoicePage() {
  const { transaction, calculations } = useLoaderData<{
    transaction: Transaction;
    calculations: {
      totalAmount: number;
      discount: number;
      netAmount: number;
      totalPaid: number;
      balance: number;
    };
  }>();

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 print:p-0">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Invoice</h1>
        <Button onClick={() => window.print()} variant="outline" className="print:hidden">
          <Printer className="mr-2 h-4 w-4" />
          Print Invoice
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <div>
              <CardTitle>Transaction #{transaction.id.slice(0, 8)}</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Status: <span className="capitalize">{transaction.status}</span>
              </p>
              {transaction.member.admission_no && (
                <p className="text-sm text-muted-foreground">
                  Admission No: {transaction.member.admission_no}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm">
                Date: {format(new Date(transaction.created_at), 'MMMM d, yyyy')}
              </p>
              <p className="text-sm">
                Payment Method: <span className="capitalize">{transaction.payment_method.replace('_', ' ')}</span>
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer and Facility Information */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Bill To:</h3>
              <div className="text-sm">
                <p className="font-medium">{transaction.member.full_name}</p>
                {transaction.member.email && <p>{transaction.member.email}</p>}
                {transaction.member.phone && <p>{transaction.member.phone}</p>}
                {transaction.member.address && (
                  <pre className="font-sans whitespace-pre-line">{transaction.member.address}</pre>
                )}
                <p className="mt-1">Member Status: <span className="capitalize">{transaction.member.status}</span></p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">From:</h3>
              <div className="text-sm">
                <p className="font-medium">{transaction.facility.name}</p>
                <p className="capitalize">Type: {transaction.facility.type}</p>
                {transaction.facility.email && <p>{transaction.facility.email}</p>}
                {transaction.facility.phone && <p>{transaction.facility.phone}</p>}
                {transaction.facility.address && (
                  <pre className="font-sans whitespace-pre-line">{transaction.facility.address}</pre>
                )}
              </div>
            </div>
          </div>

          {/* Membership Details */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <div>
                    <p>{transaction.membership.plan.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Status: <span className="capitalize">{transaction.membership.status}</span>
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  {format(new Date(transaction.membership.start_date), 'MMM d, yyyy')} - {' '}
                  {format(new Date(transaction.membership.end_date), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="text-right">₹{(calculations.totalAmount || 0).toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="text-right">Total Amount</TableCell>
                <TableCell className="text-right">₹{(calculations.totalAmount || 0).toFixed(2)}</TableCell>
              </TableRow>
              {calculations.discount > 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-right">Discount</TableCell>
                  <TableCell className="text-right">-₹{(calculations.discount || 0).toFixed(2)}</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell colSpan={2} className="text-right">Net Amount</TableCell>
                <TableCell className="text-right">₹{calculations.netAmount.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={2} className="text-right">Total Paid</TableCell>
                <TableCell className="text-right">₹{calculations.totalPaid.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={2} className="text-right font-medium">Balance</TableCell>
                <TableCell className="text-right font-medium">₹{calculations.balance.toFixed(2)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>

          {/* Current Transaction */}
          <div className="text-sm text-muted-foreground">
            <h3 className="font-semibold mb-2">Current Transaction</h3>
            <p>Type: <span className="capitalize">{transaction.type}</span></p>
            <p>Amount: ₹{transaction.amount.toFixed(2)}</p>
            {calculations.balance > 0 && (
              <p className="mt-2 text-destructive">
                Please note: There is a remaining balance of ₹{calculations.balance.toFixed(2)} on this membership.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}