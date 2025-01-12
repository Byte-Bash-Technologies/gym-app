import { Outlet,useNavigate } from "@remix-run/react";

import { useEffect } from "react";



export default function SubscriptionLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/admin/subscriptions/index");
  }, [navigate]);

  return (
    <div className="space-y-6 pt-6">
      <h2 className="text-2xl font-bold">Subscription Management</h2>
      <Outlet />
    </div>
  );
}
