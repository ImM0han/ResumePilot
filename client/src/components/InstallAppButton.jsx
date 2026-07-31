import { useEffect, useState } from 'react';
import { FiDownload } from 'react-icons/fi';

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already running as an installed PWA
    const checkInstalled = () => {
      const standalone = window.matchMedia(
        '(display-mode: standalone)'
      ).matches;

      const iosStandalone =
        window.navigator.standalone === true;

      if (standalone || iosStandalone) {
        setIsInstalled(true);
      }
    };

    checkInstalled();

    // Chrome fires this when the PWA is installable
    const handleBeforeInstallPrompt = (event) => {
      console.log('✅ PWA install prompt available');

      event.preventDefault();

      setDeferredPrompt(event);
    };

    // Fires after successful installation
    const handleAppInstalled = () => {
      console.log('✅ ResumePilot installed');

      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt
    );

    window.addEventListener(
      'appinstalled',
      handleAppInstalled
    );

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );

      window.removeEventListener(
        'appinstalled',
        handleAppInstalled
      );
    };
  }, []);

  const installApp = async () => {
    console.log(
      'Install button clicked',
      deferredPrompt
    );

    if (!deferredPrompt) {
      alert(
        'ResumePilot is not ready for installation yet. Please open this website in Chrome, wait a few seconds, and try again.'
      );

      return;
    }

    try {
      // Show Android Chrome installation dialog
      await deferredPrompt.prompt();

      const { outcome } =
        await deferredPrompt.userChoice;

      console.log(
        'Installation result:',
        outcome
      );

      if (outcome === 'accepted') {
        console.log(
          '✅ User accepted ResumePilot installation'
        );
      }

      setDeferredPrompt(null);
    } catch (error) {
      console.error(
        '❌ Installation failed:',
        error
      );
    }
  };

  // Hide only when already installed
  if (isInstalled) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={installApp}
      aria-label="Install ResumePilot AI"
      className="
        flex
        items-center
        gap-1.5
        rounded-full
        px-4
        sm:px-5
        py-2
        sm:py-2.5
        font-semibold
        text-white
        text-sm
        transition-all
        duration-200
        hover:scale-105
        active:scale-95
        whitespace-nowrap
      "
      style={{
        background:
          'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        boxShadow:
          '0 6px 20px rgba(99, 102, 241, 0.35)',
      }}
    >
      <FiDownload size={16} />

      <span>Get App</span>
    </button>
  );
}