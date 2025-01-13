import { WifiOff, RefreshCcw } from 'lucide-react';
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";

interface NetworkErrorProps {
  onRetry?: () => void;
}

export default function NetworkError({ onRetry }: NetworkErrorProps = {}) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-destructive/20" />
              <div className="relative bg-background rounded-full p-4">
                <WifiOff className="h-8 w-8 text-destructive" />
              </div>
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl">No Internet Connection</CardTitle>
        </CardHeader>
        <CardContent className="text-center pb-2">
          <p className="text-muted-foreground">
            Please check your internet connection and try again
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button 
            onClick={handleRetry}
            className="w-full gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Try Again
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Error: net::ERR_INTERNET_DISCONNECTED
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}