import { useState, useEffect } from "react";
import { useSearchParams, Link, useParams } from "@remix-run/react";
import { Phone, Settings } from 'lucide-react';
import { TransactionChart } from "~/components/TransactionChart";
import { IncomeStats } from "~/components/IncomeStats";
import { TransactionList } from "~/components/TransactionList";
import { FilterPanel } from "~/components/FilterPanel";
import { SearchBar } from "~/components/SearchBar";

interface Transaction {
  id: number;
  user: string;
  member_id: string;
  amount: number;
  timestamp: string;
  avatar: string;
  plan: string;
}

interface DailyEarning {
  date: string;
  amount: number;
}

interface Plan {
  id: string;
  name: string;
}

interface TransactionPageProps {
  transactions: Transaction[];
  income: number;
  previousIncome: number;
  totalPendingBalance: number;
  dailyEarnings: DailyEarning[];
  plans: Plan[];
  timelineFilter: string;
  planFilter: string;
  searchTerm: string;
}

export default function TransactionPage({
  transactions,
  income,
  previousIncome,
  totalPendingBalance,
  dailyEarnings,
  plans,
  timelineFilter,
  planFilter,
  searchTerm: initialSearchTerm,
}: TransactionPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const params = useParams();

  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  const handleFilterChange = (key: string, value: string) => {
    searchParams.set(key, value);
    setSearchParams(searchParams);
  };

  return (
    <div className="min-h-screen bg-[#f0ebff] pb-16 dark:bg-[#212237]">
      <header className="bg-background dark:bg-[#4A4A62] p-4 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-xl font-bold ml-6">Transaction</h1>
        </div>
        <div className="flex items-center space-x-4">
          <a href="tel:7010976271">
            <Phone className="h-6 w-6 text-[#886fa6]" />
          </a>
          <Link to={`/${params.facilityId}/settings`}>
            <Settings className="h-6 w-6 text-[#886fa6]" />
          </Link>
        </div>
      </header>

      <SearchBar
        searchTerm={searchTerm}
        onSearchTermChange={(value) => {
          setSearchTerm(value);
          searchParams.set("search", value);
          setSearchParams(searchParams);
        }}
        onFilterToggle={() => setIsFilterOpen(!isFilterOpen)}
      />

      {isFilterOpen && (
        <FilterPanel
          timelineFilter={timelineFilter}
          planFilter={planFilter}
          plans={plans}
          onFilterChange={handleFilterChange}
        />
      )}

      <div className="p-4 space-y-4 dark:bg-[#212237]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TransactionChart
            income={income}
            totalPendingBalance={totalPendingBalance}
            timelineFilter={timelineFilter}
          />
          <IncomeStats
            income={income}
            previousIncome={previousIncome}
            totalPendingBalance={totalPendingBalance}
            dailyEarnings={dailyEarnings}
            timelineFilter={timelineFilter}
          />
        </div>

        <TransactionList
          transactions={transactions}
          facilityId={params.facilityId!}
        />
      </div>
    </div>
  );
}

