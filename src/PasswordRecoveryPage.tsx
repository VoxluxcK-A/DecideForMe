import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { ApiError, decisionApi, getApiErrorMessage } from './decisions/api';
import './decide.css';

export default function PasswordRecoveryPage({ mode }: { mode: 'forgot' | 'reset' }) {
  const isReset = mode === 'reset';
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') ?? '';
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);

    try {
      if (isReset) {
        if (!token) {
          setError('This reset link is incomplete. Request a new password reset email.');
          return;
        }
        setMessage(await decisionApi.resetPassword(email, token, password, passwordConfirmation));
      } else {
        setMessage(await decisionApi.requestPasswordReset(email));
      }
    } catch (requestError) {
      setError(requestError instanceof ApiError && requestError.status >= 500
        ? requestError.message
        : getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="dfm-auth-page">
      <header className="dfm-auth-header">
        <a className="dfm-back-link" href="/login"><ArrowLeft size={17} /> Back to sign in</a>
        <a className="dfm-brand" href="/home" aria-label="Decide For Me home">Decide For Me<span>.</span><i aria-hidden="true">✳</i></a>
        <span className="dfm-auth-privacy"><CheckCircle2 size={14} /> PRIVATE BY DESIGN</span>
      </header>
      <div className="dfm-auth-content">
        <div className="dfm-auth-intro">
          <div className="dfm-kicker"><i /> YOUR SPACE, YOUR CALLS</div>
          <h1>{isReset ? <>A fresh<br />start.</> : <>Back to<br />your choices.</>}</h1>
          <p>{isReset
            ? 'Choose a new password to get back into your private decision space.'
            : 'We’ll email a secure, time-limited link to the address connected to your account.'}</p>
        </div>
        <section className="dfm-auth-card">
          <span className="dfm-dash-eyebrow">{isReset ? 'RESET PASSWORD' : 'ACCOUNT RECOVERY'}</span>
          <h2>{isReset ? 'Choose a new password' : 'Forgot your password?'}</h2>
          <p className="dfm-auth-card-copy">{isReset ? 'Use at least 8 characters and enter it twice.' : 'Enter your account email and we’ll send a reset link if it exists.'}</p>
          <form onSubmit={submit} className="dfm-auth-form">
            <label htmlFor="recovery-email">Email address</label>
            <input id="recovery-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            {isReset && (
              <>
                <label htmlFor="recovery-password">New password</label>
                <input id="recovery-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" />
                <label htmlFor="recovery-password-confirmation">Confirm new password</label>
                <input id="recovery-password-confirmation" type="password" autoComplete="new-password" minLength={8} required value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} placeholder="Enter your new password again" />
              </>
            )}
            {error && <p className="dfm-auth-error" role="alert">{error}</p>}
            {message && <p className="dfm-auth-success" role="status">{message}</p>}
            <button type="submit" className="dfm-dash-button dfm-dash-button-dark dfm-auth-submit" disabled={busy}>
              {busy ? 'One moment…' : isReset ? 'Reset password' : 'Send reset link'} {!busy && <ArrowRight size={16} />}
            </button>
          </form>
          <p className="dfm-auth-switch">
            {isReset && message ? 'Password updated?' : 'Remembered your password?'}{' '}
            <a href="/login">{isReset && message ? 'Sign in' : 'Back to sign in'} <ArrowUpRight size={13} /></a>
          </p>
        </section>
      </div>
      <footer className="dfm-app-footer"><span>Decide For Me<span className="dfm-dot">.</span></span><span>Your choices stay yours.</span></footer>
    </main>
  );
}
