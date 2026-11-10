import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Session } from '@supabase/supabase-js';
import App from './App';
import { LoginPage } from './components/LoginPage';
import { supabase, supabaseConfigError } from './services/supabase';
import './index.css';

function Root() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!supabase || supabaseConfigError) {
      setIsLoading(false);
      return;
    }

    let active = true;
    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error) setAuthError(`Gagal memeriksa sesi: ${error.message}`);
      setSession(data.session);
      setIsLoading(false);
    };
    void loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthError('');
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD || '__TAURI_INTERNALS__' in window || !('serviceWorker' in navigator)) {
      return;
    }
    void navigator.serviceWorker.register('/service-worker.js').catch((error: unknown) => {
      console.error('Gagal mendaftarkan service worker PWA:', error);
    });
  }, []);

  const handleSignOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setAuthError(`Gagal keluar: ${error.message}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm font-semibold text-primary">
        Memeriksa sesi AuraBell.OS...
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <LoginPage configurationError={supabaseConfigError} />
        {authError && (
          <p role="alert" className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-xl bg-error px-4 py-2 text-sm text-white">
            {authError}
          </p>
        )}
      </>
    );
  }

  return (
    <>
      <App onSignOut={() => void handleSignOut()} />
      {authError && (
        <p role="alert" className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 rounded-xl bg-error px-4 py-2 text-sm text-white">
          {authError}
        </p>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
