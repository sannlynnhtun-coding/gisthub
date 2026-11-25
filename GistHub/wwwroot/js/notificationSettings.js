const mutedKey = 'gisthub:notifications-muted';
const volumeKey = 'gisthub:notifications-volume';

export function getNotificationSettings() {
    try {
        const stored = localStorage.getItem(volumeKey);
        const volume = stored === null || stored.trim() === '' ? 0.5 : Number(stored);
        return { muted: localStorage.getItem(mutedKey) === 'true',
            volume: Number.isFinite(volume) && volume >= 0 && volume <= 1 ? volume : 0.5 };
    } catch { return { muted: false, volume: 0.5 }; }
}

export function setNotificationSettings(muted, volume) {
    if (typeof muted !== 'boolean' || !Number.isFinite(volume) || volume < 0 || volume > 1)
        throw new Error('Choose a notification volume between 0 and 100%.');
    const previous = [localStorage.getItem(mutedKey), localStorage.getItem(volumeKey)];
    try {
        localStorage.setItem(mutedKey, String(muted));
        localStorage.setItem(volumeKey, String(volume));
    } catch (error) {
        try {
            [mutedKey, volumeKey].forEach((key, index) => previous[index] === null
                ? localStorage.removeItem(key) : localStorage.setItem(key, previous[index]));
        } catch { /* Storage may be unavailable. */ }
        throw error;
    }
    if (previous[0] !== String(muted) || previous[1] !== String(volume)) window.gistHubBackup?.changed();
    window.dispatchEvent(new Event('gisthub:notification-settings-changed'));
}
