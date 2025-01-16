import { useState, useEffect, useCallback, useMemo } from "react";
import { json, LoaderFunction, ActionFunction } from "@remix-run/node";
import { useLoaderData, useSubmit, useSearchParams, useNavigate, Link } from "@remix-run/react";
import { supabase } from "~/utils/supabase.server";
import debounce from "lodash.debounce";
import { Pencil, Trash2, Search, UserPlus, Filter, ChevronDown, X, SortAsc, SortDesc } from 'lucide-react';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Card } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  avatar_url?: string;
  mobile_number: string;
  facilities: string[];
}

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const sortBy = url.searchParams.get("sortBy") || "full_name";
  const sortOrder = url.searchParams.get("sortOrder") || "asc";

  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, full_name, created_at, avatar_url ')
    .order(sortBy, { ascending: sortOrder === 'asc' });

  if (error) {
    console.error('Error fetching users:', error);
    throw new Response("Error fetching users", { status: 500 });
  }

  return json({ users, currentSort: { by: sortBy, order: sortOrder } });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const action = formData.get('action');
  const userId = formData.get('userId');

  if (action === 'delete' && userId) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      return json({ error: error.message }, { status: 400 });
    }
    return json({ success: true });
  }

  return json({ error: 'Invalid action' }, { status: 400 });
};

export default function UsersList() {
  const { users, currentSort } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<{
    by: string;
    order: "asc" | "desc";
  }>(currentSort);
  // const [isFilterOpen, setIsFilterOpen] = useState(false);
  const navigate = useNavigate();
  const submit = useSubmit();

  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setSearchTerm(term);
    }, 300),
    []
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  const handleSortChange = (by: string) => {
    setSortOption((prev) => ({
      by,
      order: prev.by === by && prev.order === "asc" ? "desc" : "asc",
    }));
  };

  const handleDeleteUser = (user: User) => {
    if (window.confirm(`Are you sure you want to delete ${user.full_name}? This action cannot be undone.`)) {
      const formData = new FormData();
      formData.append('action', 'delete');
      formData.append('userId', user.id);
      submit(formData, { method: 'post' });
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    if (searchTerm) newParams.set("search", searchTerm);
    newParams.set("sortBy", sortOption.by);
    newParams.set("sortOrder", sortOption.order);
    setSearchParams(newParams, { replace: true });
  }, [searchTerm, sortOption, setSearchParams]);

  return (
    <div className="min-h-screen dark:bg-[#3A3A52] relative">

      <main className="p-2 space-y-4 sm:w-full">
        <div className="pt-4">
          <div className="relative flex items-center">
            <Input
              type="text"
              placeholder="Search by name or email"
              className="pl-10 pr-20 py-2 w-full bg-white rounded-full dark:bg-[#4A4A62]"
              onChange={handleSearch}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <div className="absolute right-3 flex space-x-2">
              {/* <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                <Filter className="h-5 w-5" />
              </Button> */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 hover:dark:bg-[#3A3A52]"
                  >
                    <ChevronDown className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dark:bg-[#4A4A62]">
                  <DropdownMenuItem className="hover:dark:bg-[#3A3A52]" onSelect={() => handleSortChange("full_name")}>
                    Sort by Name{" "}
                    {sortOption.by === "full_name" &&
                      (sortOption.order === "asc" ? (
                        <SortAsc className="ml-2 h-4 w-4" />
                      ) : (
                        <SortDesc className="ml-2 h-4 w-4" />
                      ))}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="hover:dark:bg-[#3A3A52]" onSelect={() => handleSortChange("created_at")}>
                    Sort by Join Date{" "}
                    {sortOption.by === "created_at" &&
                      (sortOption.order === "asc" ? (
                        <SortAsc className="ml-2 h-4 w-4" />
                      ) : (
                        <SortDesc className="ml-2 h-4 w-4" />
                      ))}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-4">All Users</h2>

        <Card className="p-4">
          <div className="rounded-3xl p-4 space-y-4 overflow-x-auto">
            {!filteredUsers?.length ? (
              <div className="text-center py-4">No users found</div>
            ) : (
              filteredUsers.map((user: User) => (
          <div
            key={user.id}
            className="flex items-center gap-3 border-b border-gray-200 last:border-0 pb-4 last:pb-0"
          >
            <Avatar className="h-12 w-12">
              <AvatarImage
                src={user.avatar_url || `https://api.dicebear.com/6.x/initials/svg?seed=${user.full_name}`}
                alt={user.full_name}
              />
              <AvatarFallback>{user.full_name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{user.full_name}</h3>
              <p className="text-sm text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
            <div className="text-right hidden md:block">
              <p className="text-xs text-muted-foreground">
                Joined: {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex space-x-2">
              <Button variant="ghost" size="icon" className="hover:dark:bg-[#3A3A52]" asChild>
                <Link to={`/admin/users/${user.id}/edit`}>
            <Pencil className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" className="hover:dark:bg-[#3A3A52]" onClick={() => handleDeleteUser(user)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
              ))
            )}
          </div>
        </Card>
      </main>

      <Link to="/signup" className="fixed right-6 bottom-[7rem]">
        <Button className="w-14 h-14 rounded-full bg-[#886fa6] hover:bg-[#886fa6]/90 dark:bg-[#3A3A52] hover:dark:bg-[#3A3A52]/90 text-white shadow-lg">
          <UserPlus className="h-6 w-6" />
        </Button>
      </Link>
    </div>
  );
}