import { Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Dumbbell, Home, RefreshCcw } from 'lucide-react';

export default function NoUsersFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-primary">
            404 - Users Got Too Fit!
          </h1>
          <p className="text-xl text-muted-foreground">
            Oops! It seems our users have become so fit, they've vanished into thin air!
          </p>
        </div>
        
        <div className="relative">
          <Dumbbell className="w-32 h-32 mx-auto text-primary animate-bounce" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <p className="text-2xl font-bold">?</p>
          </div>
        </div>
        
        <p className="text-muted-foreground">
          Don't worry, they're probably just out crushing their fitness goals. Let's get you back on track!
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button asChild>
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              Return Home
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
