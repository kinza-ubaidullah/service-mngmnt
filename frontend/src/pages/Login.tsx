import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { LogIn, User, Lock, Loader2, Sparkles, Eye, EyeOff, Shield, KeyRound, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { setCredentials } from '../store/slices/authSlice';
import { homePathForRole } from '../utils/roleRoutes';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';

type ForgotStep = 'login' | 'forgot-email' | 'forgot-otp' | 'forgot-contact';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [twoFAStep, setTwoFAStep] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFACode, setTwoFACode] = useState('');

  const [forgotStep, setForgotStep] = useState<ForgotStep>('login');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotRole, setForgotRole] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const finishLogin = (user: any, token: string) => {
    dispatch(setCredentials({ user, token }));
    toast.success('Login Successful!');
    const path = homePathForRole(user?.role);
    if (path === '/login') {
      toast.error('Access denied: Unknown role');
      return;
    }
    navigate(path, { replace: true });
  };

  const resetForgotFlow = () => {
    setForgotStep('login');
    setForgotIdentifier('');
    setMaskedEmail('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotRole('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    toast.dismiss();
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.requires2FA) {
        setTempToken(response.data.tempToken);
        setTwoFAStep(true);
        toast.success('Enter your authenticator code');
        return;
      }
      const { user, token } = response.data;
      if (!user || !user.role) throw new Error('Invalid response from server');
      finishLogin(user, token);
    } catch (error: any) {
      if (!error.response) {
        toast.error('Cannot reach API server. Check api.aljaroshi.tech is running.');
      } else if (error.response.status === 503) {
        toast.error('API server is down (503). Restart Node.js app in cPanel.');
      } else {
        toast.error(error.response?.data?.message || 'Login failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFACode.trim()) return;
    setLoading(true);
    try {
      const response = await api.post('/auth/2fa/verify-login', {
        tempToken,
        code: twoFACode.trim(),
      });
      const { user, token } = response.data;
      finishLogin(user, token);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Verify admin + proceed to authenticator code entry
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password/send-otp', { email: forgotIdentifier.trim() });

      if (res.data.canSelfReset === false) {
        setForgotRole(res.data.role || '');
        setForgotStep('forgot-contact');
        return;
      }

      setMaskedEmail(res.data.maskedEmail || '');
      setForgotStep('forgot-otp');
      toast.success('Enter the code from your Google Authenticator app');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start password reset');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify authenticator code + reset password
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (otpCode.length !== 6) { toast.error('Enter the 6-digit authenticator code'); return; }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password/verify-otp', {
        email: forgotIdentifier.trim(),
        otp: otpCode.trim(),
        newPassword,
      });
      toast.success('Password reset successful! Please sign in.');
      setEmail(forgotIdentifier);
      setPassword('');
      resetForgotFlow();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Reset failed. Check OTP and try again.');
    } finally {
      setLoading(false);
    }
  };

  const slide = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.2 },
  };

  const getTitle = () => {
    if (twoFAStep) return 'Two-Factor Verification';
    if (forgotStep === 'forgot-email') return 'Forgot Password';
    if (forgotStep === 'forgot-otp') return 'Authenticator Code';
    if (forgotStep === 'forgot-contact') return 'Contact Administrator';
    return 'Welcome Back';
  };

  const getSubtitle = () => {
    if (twoFAStep) return 'Enter the 6-digit code from Google Authenticator';
    if (forgotStep === 'forgot-email') return 'Enter your admin email — code comes from Google Authenticator';
    if (forgotStep === 'forgot-otp') return 'Open Google Authenticator and enter the 6-digit code for Al Jaroshi CRM';
    if (forgotStep === 'forgot-contact') return 'Your administrator can reset your password';
    return 'Sign in to your account';
  };

  const getIcon = () => {
    if (twoFAStep) return <Shield className="text-mint-600" size={26} />;
    if (forgotStep === 'forgot-otp') return <Shield className="text-mint-600" size={26} />;
    if (forgotStep !== 'login') return <KeyRound className="text-mint-600" size={26} />;
    return <LogIn className="text-mint-600" size={26} />;
  };

  return (
    <div className="crm-shell min-h-screen flex items-center justify-center p-4 overflow-y-auto relative">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle showLabel />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Header banner */}
        <div className="crm-header-banner rounded-[2rem] px-6 py-5 mb-4 flex items-center gap-3">
          <div className="crm-icon-box p-2.5">
            <Sparkles size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#2d6a4a]/70">Al Jaroshi CRM</p>
            <h1 className="text-xl font-black text-[#1a3d2e]">Service Management</h1>
          </div>
        </div>

        <div className="crm-card rounded-[2rem] p-8 shadow-lg">
          {/* Dynamic header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-mint-100 rounded-2xl mb-4 border border-mint-200">
              {getIcon()}
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{getTitle()}</h2>
            <p className="text-slate-500 text-sm mt-1">{getSubtitle()}</p>
          </div>

          <AnimatePresence mode="wait">

            {/* ── 2FA step ── */}
            {twoFAStep && (
              <motion.form key="2fa" {...slide} onSubmit={handle2FAVerify} className="space-y-5">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  autoFocus
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                  className="crm-input w-full rounded-2xl py-4 px-5 text-center text-2xl tracking-[0.5em] font-bold"
                  placeholder="000000"
                />
                <button type="submit" disabled={loading || twoFACode.length < 6}
                  className="w-full crm-btn-primary font-black py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <><Shield size={18} /> Verify &amp; Login</>}
                </button>
                <button type="button" onClick={() => { setTwoFAStep(false); setTwoFACode(''); setTempToken(''); }}
                  className="w-full text-slate-500 hover:text-slate-800 text-sm font-bold py-2">
                  Back to login
                </button>
              </motion.form>
            )}

            {/* ── Forgot: enter email ── */}
            {!twoFAStep && forgotStep === 'forgot-email' && (
              <motion.form key="forgot-email" {...slide} onSubmit={handleSendOtp} className="space-y-5">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    required
                    autoFocus
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    className="crm-input w-full rounded-2xl py-4 pl-12 pr-5 text-sm font-medium"
                    placeholder="Admin email address"
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full crm-btn-primary font-black py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <><Shield size={18} /> Continue</>}
                </button>
                <button type="button" onClick={resetForgotFlow}
                  className="w-full text-slate-500 hover:text-slate-800 text-sm font-bold py-2 flex items-center justify-center gap-1">
                  <ArrowLeft size={14} /> Back to login
                </button>
              </motion.form>
            )}

            {/* ── Forgot: enter OTP + new password ── */}
            {!twoFAStep && forgotStep === 'forgot-otp' && (
              <motion.form key="forgot-otp" {...slide} onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-xs text-teal-800 space-y-1">
                  <p className="font-bold flex items-center gap-1"><Shield size={14} /> Google Authenticator</p>
                  <p>Open your authenticator app and enter the current 6-digit code for <strong>Al Jaroshi CRM</strong>.</p>
                  {maskedEmail && <p className="text-teal-600">Account: {maskedEmail}</p>}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                    6-Digit Authenticator Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="crm-input w-full rounded-2xl py-4 px-5 text-center text-2xl tracking-[0.5em] font-bold"
                    placeholder="000000"
                  />
                </div>

                {/* New password */}
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="crm-input w-full rounded-2xl py-4 pl-12 pr-12 text-sm font-medium"
                    placeholder="New password (min 6 chars)"
                  />
                  <button type="button" onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                    {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Confirm password */}
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="crm-input w-full rounded-2xl py-4 pl-12 pr-5 text-sm font-medium"
                    placeholder="Confirm new password"
                  />
                </div>

                <button type="submit" disabled={loading || otpCode.length < 6}
                  className="w-full crm-btn-primary font-black py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle size={18} /> Reset Password</>}
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button type="button" onClick={() => setForgotStep('forgot-email')}
                    className="text-slate-500 hover:text-slate-800 text-sm font-bold flex items-center gap-1">
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button type="button" onClick={resetForgotFlow}
                    className="text-slate-400 hover:text-slate-700 text-xs font-bold">
                    Cancel
                  </button>
                </div>
              </motion.form>
            )}

            {/* ── Non-admin: contact admin ── */}
            {!twoFAStep && forgotStep === 'forgot-contact' && (
              <motion.div key="forgot-contact" {...slide} className="space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Your account (<strong>{forgotRole?.replace('_', ' ')}</strong>) password can only be reset by an administrator.
                </p>
                <p className="text-xs text-slate-500">
                  Ask your admin to reset it from <strong>Admin Panel → Staff Management → Forgot Password &amp; Resend</strong>.
                  They can share the new password via WhatsApp.
                </p>
                <button type="button" onClick={resetForgotFlow} className="w-full crm-btn-primary py-3 rounded-xl font-bold">
                  Back to Login
                </button>
              </motion.div>
            )}

            {/* ── Normal login ── */}
            {!twoFAStep && forgotStep === 'login' && (
              <motion.form key="login" {...slide} onSubmit={handleLogin} className="space-y-5">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="crm-input w-full rounded-2xl py-4 pl-12 pr-5 text-sm font-medium"
                    placeholder="Email or phone number"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="crm-input w-full rounded-2xl py-4 pl-12 pr-12 text-sm font-medium"
                    placeholder="Enter your password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full crm-btn-primary font-black py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <><LogIn size={18} /> Sign In</>}
                </button>
                <button type="button"
                  onClick={() => { setForgotStep('forgot-email'); setForgotIdentifier(email); }}
                  className="w-full text-center text-sm text-slate-500 hover:text-mint-600 font-bold py-2">
                  Forgot Password?
                </button>
              </motion.form>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
