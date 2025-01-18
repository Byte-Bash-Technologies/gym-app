import { useLoaderData } from "@remix-run/react";
import { loader } from "./transaction.loader";
import TransactionPage from "./transaction.page";

export { loader };
export { ErrorBoundary } from "~/components/CatchErrorBoundary";

export default function TransactionRoute() {
  const data = useLoaderData<typeof loader>();
  return <TransactionPage {...data} />;
}

