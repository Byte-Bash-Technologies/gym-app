import { json, type LoaderFunction, type ActionFunction } from "@remix-run/node";
import { useLoaderData, useActionData, useSubmit, Link, useParams } from "@remix-run/react";
import { useState } from "react";
import { Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "~/components/ui/alert-dialog";
import { toast } from "~/hooks/use-toast";
import { supabase } from "~/utils/supabase.server";

interface MessageTemplate {
  id: string;
  title: string;
  content: string;
}

interface LoaderData {
  messageTemplates: MessageTemplate[];
}

export const loader: LoaderFunction = async ({ params }) => {
  const { facilityId } = params;
  const { data: messageTemplates, error } = await supabase
    .from('message_templates')
    .select('*')
    .or(`facility_id.is.null,facility_id.eq.${facilityId}`)
    .order('title');

  if (error) {
    console.error("Error fetching message templates:", error);
    return json({ messageTemplates: [] });
  }

  return json({ messageTemplates });
};

export const action: ActionFunction = async ({ request, params }) => {
  const { facilityId } = params;
  const formData = await request.formData();
  const action = formData.get('_action');

  switch (action) {
    case 'create':
    case 'update': {
      const title = formData.get('title') as string;
      const content = formData.get('content') as string;
      const id = formData.get('id') as string | null;

      if (!title || !content) {
        return json({ error: "Title and content are required" }, { status: 400 });
      }

      const { error } = action === 'create'
        ? await supabase.from('message_templates').insert({ title, content, facility_id: facilityId })
        : await supabase.from('message_templates').update({ title, content, facility_id: facilityId }).eq('id', id);

      if (error) {
        return json({ error: `Failed to ${action} message template` }, { status: 500 });
      }

      return json({ success: true, message: `Message template ${action === 'create' ? 'created' : 'updated'} successfully` });
    }
    case 'delete': {
      const id = formData.get('id') as string;

      const { error } = await supabase.from('message_templates').delete().eq('id', id);

      if (error) {
        return json({ error: "Failed to delete message template" }, { status: 500 });
      }

      return json({ success: true, message: "Message template deleted successfully" });
    }
    default:
      return json({ error: "Invalid action" }, { status: 400 });
  }
};

export default function MessageTemplates() {
  const { messageTemplates } = useLoaderData<LoaderData>();
  const params = useParams();
  const actionData = useActionData();
  const submit = useSubmit();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<MessageTemplate | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.append('_action', editingTemplate ? 'update' : 'create');
    if (editingTemplate) {
      formData.append('id', editingTemplate.id);
    }
    submit(formData, { method: 'post' });
    setIsDialogOpen(false);
    setEditingTemplate(null);
  };

  const handleDelete = () => {
    if (deleteTemplate) {
      const formData = new FormData();
      formData.append('_action', 'delete');
      formData.append('id', deleteTemplate.id);
      submit(formData, { method: 'post' });
      setDeleteTemplate(null);
    }
  };

  if (actionData?.success) {
    toast({
      title: "Success",
      description: actionData.message,
    });
  } else if (actionData?.error) {
    toast({
      title: "Error",
      description: actionData.error,
      variant: "destructive",
    });
  }

  return (
    <div className="min-h-screen bg-background pb-8 dark:bg-[#212237]">
      <Card className="rounded-none border-x-0 dark:bg-[#212237]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4">
          <Link to={`/${params.facilityId}/settings`} className="flex items-center space-x-2">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <CardTitle className="text-xl font-bold">Message Templates</CardTitle>
          <div className="w-6" /> {/* Spacer for alignment */}
        </CardHeader>
        <CardContent className="p-4">
          {messageTemplates.length > 0 ? (
            <div className="space-y-4">
              {messageTemplates.map((template) => (
                <Card key={template.id} className="bg-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-semibold">{template.title}</CardTitle>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingTemplate(template);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTemplate(template)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{template.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No message templates found. Add one to get started!</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            onClick={() => setEditingTemplate(null)}
            className="fixed right-8 bottom-[5rem] h-14 w-14 rounded-full bg-[#8e76af] hover:bg-[#8e76af]/90 shadow-lg"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit' : 'Add'} Message Template</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                defaultValue={editingTemplate?.title}
                required
              />
            </div>
            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                name="content"
                rows={5}
                defaultValue={editingTemplate?.content}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              {editingTemplate ? 'Update Template' : 'Add Template'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTemplate} onOpenChange={(open) => !open && setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the message template "{deleteTemplate?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

