import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

function dispatchQuotaExceeded(detail: string) {
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded', {detail}));
}

window.gm_authFailure = () => {
  dispatchQuotaExceeded('MapsAuthFailure');
};

const origConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const joined = args.map((a) => (typeof a === 'string' ? a : String(a ?? ''))).join(' ');
  if (
    joined.includes('OverQuotaMapError') ||
    joined.includes('QuotaExceededError') ||
    joined.includes('You have exceeded your request quota for this API')
  ) {
    dispatchQuotaExceeded('OverQuotaMapError');
  }
  origConsoleError(...args);
};

createRoot(document.getElementById('root')!).render(<App />);

