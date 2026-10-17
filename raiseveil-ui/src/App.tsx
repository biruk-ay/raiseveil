import { Landing } from './components/landing';
import { Login } from './components/login';
import { Dashboard } from './components/dashboard';
import { Marketplace } from './components/marketplace';
import { PublicProfile } from './components/public-profile';
import { ResetPassword } from './components/reset-password';
import { Signup } from './components/signup';

function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const profileMatch = path.match(/^\/trader\/([^/]+)$/);

  if (path === '/signup') {
    return <Signup />;
  }

  if (path === '/login') {
    return <Login />;
  }
  if (path === '/dashboard') {
    return <Dashboard />;
  }
  if (path === '/market') {
    return <Marketplace />;
  }
  if (path === '/reset-password') {
    return <ResetPassword />;
  }
  if (profileMatch) {
    return <PublicProfile slug={decodeURIComponent(profileMatch[1])} />;
  }

  return <Landing />;
}

export default App;