import { Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Building2, Home, RefreshCcw, MapPin } from 'lucide-react';

export default function NoFacilitiesFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-primary">
            404 - Facilities on Vacation!
          </h1>
          <p className="text-xl text-muted-foreground">
            Oops! It looks like all our facilities decided to hit the beach instead of the gym!
          </p>
        </div>
        
        <div className="relative">
          <Building2 className="w-32 h-32 mx-auto text-primary animate-pulse" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <MapPin className="w-8 h-8 text-destructive animate-bounce" />
          </div>
        </div>
        
        <p className="text-muted-foreground">
          Don&apos;t sweat it! Our facilities are just on a quick break to recharge. They&apos;ll be back stronger than ever!
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
            Check Again
          </Button>
        </div>
      </div>
    </div>
  );
}

