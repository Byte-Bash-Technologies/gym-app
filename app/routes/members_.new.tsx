"use client"

import { useState } from "react"
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

export default function NewMemberForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "+91",
    number: "",
    dob: "",
    gender: "male",
    bloodGroup: "",
    admissionNo: "#id73737",
    height: "",
    weight: "",
    photo: null,
    idCard: null,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Form submitted:", formData)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeft className="h-6 w-6" />
          <h1 className="text-xl font-bold">New member</h1>
        </div>
        <div className="flex items-center gap-4">
          <Bell className="h-6 w-6 text-purple-500" />
          <Phone className="h-6 w-6 text-purple-500" />
          <Settings className="h-6 w-6 text-purple-500" />
        </div>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            placeholder="Benston"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">
            Email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="example@gmail"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        {/* Mobile Number */}
        <div className="space-y-2">
          <Label>
            Mobile <span className="text-red-500">*</span>
          </Label>
          <div className="flex gap-2">
            <Input
              className="w-20"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
            />
            <Input
              placeholder="+91 XX XX X X X"
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
            />
          </div>
        </div>

        {/* DOB */}
        <div className="space-y-2">
          <Label htmlFor="dob">
            DOB <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              id="dob"
              placeholder="Day / Month /Year"
              required
              value={formData.dob}
              onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
            />
            <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Gender */}
        <div className="space-y-2">
          <Label>Gender</Label>
          <RadioGroup
            defaultValue={formData.gender}
            onValueChange={(value) => setFormData({ ...formData, gender: value })}
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
          <Select onValueChange={(value) => setFormData({ ...formData, bloodGroup: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Please select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a_positive">A+</SelectItem>
              <SelectItem value="a_negative">A-</SelectItem>
              <SelectItem value="b_positive">B+</SelectItem>
              <SelectItem value="b_negative">B-</SelectItem>
              <SelectItem value="o_positive">O+</SelectItem>
              <SelectItem value="o_negative">O-</SelectItem>
              <SelectItem value="ab_positive">AB+</SelectItem>
              <SelectItem value="ab_negative">AB-</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Admission Number */}
        <div className="space-y-2">
          <Label htmlFor="admissionNo">Admission no</Label>
          <Input
            id="admissionNo"
            value={formData.admissionNo}
            onChange={(e) => setFormData({ ...formData, admissionNo: e.target.value })}
          />
        </div>

        {/* Height */}
        <div className="space-y-2">
          <Label htmlFor="height">Height</Label>
          <Input
            id="height"
            placeholder="-- cm"
            value={formData.height}
            onChange={(e) => setFormData({ ...formData, height: e.target.value })}
          />
        </div>

        {/* Weight */}
        <div className="space-y-2">
          <Label htmlFor="weight">Weight</Label>
          <Input
            id="weight"
            placeholder="-- kg"
            value={formData.weight}
            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
          />
        </div>

        {/* Photo and ID Card Upload */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Photo</Label>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
              <Button variant="ghost" className="w-full h-24 flex flex-col items-center justify-center text-gray-500">
                <ImagePlus className="h-8 w-8 mb-2" />
                <span>upload photo</span>
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>ID Card</Label>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
              <Button variant="ghost" className="w-full h-24 flex flex-col items-center justify-center text-gray-500">
                <CreditCard className="h-8 w-8 mb-2" />
                <span>upload id card</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full bg-purple-500 hover:bg-purple-600 text-white py-6 rounded-full text-lg"
        >
          Add member
        </Button>
      </form>
    </div>
  )
}