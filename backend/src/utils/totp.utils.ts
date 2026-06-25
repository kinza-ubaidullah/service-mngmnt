import { generateSecret, generateURI, verifySync } from 'otplib';

const APP_NAME = 'Al Jaroshi CRM';

export const generateTotpSecret = () => generateSecret();

export const getTotpAuthUrl = (label: string, secret: string) =>
  generateURI({ issuer: APP_NAME, label, secret });

export const verifyTotpCode = (secret: string, code: string) => {
  if (!secret || !code) return false;
  try {
    const cleanCode = String(code).trim().replace(/\s/g, '');
    if (cleanCode.length !== 6) return false;
    // window: 4 allows +/- 2 minutes drift (important for cPanel servers)
    // Cast as any because otplib TS types don't expose `window` but runtime supports it
    const result = verifySync({ secret, token: cleanCode, window: 4 } as any);
    return !!result.valid;
  } catch (error) {
    console.error('[totp] verification exception:', error);
    return false;
  }
};
