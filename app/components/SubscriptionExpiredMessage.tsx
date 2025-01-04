import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from "@remix-run/react";

interface SubscriptionExpiredMessageProps {
  facilityName: string;
  facilityType: string;
  facilityId: string;
}

export function SubscriptionExpiredMessage({
  facilityName,
  facilityType,
  facilityId,
}: SubscriptionExpiredMessageProps) {
  const navigate = useNavigate();
  
  const handleRenewSubscription = () => {
    const phoneNumber = "917010976271";
    const message = encodeURIComponent(
      `Hello Benston,\n\nI would like to renew my subscription for the ${facilityType} facility, specifically for ${facilityName}.\n\nFacility subscription link: https://app.sportsdot.in/${facilityId}/renew-subscription`
    );
    window.open(`https://wa.me/${phoneNumber}?text=${message}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 ">
      <Card className="max-w-md w-full dark:bg-[#212237]">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Subscription Expired</CardTitle>
          <CardDescription className="text-center">
            Your subscription for {facilityName} has expired
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-2">
          <p className="text-muted-foreground">
            Please renew your subscription to continue using all features of the application.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            onClick={handleRenewSubscription}
            className="w-full bg-[#8e76af] hover:bg-[#8e76af]/90"
          >
            Renew Subscription
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate("/")}
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

