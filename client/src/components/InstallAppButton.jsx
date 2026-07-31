import { useEffect, useState } from 'react';
import { FiDownload } from 'react-icons/fi';

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const checkInstalled = () => {
      const standalone = window.matchMedia(
        '(display-mode: standalone)'
      ).matches;

      const iosStandalone =
        window.navigator.standalone === true;

      setIsInstalled(standalone || iosStandalone);
    };

    checkInstalled();

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();

      console.log('PWA install prompt available');

      setDeferredPrompt(event);
    };

    const handleAppInstalled = () => {
      console.log('ResumePilot installed');

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
    if (!deferredPrompt) {
      alert(
        'ResumePilot can be installed from your browser menu. Select "Install app" or "Add to Home screen".'
      );

      return;
    }

    try {
      deferredPrompt.prompt();

      const { outcome } =
        await deferredPrompt.userChoice;

      console.log(
        'Install prompt result:',
        outcome
      );

      setDeferredPrompt(null);
    } catch (error) {
      console.error(
        'PWA installation error:',
        error
      );
    }
  };

  // Hide only after the app is actually installed
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
        px-3
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