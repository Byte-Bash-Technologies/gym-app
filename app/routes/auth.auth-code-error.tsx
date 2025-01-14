import { Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { AlertCircle } from 'lucide-react';

export default function AuthCodeError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-destructive flex items-center gap-2">
            <AlertCircle className="h-6 w-6" />
            Authentication Error
          </CardTitle>
          <CardDescription>
            The authentication link is invalid or has expired. Please request a new password reset link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild className="w-full">
            <Link to="/forgot-password">
              Request New Reset Link
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">
              Back to Login
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

