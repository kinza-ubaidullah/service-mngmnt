import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { LogIn, User, Lock, Loader2, Sparkles, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { setCredentials } from '../store/slices/authSlice';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent double submission
    
    setLoading(true);
    toast.dismiss(); // Clear existing toasts

    try {
      console.log('Attempting login for:', email);
      const response = await api.post('/auth/login', { email, password });
      console.log('Login API Full Response:', response.data);
      
      const { user, token } = response.data;

      if (!user || !user.role) {
        console.error('User or Role missing in response:', { user });
        throw new Error('Invalid response from server: Missing user role');
      }

      // Update Redux state and localStorage
      dispatch(setCredentials({ user, token }));

      toast.success('Login Successful!');

      // Delay navigation slightly to ensure state is committed
      setTimeout(() => {
        const role = user.role;
        console.log('Login successful, navigating for role:', role);
        
        switch (role) {
          case 'ADMIN': navigate('/admin'); break;
          case 'CALL_CENTER': navigate('/callcenter'); break;
          case 'TECHNICIAN': navigate('/tech'); break;
          case 'WORKSHOP_MANAGER': navigate('/workshop'); break;
          default: 
            console.error('Unexpected user role after login:', role);
            toast.error('Access denied: Unknown role');
            navigate('/login');
        }
      }, 100);
      
    } catch (error: any) {
      console.error('Login error details:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden">
          <div className="p-8 text-center border-b border-white/5 bg-gradient-to-br from-indigo-500/10 to-transparent">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/20 rotate-3">
              <LogIn size={32} className="text-white -rotate-3" />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              ServiceOS <Sparkles size={20} className="text-indigo-400" />
            </h2>
            <p className="text-slate-400 mt-2 font-medium">Enterprise Field Management</p>
          </div>

          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="group relative">
                  <label className="block text-xs font-bold text-slate-500 mb-2 pl-1 uppercase tracking-wider">Email or Phone</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                      <User size={18} />
                    </div>
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950/50 text-white pl-12 pr-4 py-3 rounded-xl border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all duration-300"
                      placeholder="Enter email or phone"
                    />
                  </div>
                </div>

                <div className="group relative">
                  <label className="block text-xs font-bold text-slate-500 mb-2 pl-1 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950/50 text-white pl-12 pr-12 py-3 rounded-xl border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all duration-300"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-indigo-400 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none border border-indigo-400/20"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
                {loading ? 'Authenticating...' : 'Sign In'}
              </motion.button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
