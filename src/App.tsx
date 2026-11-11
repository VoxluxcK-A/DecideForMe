import { useEffect } from 'react';
import DecideForMe from './DecideForMe';
import DecisionDashboard from './DecisionDashboard';
import AuthPage from './AuthPage';
import PasswordRecoveryPage from './PasswordRecoveryPage';

function HomeRedirect() {
  useEffect(() => {
    window.location.replace('/home');
  }, []);

  return null;
}

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';

  if (path === '/' || path === '/mainframe') {
    return <HomeRedirect />;
  }

  if (path === '/decide') {
    return <DecisionDashboard />;
  }

  if (path === '/admin') {
    return <DecisionDashboard initialView="admin" />;
  }

  if (path === '/login' || path === '/register') {
    return <AuthPage mode={path === '/login' ? 'login' : 'register'} />;
  }

  if (path === '/forgot-password' || path === '/reset-password') {
    return <PasswordRecoveryPage mode={path === '/forgot-password' ? 'forgot' : 'reset'} />;
  }

  if (path === '/home') {
    return <DecideForMe />;
  }

  return <HomeRedirect />;
}
