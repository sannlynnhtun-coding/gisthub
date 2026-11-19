(() => {
    let installPrompt;
    const root = document.documentElement;

    window.addEventListener('beforeinstallprompt', event => {
        event.preventDefault();
        installPrompt = event;
        root.toggleAttribute('data-pwa-install-available', true);
    });

    window.addEventListener('appinstalled', () => {
        installPrompt = null;
        root.removeAttribute('data-pwa-install-available');
    });

    window.gistHubInstallApp = async () => {
        const prompt = installPrompt;
        if (!prompt) return;
        installPrompt = null;
        root.removeAttribute('data-pwa-install-available');
        try {
            await prompt.prompt();
        } catch (error) {
            console.warn('App install prompt could not be opened:', error);
        }
    };
})();
