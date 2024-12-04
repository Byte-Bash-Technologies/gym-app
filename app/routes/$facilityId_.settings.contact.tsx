import { Link, useParams } from "@remix-run/react";
import { ArrowLeft } from 'lucide-react';
import { Button } from "~/components/ui/button";

export default function ContactPage() {
  const params = useParams();

  const handleWhatsAppContact = () => {
    const phoneNumber = "917010976271";
    const message = encodeURIComponent(
      "Hello, I need assistance with my Sportsdot account."
    );
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
  };

  const handlePhoneContact = () => {
    window.location.href = "tel:+917010976271";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <header className="mb-6">
        <Link to={`/${params.facilityId}/settings`} className="flex items-center text-gray-600">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Settings
        </Link>
      </header>
      <h1 className="text-2xl font-bold mb-6">Contact Us</h1>
      <div className="space-y-4">
        <p>Choose how you would like to contact us:</p>
        <div className="space-y-3">
          <Button onClick={handleWhatsAppContact} className="w-full">
            Contact via WhatsApp
          </Button>
          <Button onClick={handlePhoneContact} variant="outline" className="w-full">
            Call Us
          </Button>
        </div>
      </div>
    </div>
  );
}