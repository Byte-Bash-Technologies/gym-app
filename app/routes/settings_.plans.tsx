"use client"

import { useState } from "react"
import { ArrowLeft, Bell, Phone, Settings, Search, CheckCircle, Pencil, Plus } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Card } from "~/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import { Label } from "~/components/ui/label"

interface Plan {
  id: number;
  name: string;
  duration: string;
  price: number;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([
    { id: 1, name: "Diamond plan", duration: "12 months", price: 9999 },
    { id: 2, name: "Platinum plan", duration: "9 months", price: 7999 },
    { id: 3, name: "Gold plan", duration: "6 months", price: 5999 },
    { id: 4, name: "Silver plan", duration: "3 months", price: 2999 },
    { id: 5, name: "Bronze plan", duration: "1 month", price: 999 },
  ])

  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)

  const handleAddOrUpdatePlan = (plan: Plan) => {
    if (editingPlan) {
      setPlans(plans.map(p => p.id === plan.id ? plan : p))
    } else {
      setPlans([...plans, { ...plan, id: Math.max(...plans.map(p => p.id)) + 1 }])
    }
    setEditingPlan(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hover:bg-gray-100" onClick={() => window.history.back()}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">Plans</h1>
        </div>
        <div className="flex items-center gap-4">
          <Bell className="h-6 w-6 text-purple-500" />
          <Phone className="h-6 w-6 text-purple-500" />
          <Settings className="h-6 w-6 text-purple-500" />
        </div>
      </header>

      {/* Search Section */}
      <div className="p-4">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search by plans"
            className="pl-10 pr-10 py-2 w-full bg-white rounded-full"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-purple-500" />
            <Pencil className="h-5 w-5 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Plans Section */}
      <main className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Default plans</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-purple-500 hover:bg-purple-600 text-white" onClick={() => setEditingPlan(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Plan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingPlan ? 'Edit Plan' : 'Add New Plan'}</DialogTitle>
              </DialogHeader>
              <PlanForm plan={editingPlan} onSubmit={handleAddOrUpdatePlan} />
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className="bg-purple-50 p-4 flex justify-between items-center cursor-pointer hover:bg-purple-100 transition-colors"
            >
              <div>
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="text-gray-500">{plan.duration}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-xl font-semibold">
                  $ {plan.price}
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-purple-500 hover:bg-purple-200" onClick={() => setEditingPlan(plan)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Plan</DialogTitle>
                    </DialogHeader>
                    <PlanForm plan={plan} onSubmit={handleAddOrUpdatePlan} />
                  </DialogContent>
                </Dialog>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}

interface PlanFormProps {
  plan?: Plan | null;
  onSubmit: (plan: Plan) => void;
}

function PlanForm({ plan, onSubmit }: PlanFormProps) {
  const [formData, setFormData] = useState<Plan>({
    id: plan?.id || 0,
    name: plan?.name || '',
    duration: plan?.duration || '',
    price: plan?.price || 0
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Plan Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="duration">Duration</Label>
        <Input
          id="duration"
          value={formData.duration}
          onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="price">Price</Label>
        <Input
          id="price"
          type="number"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
          required
        />
      </div>
      <Button type="submit" className="w-full bg-purple-500 hover:bg-purple-600 text-white">
        {plan ? 'Update Plan' : 'Add Plan'}
      </Button>
    </form>
  )
}