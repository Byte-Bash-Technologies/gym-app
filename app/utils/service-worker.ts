export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
      });

      if (registration.installing) {
        console.log('Service worker installing');
      } else if (registration.waiting) {
        console.log('Service worker installed');
      } else if (registration.active) {
        console.log('Service worker active');
      }

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            if (confirm('New version available! Reload to update?')) {
              window.location.reload();
            }
          }
        });
      });

      // Check for updates every hour
      setInterval(() => {
        registration.update();
      }, 1000 * 60 * 60);

    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  }
}

// Helper to check if app is installed
export function isAppInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         // @ts-ignore
         window.navigator.standalone === true;
}

// Helper to check if app can be installed
export async function canInstallApp(): Promise<boolean> {
  if (!window.BeforeInstallPromptEvent) return false;
  
  return new Promise(resolve => {
    const handler = (e: Event) => {
      e.preventDefault();
      resolve(true);
      window.removeEventListener('beforeinstallprompt', handler);
    };
    window.addEventListener('beforeinstallprompt', handler);
    
    // Cleanup if no event fires
    setTimeout(() => {
      window.removeEventListener('beforeinstallprompt', handler);
      resolve(false);
    }, 1000);
  });
}

