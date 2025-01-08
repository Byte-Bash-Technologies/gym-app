import * as React from "react";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

export default function NetworkStatus() {
  const isSlowConnection = useNetworkStatus();

  if (!isSlowConnection) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-red-500 text-white text-center p-2">
      Your network connection is slow. Some features may not work as expected.
    </div>
  );
}