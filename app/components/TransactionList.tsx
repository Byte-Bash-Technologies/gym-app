import { Link } from "@remix-run/react";
import { Card, CardContent } from "~/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";

interface Transaction {
  id: number;
  user: string;
  member_id: string;
  amount: number;
  timestamp: string;
  avatar: string;
  plan: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  facilityId: string;
}

export function TransactionList({ transactions, facilityId }: TransactionListProps) {
  return (
    <Card>
      <CardContent className="p-4">
        {transactions.map((transaction) => (
          <Link
            key={transaction.id}
            to={`/${facilityId}/members/${transaction.member_id}`}
            className="p-4 flex items-center justify-between hover:bg-violet-50 dark:hover:bg-[#212237] rounded-xl transition-colors duration-150 ease-in-out mb-2 last:mb-2"
          >
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage
                  src={transaction.avatar}
                  alt={transaction.user}
                />
                <AvatarFallback>{transaction.user[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{transaction.user}</p>
                <p className="text-sm text-gray-500">
                  {transaction.timestamp}
                </p>
                <p className="text-xs text-gray-400">{transaction.plan}</p>
              </div>
            </div>
            <span className="text-green-500 font-medium">
              +{transaction.amount.toFixed(2)}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

