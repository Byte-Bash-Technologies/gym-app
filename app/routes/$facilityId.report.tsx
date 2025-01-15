import { useLoaderData } from "@remix-run/react";
import { loader } from "./reports.$facilityId.loader";
import ReportPage from "./reports.$facilityId.page";

export { loader };

export default function ReportRoute() {
  const data = useLoaderData<typeof loader>();
  return <ReportPage {...data} />;
}

