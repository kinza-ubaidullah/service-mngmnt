import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Wrench, Sparkles, User, Mail, Phone, Lock, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { motion } from 'framer-motion';

import { setUser, logout, setCredentials } from '../store/slices/authSlice';
import { useDispatch } from 'react-redux';

const Register = () => {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [role, setRole] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    dispatch(logout()); // Auto-logout existing user
    const validate = async () => {
      if (!token) {
        toast.error('Invalid or missing invite link');
        navigate('/login');
        return;
      }
      try {
        const res = await api.get(`/users/invite/${token}`);
        setRole(res.data.role);
      } catch (error) {
        toast.error('This invite link is invalid or has expired');
        navigate('/login');
      } finally {
        setValidating(false);
      }
    };
    validate();
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/users/invite/register', {
        ...form,
        token
      });

      toast.success('Registration successful!');
      
      const { user, token: authToken } = response.data;
      if (user && authToken) {
        dispatch(setCredentials({ user, token: authToken }));
        const role = user.role;
        switch (role) {
          case 'ADMIN': navigate('/admin'); break;
          case 'CALL_CENTER': navigate('/callcenter'); break;
          case 'TECHNICIAN': navigate('/tech'); break;
          default: navigate('/');
        }
      } else {
        setSuccess(true);
      }
    } catch (error: any) {
      console.error('Registration Error:', error.response?.data);
      toast.error(error.response?.data?.message || 'Registration failed. Check if phone/email already exists.');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="text-indigo-500 animate-spin mb-4" size={40} />
        <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">Validating Invite Token...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 max-w-md w-full text-center shadow-2xl"
        >
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-emerald-400" />
          </div>
          <h2 className="text-3xl font-black text-white mb-2">Welcome Aboard!</h2>
          <p className="text-slate-400 mb-8 font-medium">Your account has been created successfully. You can now log in to access your dashboard.</p>
          <Link 
            to="/login" 
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
          >
            Go to Login <ArrowRight size={20} />
          </Link>
        </motion.div>
      </div>
    );
  }

  const roleName = (role || '').replace('_', ' ');

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[100px] rounded-full"></div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-xl z-10"
      >
        <div className="flex items-center justify-center gap-4 mb-10">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-2xl shadow-xl shadow-indigo-500/20">
            <Wrench size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight leading-none capitalize">Join as {roleName}</h1>
            <p className="text-indigo-400 font-bold text-xs tracking-[0.2em] uppercase mt-2">Secure Member Onboarding <Sparkles size={14} className="inline ml-1" /></p>
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-full border border-indigo-500/20 flex items-center justify-center">
              <User size={20} className="text-indigo-400" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group relative">
                <div className="absolute left-4 top-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <User size={18} />
                </div>
                <input 
                  required
                  type="text" 
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  className="w-full bg-slate-950 text-white pl-12 pr-4 py-4 rounded-2xl border border-white/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600" 
                  placeholder="Full Name" 
                />
              </div>

              <div className="group relative">
                <div className="absolute left-4 top-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Mail size={18} />
                </div>
                <input 
                  required
                  type="email" 
                  value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})}
                  className="w-full bg-slate-950 text-white pl-12 pr-4 py-4 rounded-2xl border border-white/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600" 
                  placeholder="Email Address" 
                />
              </div>

              <div className="group relative">
                <div className="absolute left-4 top-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Phone size={18} />
                </div>
                <input 
                  required
                  type="tel" 
                  value={form.phone}
                  onChange={(e) => setForm({...form, phone: e.target.value})}
                  className="w-full bg-slate-950 text-white pl-12 pr-4 py-4 rounded-2xl border border-white/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600" 
                  placeholder="Phone Number" 
                />
              </div>

              <div className="group relative">
                <div className="absolute left-4 top-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Lock size={18} />
                </div>
                <input 
                  required
                  type="password" 
                  value={form.password}
                  onChange={(e) => setForm({...form, password: e.target.value})}
                  className="w-full bg-slate-950 text-white pl-12 pr-4 py-4 rounded-2xl border border-white/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600" 
                  placeholder="Password" 
                />
              </div>

              <div className="group relative md:col-span-2">
                <div className="absolute left-4 top-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Lock size={18} />
                </div>
                <input 
                  required
                  type="password" 
                  value={form.confirmPassword}
                  onChange={(e) => setForm({...form, confirmPassword: e.target.value})}
                  className="w-full bg-slate-950 text-white pl-12 pr-4 py-4 rounded-2xl border border-white/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600" 
                  placeholder="Confirm Password" 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : (
                <>Complete Registration <ArrowRight size={24} /></>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-slate-500 text-sm font-medium">
            Already have an account? <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors font-bold">Log in here</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
