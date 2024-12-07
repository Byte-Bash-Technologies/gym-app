import { json, type LoaderFunction, type ActionFunction } from "@remix-run/node";
import { useLoaderData, useActionData, useSubmit } from "@remix-run/react";
import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Textarea } from "~/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog"
import { toast } from "~/hooks/use-toast"
import { supabase } from "~/utils/supabase.server"

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
        ? await supabase.from('message_templates').insert({ title, content , facility_id: facilityId })
        : await supabase.from('message_templates').update({ title, content ,facility_id:facilityId}).eq('id', id);

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
  const actionData = useActionData();
  const submit = useSubmit();
  const transition = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

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

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      const formData = new FormData();
      formData.append('_action', 'delete');
      formData.append('id', id);
      submit(formData, { method: 'post' });
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
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold">Message Templates</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingTemplate(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Template
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
                <Button type="submit" disabled={transition.state === 'submitting'}>
                  {transition.state === 'submitting'
                    ? 'Saving...'
                    : editingTemplate
                    ? 'Update Template'
                    : 'Add Template'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {messageTemplates.length > 0 ? (
            <div className="space-y-4">
              {messageTemplates.map((template) => (
                <Card key={template.id}>
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
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">{template.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No message templates found. Add one to get started!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}