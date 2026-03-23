'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Music, Play, Users, Sparkles, Settings, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleAdminAccess = () => {
    const code = prompt('Enter admin secret code:');
    if (code === process.env.NEXT_PUBLIC_ADMIN_SECRET_CODE) {
      router.push('/admin-control-panel');
    } else if (code) {
      alert('Invalid code!');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/custom-auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to log in');
      }

      router.push('/dashboard');
    } catch (error: any) {
      setError(error.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/custom-auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          username,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to sign up');
      }

      // Account created successfully, redirect to dashboard
      router.push('/dashboard');
    } catch (error: any) {
      setError(error.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900">
      {/* Hidden Admin Button */}
      <button
        onClick={handleAdminAccess}
        className="fixed top-4 right-4 z-50 w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-all opacity-30 hover:opacity-100"
        title="Admin"
      >
        <Settings className="w-4 h-4 text-white/50" />
      </button>

      {/* Animated background blobs — CSS-only for compositor performance */}
      <style>{`
        @keyframes blob-pulse-a {
          0%, 100% { transform: scale(1); opacity: 0.30; }
          50%        { transform: scale(1.18); opacity: 0.45; }
        }
        @keyframes blob-pulse-b {
          0%, 100% { transform: scale(1.15); opacity: 0.30; }
          50%        { transform: scale(1); opacity: 0.45; }
        }
        .blob-a { animation: blob-pulse-a 8s ease-in-out infinite; will-change: transform, opacity; }
        .blob-b { animation: blob-pulse-b 10s ease-in-out infinite; will-change: transform, opacity; }
      `}</style>
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="blob-a absolute -top-40 -right-40 w-96 h-96 bg-purple-500 rounded-full blur-3xl" />
        <div className="blob-b absolute -bottom-40 -left-40 w-96 h-96 bg-pink-500 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        {!showLogin ? (
          // Landing Page
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="flex items-center justify-center mb-8"
            >
              <svg className="w-32 h-32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="47" fill="url(#glowGrad)" opacity="0.6"/>
                <g>
                  <animateTransform
                    attributeName="transform"
                    attributeType="XML"
                    type="rotate"
                    from="0 50 50"
                    to="360 50 50"
                    dur="3s"
                    repeatCount="indefinite"
                  />
                  <circle cx="50" cy="50" r="45" fill="url(#vinylGrad)" stroke="url(#borderGrad)" strokeWidth="1.5"/>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#3a3a3a" strokeWidth="0.5" opacity="0.5"/>
                  <circle cx="50" cy="50" r="35" fill="none" stroke="#3a3a3a" strokeWidth="0.5" opacity="0.5"/>
                  <circle cx="50" cy="50" r="30" fill="none" stroke="#3a3a3a" strokeWidth="0.5" opacity="0.5"/>
                  <circle cx="50" cy="50" r="25" fill="none" stroke="#3a3a3a" strokeWidth="0.5" opacity="0.5"/>
                  <circle cx="50" cy="50" r="18" fill="url(#labelGrad)"/>

                  {/* Subtle rotating shine bar */}
                  <rect x="45" y="5" width="10" height="90" rx="5" fill="url(#shineGrad)" opacity="0.15"/>

                  <circle cx="50" cy="50" r="4" fill="#1a1a1a"/>
                </g>

                <defs>
                  <radialGradient id="glowGrad">
                    <stop offset="0%" stopColor="#A855F7" stopOpacity="0.3"/>
                    <stop offset="50%" stopColor="#EC4899" stopOpacity="0.2"/>
                    <stop offset="100%" stopColor="#FB923C" stopOpacity="0"/>
                  </radialGradient>
                  <radialGradient id="vinylGrad">
                    <stop offset="0%" stopColor="#4a4a4a"/>
                    <stop offset="70%" stopColor="#2a2a2a"/>
                    <stop offset="100%" stopColor="#1a1a1a"/>
                  </radialGradient>
                  <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#A855F7" stopOpacity="0.6"/>
                    <stop offset="50%" stopColor="#EC4899" stopOpacity="0.6"/>
                    <stop offset="100%" stopColor="#FB923C" stopOpacity="0.6"/>
                  </linearGradient>
                  <linearGradient id="labelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#A855F7"/>
                    <stop offset="50%" stopColor="#EC4899"/>
                    <stop offset="100%" stopColor="#FB923C"/>
                  </linearGradient>
                  <linearGradient id="shineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0"/>
                    <stop offset="50%" stopColor="#ffffff" stopOpacity="0.7"/>
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-6xl md:text-8xl font-bold mb-6"
              style={{
                background: 'linear-gradient(135deg, #A855F7, #EC4899, #FB923C)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                letterSpacing: '0.05em',
                textShadow: '2px 2px 0px rgba(168, 85, 247, 0.3), 4px 4px 0px rgba(236, 72, 153, 0.2), 6px 6px 0px rgba(251, 146, 60, 0.1)',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
              }}
            >
              BoxOfVibe
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xl md:text-2xl text-gray-300 mb-12"
            >
              Stream your favorite music, anywhere, anytime
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <button
                onClick={() => {
                  setShowLogin(true);
                  setIsSignup(false);
                }}
                className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-full hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-105"
              >
                Log In
              </button>
              <button
                onClick={() => {
                  setShowLogin(true);
                  setIsSignup(true);
                }}
                className="px-8 py-4 bg-white/10 backdrop-blur-lg text-white font-semibold rounded-full border-2 border-white/20 hover:bg-white/20 transition-all duration-300"
              >
                Sign Up Free
              </button>
            </motion.div>
          </motion.div>
        ) : (
          // Login/Signup Form
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md"
          >
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
              {/* Logo */}
              <div className="flex items-center justify-center mb-8">
                <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="47" fill="url(#glowGrad2)" opacity="0.6"/>
                  <g>
                    <animateTransform
                      attributeName="transform"
                      attributeType="XML"
                      type="rotate"
                      from="0 50 50"
                      to="360 50 50"
                      dur="3s"
                      repeatCount="indefinite"
                    />
                    <circle cx="50" cy="50" r="45" fill="url(#vinylGrad2)" stroke="url(#borderGrad2)" strokeWidth="1.5"/>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#3a3a3a" strokeWidth="0.5" opacity="0.5"/>
                    <circle cx="50" cy="50" r="35" fill="none" stroke="#3a3a3a" strokeWidth="0.5" opacity="0.5"/>
                    <circle cx="50" cy="50" r="30" fill="none" stroke="#3a3a3a" strokeWidth="0.5" opacity="0.5"/>
                    <circle cx="50" cy="50" r="25" fill="none" stroke="#3a3a3a" strokeWidth="0.5" opacity="0.5"/>
                    <circle cx="50" cy="50" r="18" fill="url(#labelGrad2)"/>

                    {/* Subtle rotating shine bar */}
                    <rect x="45" y="5" width="10" height="90" rx="5" fill="url(#shineGrad2)" opacity="0.15"/>

                    <circle cx="50" cy="50" r="4" fill="#1a1a1a"/>
                  </g>

                  <defs>
                    <radialGradient id="glowGrad2">
                      <stop offset="0%" stopColor="#A855F7" stopOpacity="0.3"/>
                      <stop offset="50%" stopColor="#EC4899" stopOpacity="0.2"/>
                      <stop offset="100%" stopColor="#FB923C" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="vinylGrad2">
                      <stop offset="0%" stopColor="#4a4a4a"/>
                      <stop offset="70%" stopColor="#2a2a2a"/>
                      <stop offset="100%" stopColor="#1a1a1a"/>
                    </radialGradient>
                    <linearGradient id="borderGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#A855F7" stopOpacity="0.6"/>
                      <stop offset="50%" stopColor="#EC4899" stopOpacity="0.6"/>
                      <stop offset="100%" stopColor="#FB923C" stopOpacity="0.6"/>
                    </linearGradient>
                    <linearGradient id="labelGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#A855F7"/>
                      <stop offset="50%" stopColor="#EC4899"/>
                      <stop offset="100%" stopColor="#FB923C"/>
                    </linearGradient>
                    <linearGradient id="shineGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0"/>
                      <stop offset="50%" stopColor="#ffffff" stopOpacity="0.7"/>
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <h2 className="text-3xl font-bold text-center mb-8" style={{
                background: 'linear-gradient(135deg, #A855F7, #EC4899, #FB923C)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                letterSpacing: '0.05em'
              }}>BoxOfVibe</h2>

              <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-4">
                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-xl px-4 py-3 text-red-200 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    placeholder="Enter your username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Loading...' : isSignup ? 'Sign Up' : 'Log In'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setIsSignup(!isSignup)}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  {isSignup
                    ? 'Already have an account? Log in'
                    : "Don't have an account? Sign up"}
                </button>
              </div>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowLogin(false)}
                  className="text-gray-400 hover:text-gray-300 text-sm transition-colors"
                >
                  ← Back to home
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
