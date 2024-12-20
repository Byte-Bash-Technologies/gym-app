import { useState, useEffect } from 'react';
import { Dumbbell, Frown, ArrowLeft } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { useNavigate } from '@remix-run/react';

const funnyMessages = [
  "Oops! Looks like you're trying to lift above your permission weight! 🏋️‍♂️",
  "Sorry! This area is for gym owners only. Like a VIP lounge, but with more spreadsheets 📊",
  "Hold up! This is the owner's treadmill. Your access card doesn't work here! 🏃‍♂️",
  "Nice try! But this area needs a different kind of muscle - owner privileges! 💪",
  "This section is doing owner-only exercises right now! 🎯"
];

export default function NoTrainerAccess() {
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * funnyMessages.length);
    setMessage(funnyMessages[randomIndex]);
  }, []);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 text-center space-y-6">
        <div className="flex justify-center">
          <div className="relative">
            <Dumbbell className="h-20 w-20 text-purple-500 animate-bounce" />
            <Frown className="h-8 w-8 text-purple-700 absolute -bottom-2 -right-2" />
          </div>
        </div>
        
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Trainer Access Only
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400">
            {message}
          </p>
        </div>

        <div className="pt-4">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>
      </Card>
    </div>
  );
}