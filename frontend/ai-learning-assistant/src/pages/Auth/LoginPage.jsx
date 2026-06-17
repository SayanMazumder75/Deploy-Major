import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthSaaSLayout from '../../components/auth/AuthSaaSLayout';

const LoginPage = () => {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { token, user } = await authService.login(email, password);
      login(user, token);
      toast.success('Logged in successfully!');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to login. Please check your credentials.');
      toast.error(err.message || 'Failed to login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSaaSLayout
      mode="login"
      heading="Welcome Back"
      subtitle="Continue your AI-powered learning journey with a polished workspace built for documents, flashcards, quizzes, and focused study."
      formEyebrow="Secure sign in"
      formTitle="Login"
      formSubtitle="Sign in to continue your learning workflow without breaking your focus."
      footer={(
        <>
          <p className="text-center text-sm text-white/72">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-fuchsia-100 transition hover:text-white">
              Sign up
            </Link>
          </p>
          <p className="mt-4 text-center text-xs text-white/45">
            By continuing, you agree to our Terms & Privacy Policy
          </p>
        </>
      )}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">
            Email
          </label>
          <div className="relative group">
            <div className={`absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none transition-colors duration-200 ${focusedField === 'email' ? 'text-fuchsia-200' : 'text-white/35'}`}>
              <Mail className="h-5 w-5" strokeWidth={2} />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              className="h-13 w-full rounded-2xl border border-white/12 bg-white/10 pl-12 pr-4 text-sm text-white placeholder:text-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition duration-200 focus:outline-none focus:border-fuchsia-200/40 focus:bg-white/14 focus:shadow-[0_0_0_4px_rgba(244,114,182,0.12)]"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">
            Password
          </label>
          <div className="relative group">
            <div className={`absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none transition-colors duration-200 ${focusedField === 'password' ? 'text-fuchsia-200' : 'text-white/35'}`}>
              <Lock className="h-5 w-5" strokeWidth={2} />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              className="h-13 w-full rounded-2xl border border-white/12 bg-white/10 pl-12 pr-4 text-sm text-white placeholder:text-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition duration-200 focus:outline-none focus:border-fuchsia-200/40 focus:bg-white/14 focus:shadow-[0_0_0_4px_rgba(244,114,182,0.12)]"
              placeholder="••••••••"
            />
          </div>
        </div>
        {/* Forgot Password Link */}
<div className="flex justify-end -mt-2">
  <Link
    to="/forgot-password"
    className="text-xs font-medium text-fuchsia-200/80 transition hover:text-white"
  >
    Forgot password?
  </Link>
</div>

        {error && (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="group relative mt-2 inline-flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#f472b6,#8b5cf6)] px-5 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(168,85,247,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(168,85,247,0.38)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {loading ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" strokeWidth={2.5} />
              </>
            )}
          </span>
          <div className="absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)] transition-transform duration-700 group-hover:translate-x-full" />
        </button>
      </form>
    </AuthSaaSLayout>
  );
};

export default LoginPage;