import { useState } from "react";
import {
  ArrowLeft,
  Bell,
  Phone,
  Settings,
  MessageSquarePlus,
  AlarmClock,
  Cake,
  UserPlus,
  RefreshCcw,
  BellRing,
  UserCog,
  Search,
  Pencil,
  Plus,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

interface Template {
  id: number;
  icon: React.ReactNode;
  title: string;
  content: string;
}

export default function MessageTemplatePage() {
  const [templates, setTemplates] = useState<Template[]>([
    {
      id: 1,
      icon: <MessageSquarePlus className="h-6 w-6" />,
      title: "Custom message",
      content: "",
    },
    {
      id: 2,
      icon: <AlarmClock className="h-6 w-6" />,
      title: "Membership expiring reminder",
      content: "",
    },
    {
      id: 3,
      icon: <Cake className="h-6 w-6" />,
      title: "Membership Birthday message",
      content: "",
    },
    {
      id: 4,
      icon: <UserPlus className="h-6 w-6" />,
      title: "Member onboarding",
      content: "",
    },
    {
      id: 5,
      icon: <RefreshCcw className="h-6 w-6" />,
      title: "Member settlement success",
      content: "",
    },
    {
      id: 6,
      icon: <BellRing className="h-6 w-6" />,
      title: "Member balance reminder",
      content: "",
    },
    {
      id: 7,
      icon: <UserCog className="h-6 w-6" />,
      title: "Membership renewal",
      content: "",
    },
  ]);

  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const handleAddOrUpdateTemplate = (template: Template) => {
    if (editingTemplate) {
      setTemplates(templates.map((t) => (t.id === template.id ? template : t)));
    } else {
      setTemplates([
        ...templates,
        { ...template, id: Math.max(...templates.map((t) => t.id)) + 1 },
      ]);
    }
    setEditingTemplate(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-gray-100"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-6 w-6" />
            <span className="sr-only">Go back</span>
          </Button>
          <h1 className="text-xl font-bold">Message Template</h1>
        </div>
        <div className="flex items-center gap-4">
          <Bell className="h-6 w-6 text-purple-500" />
          <Phone className="h-6 w-6 text-purple-500" />
          <Settings className="h-6 w-6 text-purple-500" />
        </div>
      </header>

      {/* Search and Add Template */}
      <div className="p-4 flex items-center justify-between">
        <div className="relative flex-grow mr-4">
          <Input
            type="text"
            placeholder="Search templates"
            className="pl-10 pr-4 py-2 w-full bg-white rounded-full"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              className="bg-purple-500 hover:bg-purple-600 text-white"
              onClick={() => setEditingTemplate(null)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Template" : "Add New Template"}
              </DialogTitle>
            </DialogHeader>
            <TemplateForm
              template={editingTemplate}
              onSubmit={handleAddOrUpdateTemplate}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Template List */}
      <main className="p-4 space-y-3">
        {templates.map((template) => (
          <Button
            key={template.id}
            variant="ghost"
            className="w-full bg-purple-50 hover:bg-purple-100 h-auto py-6 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <span className="text-gray-700">{template.icon}</span>
              <span className="text-lg font-medium text-gray-900">
                {template.title}
              </span>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-purple-500 hover:bg-purple-200"
                  onClick={() => setEditingTemplate(template)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Template</DialogTitle>
                </DialogHeader>
                <TemplateForm
                  template={template}
                  onSubmit={handleAddOrUpdateTemplate}
                />
              </DialogContent>
            </Dialog>
          </Button>
        ))}
      </main>
    </div>
  );
}

interface TemplateFormProps {
  template?: Template | null;
  onSubmit: (template: Template) => void;
}

function TemplateForm({ template, onSubmit }: TemplateFormProps) {
  const [formData, setFormData] = useState<Omit<Template, "icon">>({
    id: template?.id || 0,
    title: template?.title || "",
    content: template?.content || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      icon: template?.icon || <MessageSquarePlus className="h-6 w-6" />,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Template Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="content">Template Content</Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) =>
            setFormData({ ...formData, content: e.target.value })
          }
          required
          rows={5}
        />
      </div>
      <Button
        type="submit"
        className="w-full bg-purple-500 hover:bg-purple-600 text-white"
      >
        {template ? "Update Template" : "Add Template"}
      </Button>
    </form>
  );
}
