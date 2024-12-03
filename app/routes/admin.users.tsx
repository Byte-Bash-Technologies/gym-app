import { json, LoaderFunction, ActionFunction } from "@remix-run/node";
import { useLoaderData, useSubmit, Link } from "@remix-run/react";
import { useState } from "react";
import { supabase } from "~/utils/supabase.server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Pencil, Trash2, Search } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export const loader: LoaderFunction = async () => {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, full_name, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    throw new Response("Error fetching users", { status: 500 });
  }

  return json({ users });
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
  const { users } = useLoaderData<{ users: User[] }>();
  const [searchTerm, setSearchTerm] = useState('');
  const submit = useSubmit();

  const filteredUsers = users.filter(user => 
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteUser = (user: User) => {
    if (window.confirm(`Are you sure you want to delete ${user.full_name}? This action cannot be undone.`)) {
      const formData = new FormData();
      formData.append('action', 'delete');
      formData.append('userId', user.id);
      submit(formData, { method: 'post' });
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>
      
      <div className="flex items-center space-x-2">
        <Search className="w-5 h-5 text-gray-500" />
        <Input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.full_name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Link to={`/admin/users/${user.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </Link>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user)}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}