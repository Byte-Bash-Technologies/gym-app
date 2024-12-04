import { Link, useParams } from "@remix-run/react";
import { ArrowLeft } from 'lucide-react';

export default function SupportPage() {
  const params = useParams();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <header className="mb-6">
        <Link to={`/${params.facilityId}/settings`} className="flex items-center text-gray-600">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Settings
        </Link>
      </header>
      <h1 className="text-2xl font-bold mb-6">Support and Information</h1>
      <div className="space-y-4">
        <p>
          Welcome to Sportsdot support! We&apos;re here to help you manage your
          fitness facility efficiently.
        </p>
        <h3 className="font-semibold">Contact Information:</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>Phone: +91 7010976271</li>
          <li>Email: support@sportsdot.com</li>
          <li>WhatsApp: +91 7010976271</li>
        </ul>
        <h3 className="font-semibold">Support Hours:</h3>
        <p>Monday to Friday: 9:00 AM to 6:00 PM IST</p>
        <h3 className="font-semibold">FAQs:</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>How do I update my gym&apos;s information?</li>
          <li>How can I manage memberships?</li>
          <li>What payment methods are supported?</li>
        </ul>
        <p>
          For more detailed information, please visit our{" "}
          <Link to="/help-center" className="text-purple-500 underline">
            Help Center
          </Link>
          .
        </p>
      </div>
    </div>
  );
}