import { useEffect, useState } from "react";

export default function InstallPWAButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault(); // Prevent the mini-infobar from appearing.
      setInstallPrompt(event);
      setIsVisible(true); // Show the install button.
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt(); // Show the install prompt.
      installPrompt.userChoice.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
        if (choiceResult.outcome === "accepted") {
          console.log("User accepted the PWA install");
        } else {
          console.log("User dismissed the PWA install");
        }
        setInstallPrompt(null); // Clear the prompt.
        setIsVisible(false); // Hide the install button.
      });
    }
  };

  return (
    <>
      {isVisible && (
        <button
          onClick={handleInstallClick}
          className="px-6 py-3 text-white bg-blue-500 rounded-lg hover:bg-blue-600 active:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-300"
        >
          Install App
        </button>
      )}
    </>
  );
}
