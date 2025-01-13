import {
    isRouteErrorResponse,
    useRouteError,
  } from "@remix-run/react";
import NoUsersFound from "./NoUserFound";
import NoFacility from "./NoFacility";
import NoTrainerAccess from "./NoAccessTrainer";
import NetworkError from "./network-error";
  
  export function ErrorBoundary() {
    const error = useRouteError();
  
    if (isRouteErrorResponse(error)) {
        if (error.status === 405) {
            return (
                <NoUsersFound />
            );
        }
        else if (error.status === 404) {
            return (
                <NoFacility />
            );
        }
        else if (error.status === 409) {
          return (
              <NoTrainerAccess />
          );
      }
        else{
          <div>
          <h1>
            {error.status} {error.statusText}
          </h1>
          <p>{error.data}</p>
        </div>
        }
      
    } else if (error instanceof Error) {
      if (error.message === "Failed to fetch") {
            return (
                <NetworkError />
            );
        }
      return (
        <div>
          <h1>Error</h1>
          <p>{error.message}</p>
          <p>The stack trace is:</p>
          <pre>{error.stack}</pre>
        </div>
      );
    } else {
      return <h1>Unknown Error</h1>;
    }
  }
  