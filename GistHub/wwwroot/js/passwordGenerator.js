export function generate(type, length, uppercase, lowercase, numbers, symbols) {
    if (!Number.isInteger(length) || length < 4 || length > 128) throw new Error('Choose a length from 4 to 128.');
    if (type !== 'random' && type !== 'pin') throw new Error('Choose a valid password type.');
    const groups = type === 'pin' ? ['0123456789'] : [
        uppercase && 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', lowercase && 'abcdefghijklmnopqrstuvwxyz',
        numbers && '0123456789', symbols && '!@#$%^&*()-_=+[]{};:,.?'
    ].filter(Boolean);
    if (!groups.length) throw new Error('Select at least one character type.');
    const alphabet = groups.join('');
    const limit = 256 - (256 % alphabet.length);
    const bytes = new Uint8Array(256);
    // Reject incomplete candidates so every selected character type appears without bias.
    for (;;) {
        let password = '';
        while (password.length < length) {
            crypto.getRandomValues(bytes);
            for (const byte of bytes) {
                if (byte < limit) password += alphabet[byte % alphabet.length];
                if (password.length === length) break;
            }
        }
        if (groups.every(group => [...password].some(character => group.includes(character)))) return password;
    }
}
