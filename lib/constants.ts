export const NAV_THEME = {
  light: {
    background: 'hsl(0 0% 100%)', // background
    border: 'hsl(240 5.9% 90%)', // border
    card: 'hsl(0 0% 100%)', // card
    notification: 'hsl(0 84.2% 60.2%)', // destructive
    primary: 'hsl(240 5.9% 10%)', // primary
    text: 'hsl(240 10% 3.9%)', // foreground
  },
  dark: {
    background: 'hsl(240 10% 3.9%)', // background
    border: 'hsl(240 3.7% 15.9%)', // border
    card: 'hsl(240 10% 3.9%)', // card
    notification: 'hsl(0 72% 51%)', // destructive
    primary: 'hsl(0 0% 98%)', // primary
    text: 'hsl(0 0% 98%)', // foreground
  },
};

export const CACHE_PREFIX = '@chatfi_cache';
export const THREADS_CACHE_KEY = `${CACHE_PREFIX}_threads`;
export const MESSAGES_CACHE_KEY = `${CACHE_PREFIX}_messages`;
export const PROFILES_CACHE_KEY = `${CACHE_PREFIX}_profiles`;
export const THREAD_MESSAGES_CACHE_KEY_PREFIX = `${CACHE_PREFIX}_thread_messages_`;

export const solana_explorer_url = (txHash: string) => `https://explorer.solana.com/tx/${txHash}?cluster=devnet`;
