import { Link } from "@remix-run/react";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger 
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ArrowLeft, Phone, Mail, MessageCircle, Users, Dumbbell, CreditCard, Settings, HelpCircle, BookOpen, Building2 } from 'lucide-react';

export default function HelpCenter() {
  return (
    <div className="min-h-screen bg-[#f0ebff] dark:bg-[#212237]">
      <header className="bg-background dark:bg-[#4A4A62] border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button className="hover:dark:bg-[#3A3A52]/90" variant="ghost" size="icon" onClick={() => history.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Help Center</h1>
              <p className="text-sm text-muted-foreground">
                Find answers and support for Sportsdot
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Quick Help Section */}
        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-purple-300" />
                Call Support
              </CardTitle>
              <CardDescription>
                Talk to our support team directly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a href="tel:+917010976271">
                <Button variant="outline" className="w-full text-black dark:text-white dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]">
                  Call +91 7010976271
                </Button>
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-purple-300" />
                WhatsApp Support
              </CardTitle>
              <CardDescription>
                Chat with us on WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a href="https://wa.me/917010976271" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full text-black dark:text-white dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]">
                  Open WhatsApp
                </Button>
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-purple-300" />
                Email Support
              </CardTitle>
              <CardDescription>
                Send us an email anytime
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a href="mailto:support@sportsdot.in">
                <Button variant="outline" className="w-full text-black dark:text-white dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]">
                  Email Us
                </Button>
              </a>
            </CardContent>
          </Card>
        </section>

        {/* Help Topics */}
        <section>
          <Tabs defaultValue="general" className="space-y-4">
            <TabsList className="w-full flex flex-wrap h-auto gap-2 bg-transparent p-0">
              <TabsTrigger value="general" className="data-[state=active]:bg-purple-100 dark:data-[state=active]:bg-purple-300">
                General
              </TabsTrigger>
              <TabsTrigger value="members" className="data-[state=active]:bg-purple-100 dark:data-[state=active]:bg-purple-300">
                Members
              </TabsTrigger>
              <TabsTrigger value="trainers" className="data-[state=active]:bg-purple-100 dark:data-[state=active]:bg-purple-300">
                Trainers
              </TabsTrigger>
              <TabsTrigger value="billing" className="data-[state=active]:bg-purple-100 dark:data-[state=active]:bg-purple-300">
                Billing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-purple-300" />
                    General FAQs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="what-is-sportsdot">
                      <AccordionTrigger>What is Sportsdot?</AccordionTrigger>
                      <AccordionContent>
                        Sportsdot is a comprehensive gym and sports facility management platform that helps owners manage their facilities, members, trainers, and subscriptions efficiently.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="getting-started">
                      <AccordionTrigger>How do I get started?</AccordionTrigger>
                      <AccordionContent>
                        Sign up for an account, add your facility details, and start managing your gym or sports facility. You can add members, assign trainers, and track subscriptions right away.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="support-hours">
                      <AccordionTrigger>What are your support hours?</AccordionTrigger>
                      <AccordionContent>
                        Our support team is available Monday to Friday, 9:00 AM to 6:00 PM IST. You can reach us via phone, WhatsApp, or email.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="members" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-300" />
                    Member Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="add-member">
                      <AccordionTrigger>How do I add a new member?</AccordionTrigger>
                      <AccordionContent>
                        Go to the Members section, click on &quot;Add Member&quot;, and fill in their details. You can also assign them a membership plan during registration.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="manage-subscriptions">
                      <AccordionTrigger>How do I manage member subscriptions?</AccordionTrigger>
                      <AccordionContent>
                        You can manage subscriptions from the member&apos;s profile. You can view, update, or renew their subscription plans there.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="track-attendance">
                      <AccordionTrigger>Can I track member attendance?</AccordionTrigger>
                      <AccordionContent>
                        Yes, you can track member attendance through the attendance feature. Members can be marked present when they visit your facility.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trainers" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Dumbbell className="h-5 w-5 text-purple-300" />
                    Trainer Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="add-trainer">
                      <AccordionTrigger>How do I add a trainer?</AccordionTrigger>
                      <AccordionContent>
                        Go to Settings, select &quot;Manage Trainers&quot;, and click &quot;Add Trainer&quot;. Enter their email address to invite them to your facility.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="trainer-access">
                      <AccordionTrigger>What can trainers access?</AccordionTrigger>
                      <AccordionContent>
                        Trainers can access member information, track attendance, and manage their assigned members. They cannot access billing or facility settings.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="remove-trainer">
                      <AccordionTrigger>How do I remove a trainer?</AccordionTrigger>
                      <AccordionContent>
                        Go to Settings, select &quot;Manage Trainers&quot;, find the trainer you want to remove, and click the remove button. This will revoke their access to your facility.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-purple-300" />
                    Billing & Subscriptions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="subscription-plans">
                      <AccordionTrigger>What subscription plans are available?</AccordionTrigger>
                      <AccordionContent>
                        We offer monthly, quarterly, and annual plans. Each plan includes different features and member limits. Contact our support team for detailed pricing.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="payment-methods">
                      <AccordionTrigger>What payment methods do you accept?</AccordionTrigger>
                      <AccordionContent>
                        We accept all major credit/debit cards, UPI payments, and bank transfers. Payments are processed securely through our payment gateway.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="billing-cycle">
                      <AccordionTrigger>How does the billing cycle work?</AccordionTrigger>
                      <AccordionContent>
                        Your billing cycle starts from the day you subscribe. You&apos;ll be notified before renewal, and you can manage your subscription from the settings page.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        {/* Quick Links */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link to="/members">
              <Card className="hover:bg-gray-50 transition-colors">
                <CardContent className="flex items-center gap-3 p-4">
                  <Users className="h-5 w-5 text-purple-300" />
                  <div>
                    <h3 className="font-medium">Members Guide</h3>
                    <p className="text-sm text-muted-foreground">
                      Learn about member management
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/settings">
              <Card className="hover:bg-gray-50 transition-colors">
                <CardContent className="flex items-center gap-3 p-4">
                  <Settings className="h-5 w-5 text-purple-300" />
                  <div>
                    <h3 className="font-medium">Settings Guide</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure your facility
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/billing">
              <Card className="hover:bg-gray-50 transition-colors">
                <CardContent className="flex items-center gap-3 p-4">
                  <CreditCard className="h-5 w-5 text-purple-300" />
                  <div>
                    <h3 className="font-medium">Billing Guide</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage subscriptions
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/facility">
              <Card className="hover:bg-gray-50 transition-colors">
                <CardContent className="flex items-center gap-3 p-4">
                  <Building2 className="h-5 w-5 text-purple-300" />
                  <div>
                    <h3 className="font-medium">Facility Guide</h3>
                    <p className="text-sm text-muted-foreground">
                      Facility management tips
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>

        {/* Contact Support */}
        <section className="border-t pt-8">
          <div className="text-center space-y-4">
            <HelpCircle className="h-12 w-12 text-purple-500 mx-auto" />
            <h2 className="text-xl font-semibold">Still need help?</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Our support team is always ready to help you with any questions or concerns.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="mailto:support@sportsdot.com">
                <Button variant="outline" className="gap-2 text-black dark:text-white dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]">
                  <Mail className="h-4 w-4" />
                  Email Support
                </Button>
              </a>
              <a href="tel:+917010976271">
                <Button variant="outline" className="gap-2 text-black dark:text-white dark:bg-[#3A3A52] dark:hover:bg-[#3A3A52]">
                  <Phone className="h-4 w-4" />
                  Call Support
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}