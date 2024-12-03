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
        <div
          style={{ backgroundColor: '#BBACE9' }}
          className="fixed top-4 right-4 px-6 py-3 text-white rounded-lg shadow-lg flex items-center"
        >
          <span>Install App</span>
          <button
            onClick={handleInstallClick}
            className="ml-4 bg-white text-[#BBACE9] px-4 py-2 rounded-lg hover:bg-gray-200 active:bg-gray-300 focus:outline-none focus:ring focus:ring-black-300"
          >
            Install
          </button>
        </div>
      )}
    </>
  );  
}
