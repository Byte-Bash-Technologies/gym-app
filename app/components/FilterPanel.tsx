import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface Plan {
  id: string;
  name: string;
}

interface FilterPanelProps {
  timelineFilter: string;
  planFilter: string;
  plans: Plan[];
  onFilterChange: (key: string, value: string) => void;
}

export function FilterPanel({
  timelineFilter,
  planFilter,
  plans,
  onFilterChange,
}: FilterPanelProps) {
  return (
    <div className="m-4 p-4 bg-background dark:bg-[#4A4A62] space-y-4 rounded-xl">
      <div>
        <label
          htmlFor="timeline"
          className="block text-sm font-medium text-gray-800"
        >
          Timeline
        </label>
        <Select
          name="timeline"
          defaultValue={timelineFilter}
          onValueChange={(value) => onFilterChange("timeline", value)}
        >
          <SelectTrigger className="dark:bg-[#4A4A62]">
            <SelectValue placeholder="Select timeline" />
          </SelectTrigger>
          <SelectContent className="dark:bg-[#4A4A62]">
            <SelectItem className="dark:focus:bg-[#3A3A52]/90 dark:hover:bg-[#3A3A52]/90" value="today">Today</SelectItem>
            <SelectItem className="dark:focus:bg-[#3A3A52]/90 dark:hover:bg-[#3A3A52]/90" value="yesterday">Yesterday</SelectItem>
            <SelectItem className="dark:focus:bg-[#3A3A52]/90 dark:hover:bg-[#3A3A52]/90" value="thisMonth">This Month</SelectItem>
            <SelectItem className="dark:hover:bg-[#3A3A52]/90" value="lastMonth">Last Month</SelectItem>
            <SelectItem className="dark:hover:bg-[#3A3A52]/90" value="last7Days">Last 7 Days</SelectItem>
            <SelectItem className="dark:hover:bg-[#3A3A52]/90" value="last30Days">Last 30 Days</SelectItem>
            <SelectItem className="dark:hover:bg-[#3A3A52]/90" value="allTime">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label
          htmlFor="plan"
          className="block text-sm font-medium text-gray-800"
        >
          Plan
        </label>
        <Select
          name="plan"
          defaultValue={planFilter}
          onValueChange={(value) => onFilterChange("plan", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select plan" />
          </SelectTrigger>
          <SelectContent className="dark:bg-[#4A4A62]">
            <SelectItem className="dark:focus:bg-[#3A3A52]/90 dark:hover:bg-[#3A3A52]/90" value="all">All Plans</SelectItem>
            {plans.map((plan) => (
              <SelectItem className="dark:focus:bg-[#3A3A52]/90 dark:hover:bg-[#3A3A52]/90" key={plan.id} value={plan.id}>
                {plan.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

