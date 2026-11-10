import React, { useEffect, useState } from 'react';
import { Bell, Eye, EyeOff, LogIn } from 'lucide-react';
import { supabase } from '../services/supabase';

interface LoginPageProps {
  configurationError: string | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({ configurationError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);

  useEffect(() => {
    if (retryAfterSeconds === 0) return;
    const timer = setTimeout(() => {
      setRetryAfterSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [retryAfterSeconds]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || configurationError) {
      setErrorMessage(configurationError ?? 'Supabase belum dikonfigurasi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        if (error.status === 429) {
          setRetryAfterSeconds(60);
          setErrorMessage('Terlalu banyak percobaan masuk. Coba lagi sebentar.');
        } else if (error.status === 400) {
          setErrorMessage('Email atau kata sandi salah.');
        } else {
          setErrorMessage('Login belum dapat diproses. Coba lagi nanti.');
        }
      }
    } catch (error) {
      console.error('Gagal menghubungi layanan autentikasi:', error);
      setErrorMessage('Tidak dapat menghubungi layanan masuk. Periksa koneksi internet, lalu coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-8 shadow-xl">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-on-primary">
            <Bell className="h-7 w-7" />
          </div>
          <h1 className="font-headline text-2xl font-extrabold text-primary">AuraBell.OS</h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            Masuk untuk mengelola bel dan pengumuman sekolah.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-on-surface-variant">
            Email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-2.5 text-on-surface outline-none focus:ring-2 focus:ring-primary"
              disabled={Boolean(configurationError) || isSubmitting}
            />
          </label>

          <div className="flex flex-col gap-1.5 text-sm font-semibold text-on-surface-variant">
            <label htmlFor="login-password">Kata sandi</label>
            <div className="relative">
              <input
                id="login-password"
                type={passwordVisible ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-2.5 pr-11 text-on-surface outline-none focus:ring-2 focus:ring-primary"
                disabled={Boolean(configurationError) || isSubmitting || retryAfterSeconds > 0}
              />
              <button
                type="button"
                onClick={() => setPasswordVisible((visible) => !visible)}
                aria-label={passwordVisible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                aria-pressed={passwordVisible}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-on-surface-variant hover:text-primary"
                disabled={Boolean(configurationError)}
              >
                {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {(configurationError || errorMessage) && (
            <p role="alert" className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error">
              {errorMessage || configurationError}
              {retryAfterSeconds > 0 && ` Coba lagi dalam ${retryAfterSeconds} detik.`}
            </p>
          )}

          <button
            type="submit"
            disabled={Boolean(configurationError) || isSubmitting || retryAfterSeconds > 0}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-on-primary hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            {isSubmitting ? 'Memeriksa akun...' : retryAfterSeconds > 0 ? `Tunggu ${retryAfterSeconds} detik` : 'Masuk'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-on-surface-variant">
          Akun dibuat oleh administrator sekolah. Pendaftaran publik tidak tersedia.
        </p>
      </section>
    </main>
  );
};
