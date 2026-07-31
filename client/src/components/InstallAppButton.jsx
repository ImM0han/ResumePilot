import { useEffect, useState } from 'react';

export default function InstallAppButton() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check whether the app is already installed
        const checkIfInstalled = () => {
            const isStandalone =
                window.matchMedia('(display-mode: standalone)').matches;

            const isIOSStandalone =
                window.navigator.standalone === true;

            if (isStandalone || isIOSStandalone) {
                setIsInstalled(true);
            }
        };

        checkIfInstalled();

        // Chrome / Android PWA install event
        const handleBeforeInstallPrompt = (event) => {
            event.preventDefault();
            setDeferredPrompt(event);
        };

        window.addEventListener(
            'beforeinstallprompt',
            handleBeforeInstallPrompt
        );

        // Fired after successful installation
        const handleAppInstalled = () => {
            console.log('ResumePilot AI installed successfully');

            setIsInstalled(true);
            setDeferredPrompt(null);
        };

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
        // Browser doesn't currently provide the install prompt
        if (!deferredPrompt) {
            alert(
                'ResumePilot can be installed from your browser menu. Tap ⋮ and select "Install app" or "Add to Home screen".'
            );

            return;
        }

        try {
            // Show native browser installation popup
            deferredPrompt.prompt();

            const { outcome } =
                await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                console.log('User accepted ResumePilot installation');
            } else {
                console.log('User dismissed ResumePilot installation');
            }
        } catch (error) {
            console.error(
                'ResumePilot installation failed:',
                error
            );
        }

        // Prompt can only be used once
        setDeferredPrompt(null);
    };

    // Don't display the button if ResumePilot
    // is already installed
    if (isInstalled) {
        return null;
    }

   return (
    <button
        type="button"
        onClick={installApp}
        className="flex items-center gap-2 rounded-full px-5 py-2.5 font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
            background:
                'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            boxShadow:
                '0 6px 20px rgba(99, 102, 241, 0.35)',
        }}
        aria-label="Install ResumePilot AI"
    >
        <span
            style={{
                fontSize: '17px',
                lineHeight: 1,
            }}
        >
            
        </span>

        <span>
            Get App
        </span>
    </button>
);
}