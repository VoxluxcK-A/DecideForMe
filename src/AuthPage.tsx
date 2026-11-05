import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { ApiError, decisionApi, getApiErrorMessage } from './decisions/api';
import './decide.css';

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const isRegister = mode === 'register';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isRegister) {
        await decisionApi.register(name, email, password, passwordConfirmation);
      } else {
        await decisionApi.login(email, password);
      }
      window.location.assign('/decide');
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setError(requestError instanceof ApiError && requestError.status === 429
        ? 'Too many attempts. Please wait a moment and try again.'
        : message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="dfm-auth-page">
      <header className="dfm-auth-header">
        <a className="dfm-back-link" href="/home"><ArrowLeft size={17} /> Back to home</a>
        <a className="dfm-brand" href="/home" aria-label="Decide For Me home">Decide For Me<span>.</span><i aria-hidden="true">✳</i></a>
        <span className="dfm-auth-privacy"><CheckCircle2 size={14} /> PRIVATE BY DESIGN</span>
      </header>
      <div className="dfm-auth-content">
        <div className="dfm-auth-intro">
          <div className="dfm-kicker"><i /> YOUR SPACE, YOUR CALLS</div>
          <h1>{isRegister ? <>A little space<br />for your choices.</> : <>Welcome<br />back.</>}</h1>
          <p>{isRegister
            ? 'Save your categories, keep track of decisions, and make the next choice a little easier.'
            : 'Your choices are right where you left them. Pick up where you paused.'}</p>
        </div>
        <section className="dfm-auth-card">
          <span className="dfm-dash-eyebrow">{isRegister ? 'GET STARTED' : 'GOOD TO SEE YOU'}</span>
          <h2>{isRegister ? 'Create your account' : 'Sign in to your space'}</h2>
          <p className="dfm-auth-card-copy">{isRegister ? 'Your decision space is private to your account.' : 'Enter your details to continue.'}</p>
          <form onSubmit={submit} className="dfm-auth-form">
            {isRegister && (
              <>
                <label htmlFor="auth-name">Your name</label>
                <input id="auth-name" autoComplete="name" maxLength={80} required value={name} onChange={(event) => setName(event.target.value)} placeholder="How should we address you?" />
              </>
            )}
            <label htmlFor="auth-email">Email address</label>
            <input id="auth-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            <label htmlFor="auth-password">Password</label>
            <input id="auth-password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isRegister ? 'At least 8 characters' : 'Your password'} />
            {isRegister && (
              <>
                <label htmlFor="auth-password-confirmation">Confirm password</label>
                <input id="auth-password-confirmation" type="password" autoComplete="new-password" minLength={8} required value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} placeholder="Enter your password again" />
              </>
            )}
            {error && <p className="dfm-auth-error" role="alert">{error}</p>}
            <button type="submit" className="dfm-dash-button dfm-dash-button-dark dfm-auth-submit" disabled={busy}>
              {busy ? 'One moment…' : isRegister ? 'Create account' : 'Sign in'} {!busy && <ArrowRight size={16} />}
            </button>
          </form>
          <p className="dfm-auth-switch">
            {isRegister ? 'Already have a space?' : 'New to Decide For Me?'}{' '}
            <a href={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'} <ArrowUpRight size={13} /></a>
          </p>
        </section>
      </div>
      <footer className="dfm-app-footer"><span>Decide For Me<span className="dfm-dot">.</span></span><span>Your choices stay yours.</span></footer>
    </main>
  );
}
