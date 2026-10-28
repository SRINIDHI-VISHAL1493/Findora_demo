// src/pages/auth/LoginPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { DEMO_USERS } from '../../lib/utils';
import { Eye, EyeOff, Mail, Lock, UserPlus, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const { login } = useAuth();
  const navigate = useNavigate();

  // ── Demo login ─────────────────────────────────────────────
  const handleDemoLogin = async (userId) => {
    setLoading(true);
    try {
      const { data } = await authAPI.demoLogin(userId);
      login(data.token, data.user);
      toast.success(`Welcome, ${data.user.displayName}!`);
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Real Firebase login/register ───────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Email and password are required');
      return;
    }
    if (isRegister && !form.displayName) {
      toast.error('Name is required');
      return;
    }

    setLoading(true);
    try {
      // Dynamically import Firebase auth to avoid loading it in demo mode
      const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      const { initializeApp, getApps } = await import('firebase/app');

      const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      };

      const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
      const auth = getAuth(app);

      let userCredential;
      if (isRegister) {
        userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
        await updateProfile(userCredential.user, { displayName: form.displayName });
      } else {
        userCredential = await signInWithEmailAndPassword(auth, form.email, form.password);
      }

      // Get Firebase ID token and send to backend
      const idToken = await userCredential.user.getIdToken();

      if (isRegister) {
        // Register user in backend store
        const { data } = await authAPI.register({
          uid: userCredential.user.uid,
          email: form.email,
          displayName: form.displayName,
          idToken,
        });
        login(idToken, data.user);
        toast.success(`Welcome to Findora, ${form.displayName}!`);
      } else {
        // On sign-in: get profile, auto-create in backend if first time
        try {
          const { data } = await authAPI.getMe();
          login(idToken, data);
          toast.success(`Welcome back, ${data.displayName || form.email}!`);
        } catch (meErr) {
          // User exists in Firebase but not yet in backend — register them
          if (meErr.response?.status === 401 || meErr.response?.status === 404) {
            const { data } = await authAPI.register({
              uid: userCredential.user.uid,
              email: form.email,
              displayName: userCredential.user.displayName || form.email.split('@')[0],
            });
            login(idToken, data.user);
            toast.success(`Welcome, ${data.user.displayName}!`);
          } else {
            throw meErr;
          }
        }
      }

      navigate('/');
    } catch (err) {
      const msg = err.code === 'auth/user-not-found'    ? 'No account found with this email' :
                  err.code === 'auth/wrong-password'     ? 'Incorrect password' :
                  err.code === 'auth/email-already-in-use' ? 'Email already registered' :
                  err.code === 'auth/weak-password'      ? 'Password must be at least 6 characters' :
                  err.code === 'auth/invalid-email'      ? 'Invalid email address' :
                  err.response?.data?.error              || err.message || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-3xl">
              🔍
            </div>
          </div>
          <CardTitle className="text-3xl">Findora</CardTitle>
          <p className="text-gray-600">AI-Powered Smart Lost & Found</p>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* ── DEMO MODE ─────────────────────────────── */}
          {IS_DEMO ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium mb-1">
                  🔧 Demo Mode — Select a user to login
                </p>
                <p className="text-xs text-blue-600">
                  No authentication required. Perfect for testing the full platform.
                </p>
              </div>

              <div className="space-y-2">
                {DEMO_USERS.map((user) => (
                  <Button
                    key={user.id}
                    variant="outline"
                    className="w-full justify-start text-left"
                    onClick={() => handleDemoLogin(user.id)}
                    disabled={loading}
                  >
                    <span className="flex-1">{user.name}</span>
                    <span className="text-xs text-gray-500 capitalize">{user.role}</span>
                  </Button>
                ))}
              </div>
            </>
          ) : (
            /* ── PRODUCTION MODE ─────────────────────── */
            <>
              {/* Toggle login / register */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setIsRegister(false)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    !isRegister ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setIsRegister(true)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    isRegister ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Name field (register only) */}
                {isRegister && (
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Full name"
                      value={form.displayName}
                      onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                )}

                {/* Email */}
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>

                {/* Password */}
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={isRegister ? 'Password (min 6 characters)' : 'Password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
                  loading={loading}
                >
                  {isRegister
                    ? <><UserPlus className="w-4 h-4" /> Create Account</>
                    : <><LogIn className="w-4 h-4" /> Sign In</>
                  }
                </Button>
              </form>
            </>
          )}

          {/* Features */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-gray-400">Key Features</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            {[['🤖','AI Matching'],['🔒','Smart Lockers'],['💬','Secure Chat'],['🏆','Rewards']].map(([icon, label]) => (
              <div key={label} className="flex items-center gap-2">
                <span>{icon}</span>
                <span className="text-gray-600">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
