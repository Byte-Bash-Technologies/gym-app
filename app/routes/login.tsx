import{ Link }from "@remix-run/react";
import { Checkbox } from "~/components/ui/checkbox"
import { Input } from "~/components/ui/input"
import { Button } from"~/components/ui/button"
import { Label } from "~/components/ui/label"

export default function Component() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-purple-100 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-2">
          <div className="relative w-16 h-16">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M30 70C45 70 55 60 55 40C55 20 45 10 30 10"
                stroke="#D1A7D9"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <path
                d="M70 30C55 30 45 40 45 60C45 80 55 90 70 90"
                stroke="#FF9B9B"
                strokeWidth="12"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className="text-xl font-medium text-purple-600">SPORTS DOT</h1>
        </div>

        {/* Login Form */}
        <div className="space-y-6">
          <h2 className="text-2xl font-medium text-center text-purple-600">Login</h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email / number</Label>
              <Input
                id="email"
                placeholder="Email / number"
                className="h-12 bg-white"
                type="text"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                placeholder="Password"
                className="h-12 bg-white"
                type="password"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox id="remember" className="border-purple-300" />
              <label
                htmlFor="remember"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Remember Me
              </label>
            </div>
            <Link
              to="/forgot-password"
              className="text-sm text-purple-600 hover:text-purple-500"
            >
              Forget Password?
            </Link>
          </div>

          <Button className="w-full h-12 text-lg font-medium bg-purple-400 hover:bg-purple-500">
            Login
          </Button>

          <div className="text-center space-x-1">
            <span className="text-sm text-gray-600">Don&#39;t have an account?</span>
            <Link
              to="/contact"
              className="text-sm font-medium text-purple-600 hover:text-purple-500"
            >
              CONTACT US
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}