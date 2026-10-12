/** Icônes de marques (absentes de lucide) */
type P = { className?: string };

export const InstagramIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);

export const TikTokIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M16.5 3c.3 2 1.6 3.6 3.5 4.1v2.8c-1.3 0-2.5-.4-3.5-1.1v6.2c0 3.3-2.7 5.9-6 5.9s-6-2.6-6-5.9 2.7-5.9 6-5.9c.4 0 .8 0 1.1.1v2.9c-.3-.1-.7-.2-1.1-.2-1.6 0-2.9 1.3-2.9 3s1.3 3 2.9 3 3-1.3 3-3V3h3z" />
  </svg>
);

export const FacebookIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M13.5 21v-7.5h2.5l.5-3h-3V8.5c0-.9.3-1.5 1.6-1.5h1.4V4.2c-.3 0-1.3-.2-2.5-.2-2.4 0-4 1.5-4 4.2v2.3H7.5v3H10V21h3.5z" />
  </svg>
);

export const WhatsAppIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.3-.4.8-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.6 2.5 4 3.5 1.5.6 2.1.7 2.8.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.1-.2z" />
  </svg>
);

export const GoogleIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.81z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09C3.24 21.3 7.29 24 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54v-3.09H1.27a12 12 0 0 0 0 10.72z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.29 0 3.24 2.7 1.27 6.64l4 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
  </svg>
);

/* Icônes pleines (style « applis du téléphone ») pour les infos de contact */

export const PhoneFillIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z" />
  </svg>
);

export const PinFillIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path fillRule="evenodd" d="M12 2a7.5 7.5 0 0 0-7.5 7.5c0 5.3 6.2 11.6 6.9 12.2.3.3.9.3 1.2 0 .7-.6 6.9-6.9 6.9-12.2A7.5 7.5 0 0 0 12 2zm0 10.3a2.8 2.8 0 1 1 0-5.6 2.8 2.8 0 0 1 0 5.6z" />
  </svg>
);

export const UserFillIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <circle cx="12" cy="7.5" r="4.5" />
    <path d="M3.5 20.2C4.3 16 7.8 13.5 12 13.5s7.7 2.5 8.5 6.7c.1.5-.3.8-.8.8H4.3c-.5 0-.9-.3-.8-.8z" />
  </svg>
);

export const MailFillIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M4 4.5h16c1.1 0 2 .9 2 2v.3l-10 6.1L2 6.8v-.3c0-1.1.9-2 2-2z" />
    <path d="M2 9.1V17.5c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9.1l-9.5 5.8c-.3.2-.7.2-1 0L2 9.1z" />
  </svg>
);

export const ClockFillIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path fillRule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 5a1 1 0 1 0-2 0v5c0 .3.1.5.3.7l3 3a1 1 0 0 0 1.4-1.4L13 11.6V7z" />
  </svg>
);

export const TruckFillIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M2 6c0-1.1.9-2 2-2h9c1.1 0 2 .9 2 2v1h2.6c.6 0 1.2.3 1.6.8l2.4 3.1c.3.4.4.8.4 1.2V16c0 .8-.6 1.5-1.4 1.5a3 3 0 0 0-5.9.5H9.3a3 3 0 0 0-5.9-.5C2.6 17.5 2 16.8 2 16V6zm13 3v3h4.8L17.5 9H15z" />
    <circle cx="6.3" cy="18" r="2" />
    <circle cx="17.7" cy="18" r="2" />
  </svg>
);

export const NavigateFillIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M20.6 3.4c.4.4.5 1 .3 1.5l-7 15.8c-.5 1-1.9.9-2.2-.1l-1.6-5.2-5.2-1.6c-1-.3-1.1-1.7-.1-2.2l15.8-7c.5-.2 1.1-.1 1.5.3z" />
  </svg>
);
