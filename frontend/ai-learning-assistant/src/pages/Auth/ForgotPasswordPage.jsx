import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthSaaSLayout from '../../components/auth/AuthSaaSLayout';
import authService from '../../services/authService';

const ForgotPasswordPage = () => {
  const [step, setStep] = useState(1); // 1: email, 2: otp, 3: new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const navigate = useNavigate();

  const inputClass = "h-13 w-full rounded-2xl border border-white/12 bg-white/10 pl-12 pr-4 text-sm text-white placeholder:text-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition duration-200 focus:outline-none focus:border-fuchsia-200/40 focus:bg-white/14 focus:shadow-[0_0_0_4px_rgba(244,114,182,0.12)]";
  const btnClass = "group relative mt-2 inline-flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#f472b6,#8b5cf6)] px-5 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(168,85,247,0.3)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60";

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      toast.success('OTP sent to your email!');
      setStep(2);
    } catch (err) {
      toast.error(err.error || err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.resetPassword(email, otp, newPassword);
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (err) {
      toast.error(err.error || err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSaaSLayout
      mode="login"
      heading="Reset Password"
      subtitle="Enter your email and we'll send you a one-time code to reset your password."
      formEyebrow="Account recovery"
      formTitle={step === 1 ? 'Forgot Password' : step === 2 ? 'Enter OTP' : 'New Password'}
      formSubtitle={
        step === 1 ? "We'll send a 6-digit OTP to your inbox." :
        step === 2 ? `Enter the OTP sent to ${email}` :
        'Choose a strong new password.'
      }
      footer={(
        <p className="text-center text-sm text-white/72">
          Remember your password?{' '}
          <Link to="/login" className="font-semibold text-fuchsia-100 transition hover:text-white">
            Back to Login
          </Link>
        </p>
      )}
    >
      {/* Step 1 - Email */}
      {step === 1 && (
        <form className="space-y-4" onSubmit={handleSendOTP}>
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">Email</label>
            <div className="relative">
              <div className={`absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none transition-colors duration-200 ${focusedField === 'email' ? 'text-fuchsia-200' : 'text-white/35'}`}>
                <Mail className="h-5 w-5" strokeWidth={2} />
              </div>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
                required className={inputClass} placeholder="you@example.com"
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className={btnClass}>
            {loading ? <><div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Sending...</> : 'Send OTP'}
          </button>
        </form>
      )}

      {/* Step 2 & 3 - OTP + New Password */}
      {step === 2 && (
        <form className="space-y-4" onSubmit={handleResetPassword}>
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">OTP Code</label>
            <div className="relative">
              <div className={`absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none transition-colors duration-200 ${focusedField === 'otp' ? 'text-fuchsia-200' : 'text-white/35'}`}>
                <KeyRound className="h-5 w-5" strokeWidth={2} />
              </div>
              <input
                type="text" value={otp} onChange={(e) => setOtp(e.target.value)}
                onFocus={() => setFocusedField('otp')} onBlur={() => setFocusedField(null)}
                required maxLength={6} className={inputClass} placeholder="6-digit OTP"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">New Password</label>
            <div className="relative">
              <div className={`absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none transition-colors duration-200 ${focusedField === 'password' ? 'text-fuchsia-200' : 'text-white/35'}`}>
                <Lock className="h-5 w-5" strokeWidth={2} />
              </div>
              <input
                type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)}
                required minLength={6} className={inputClass} placeholder="Min. 6 characters"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className={btnClass}>
            {loading ? <><div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Resetting...</> : 'Reset Password'}
          </button>

          <button type="button" onClick={() => setStep(1)}
            className="inline-flex w-full items-center justify-center gap-1 text-xs text-white/50 hover:text-white transition mt-1">
            <ArrowLeft className="h-3 w-3" /> Back
          </button>
        </form>
      )}
    </AuthSaaSLayout>
  );
};

export default ForgotPasswordPage;