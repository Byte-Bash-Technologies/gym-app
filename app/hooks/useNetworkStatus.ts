// app/hooks/useNetworkStatus.ts
import { useState, useEffect } from "react";

export function useNetworkStatus() {
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        const slowConnection = connection.downlink < 1.5 || connection.effectiveType.includes("2g");
        setIsSlowConnection(slowConnection);
      }
    };

    updateNetworkStatus();

    if (navigator.connection) {
      navigator.connection.addEventListener("change", updateNetworkStatus);
    }

    return () => {
      if (navigator.connection) {
        navigator.connection.removeEventListener("change", updateNetworkStatus);
      }
    };
  }, []);

  return isSlowConnection;
}