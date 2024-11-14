"use client"

import { useState,useTransition } from "react"
import{json,useActionData,redirect} from "@remix-run/react";
import { type ActionFunction } from "@remix-run/node";
import { supabase } from "~/utils/supabase.server";
import { ArrowLeft, Bell, Phone, Settings, Calendar, ImagePlus, CreditCard } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const full_name = formData.get("full_name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const gender = formData.get("gender") as string;
  const date_of_birth = formData.get("date_of_birth") as string;
  const blood_type = formData.get("blood_type") as string;
  const height = formData.get("height") as string;
  const weight = formData.get("weight") as string;
  const admission_no = formData.get("admission_no") as string;
console.log("Form data:", formData);
  const { data, error } = await supabase
    .from('members')
    .insert([
      { full_name, email, phone, gender, date_of_birth, blood_type, height, weight, admission_no, status: 'active' }
    ])
    .select();

  if (error) {
    return json({ error: error.message }, { status: 400 });
  }

  return redirect("/members");
};

export default function NewMemberForm() {

  const actionData = useActionData();
  const transition = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      event.preventDefault();
      setFormError("Please fill out all required fields.");
    } else {
      setFormError(null);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white p-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <ArrowLeft className="h-6 w-6" onClick={() => window.history.back()} />
        <h1 className="text-xl font-bold">New member</h1>
      </div>
      <div className="flex items-center gap-4">
        <Bell className="h-6 w-6 text-purple-500" />
        <Phone className="h-6 w-6 text-purple-500" />
        <Settings className="h-6 w-6 text-purple-500" />
      </div>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} method="post" className="p-4 space-y-6">
      {formError && <p className="text-red-500">{formError}</p>}
      {actionData?.error && <p className="text-red-500">{actionData.error}</p>}

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="full_name">
        Name <span className="text-red-500">*</span>
        </Label>
        <Input
        id="full_name"
        name="full_name"
        placeholder="Benston"
        required
        />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">
        Email <span className="text-red-500">*</span>
        </Label>
        <Input
        id="email"
        name="email"
        type="email"
        placeholder="example@gmail.com"
        required
        />
      </div>

      {/* Mobile Number */}
      <div className="space-y-2">
        <Label htmlFor="phone">
        Mobile <span className="text-red-500">*</span>
        </Label>
        <Input
        id="phone"
        name="phone"
        placeholder="+91 XX XX X X X"
        required
        />
      </div>

      {/* DOB */}
      <div className="space-y-2">
        <Label htmlFor="date_of_birth">
        DOB <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
        <Input
          type="date"
          id="date_of_birth"
          name="date_of_birth"
          placeholder="Day / Month / Year"
          required
        />
        {/* <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" /> */}
        </div>
      </div>

      {/* Gender */}
      <div className="space-y-2">
        <Label>Gender</Label>
        <RadioGroup
        defaultValue="male"
        name="gender"
        className="flex gap-4"
        >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="male" id="male" />
          <Label htmlFor="male" className="bg-purple-50 px-4 py-2 rounded-full">Male</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="female" id="female" />
          <Label htmlFor="female" className="bg-purple-50 px-4 py-2 rounded-full">Female</Label>
        </div>
        </RadioGroup>
      </div>

              {/* Blood Group */}
              <div className="space-y-2">
          <Label>Blood group</Label>
          <Select name="blood_type">
            <SelectTrigger>
              <SelectValue placeholder="Please select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A+">A+</SelectItem>
              <SelectItem value="A-">A-</SelectItem>
              <SelectItem value="B+">B+</SelectItem>
              <SelectItem value="B-">B-</SelectItem>
              <SelectItem value="O+">O+</SelectItem>
              <SelectItem value="O-">O-</SelectItem>
              <SelectItem value="AB+">AB+</SelectItem>
              <SelectItem value="AB-">AB-</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Height */}
        <div className="space-y-2">
          <Label htmlFor="height">Height</Label>
          <Input
            id="height"
            name="height"
            placeholder="-- cm"
          />
        </div>

        {/* Weight */}
        <div className="space-y-2">
          <Label htmlFor="weight">Weight</Label>
          <Input
            id="weight"
            name="weight"
            placeholder="-- kg"
          />
        </div>

      {/* Admission Number */}
      <div className="space-y-2">
        <Label htmlFor="admission_no">Admission no</Label>
        <Input
        id="admission_no"
        name="admission_no"
        placeholder="#id73737"
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full bg-purple-500 hover:bg-purple-600 text-white py-6 rounded-full text-lg"
        disabled={transition.state === "submitting"}
      >
        {transition.state === "submitting" ? "Adding..." : "Add member"}
      </Button>
      </form>
    </div>
  )
}