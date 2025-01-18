import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Search, Filter } from 'lucide-react';

interface SearchBarProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onFilterToggle: () => void;
}

export function SearchBar({
  searchTerm,
  onSearchTermChange,
  onFilterToggle,
}: SearchBarProps) {
  return (
    <div className="p-4">
      <div className="relative flex items-center">
        <Input
          type="text"
          placeholder="Search by name or email"
          className="pl-10 pr-20 py-2 w-full bg-background rounded-full dark:bg-[#4A4A62]"
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <div className="absolute right-3 flex space-x-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-[#886fa6] dark:hover:bg-[#3A3A52]/90"
            onClick={onFilterToggle}
          >
            <Filter className="text-[#886fa6]" />
          </Button>
        </div>
      </div>
    </div>
  );
}

