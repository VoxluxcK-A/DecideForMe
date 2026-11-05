import { useEffect } from 'react';
import DecideForMe from './DecideForMe';
import DecisionDashboard from './DecisionDashboard';
import AuthPage from './AuthPage';

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

  if (path === '/login' || path === '/register') {
    return <AuthPage mode={path === '/login' ? 'login' : 'register'} />;
  }

  if (path === '/home') {
    return <DecideForMe />;
  }

  return <HomeRedirect />;
}
