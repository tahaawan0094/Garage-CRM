import React, { useState } from 'react';
import {
  Wrench,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  KeyRound,
  ClipboardList,
  CarFront,
  RotateCcw,
} from 'lucide-react';
import { authService, type AuthUser } from '../services/authService';
import { licenseService } from '../services/licenseService';

interface LoginPageProps {
  garageName?: string;
  garageLogo?: string;
  onLogin: (user: AuthUser) => void;
  onOpenActivation?: () => void;
  onResetToRegister?: () => void;
}

export default function LoginPage({
  garageName = 'Auto Care & Service Hub',
  garageLogo,
  onLogin,
  onOpenActivation,
  onResetToRegister,
}: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setBusy(true);
    setError('');

    try {
      const user = await authService.login(username.trim(), password);
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Do you want to reset and start a fresh workshop registration?')) {
      await licenseService.reset();
      if (onResetToRegister) {
        onResetToRegister();
      } else {
        window.location.reload();
      }
    }
  };

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-white font-sans text-slate-900">
      
      {/* CSS Keyframes for Handcrafted Smooth SVG Floating Animation (NOT AI-generated) */}
      <style>{`
        @keyframes garageFloat1 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(2deg); }
        }
        @keyframes garageFloat2 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(12px) rotate(-2deg); }
        }
        @keyframes garageShieldPulse {
          0%, 100% { transform: scale(1); opacity: 0.95; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        .anim-float-1 {
          animation: garageFloat1 4s ease-in-out infinite;
        }
        .anim-float-2 {
          animation: garageFloat2 4.6s ease-in-out infinite;
        }
        .anim-pulse-shield {
          animation: garageShieldPulse 3s ease-in-out infinite;
        }
      `}</style>

      {/* Left Column - Dark Slate / Workshop Branding Area */}
      <div className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-[#0c1626] p-12 lg:flex text-white select-none">
        {/* Subtle Ambient Background Wireframe Circles */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -left-16 -top-16 h-72 w-72 rounded-full border border-orange-400/40" />
          <div className="absolute -bottom-28 -right-20 h-96 w-96 rounded-full border border-orange-300/30" />
          <div className="absolute right-16 top-24 text-orange-300/20"><CarFront size={86} /></div>
          <div className="absolute bottom-20 left-16 text-orange-300/20"><Wrench size={100} /></div>
        </div>

        <div className="relative z-10 flex max-w-lg flex-col items-center text-center">
          
          {/* Logo & Brand Header */}
          <div className="mb-10 flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white overflow-hidden shadow-sm p-2">
              {garageLogo ? (
                <img src={garageLogo} alt={garageName} className="h-full w-full object-contain" />
              ) : (
                <Wrench size={24} className="text-[#f95932]" />
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{garageName}</h1>
          </div>

          {/* Handcrafted Isometric Composition with Smooth Animated Icons */}
          <div className="relative h-72 w-96 mb-6">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative scale-95">
                
                {/* 3D Base Platform */}
                <div className="h-32 w-64 rotate-12 rounded-2xl border border-orange-400/20 bg-[#14233c] shadow-2xl"></div>

                {/* Hero Centerpiece: Wrench floating above platform */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[120%] drop-shadow-[0_15px_30px_rgba(249,89,50,0.35)]">
                  <Wrench size={110} className="text-[#f95932]" />
                </div>

                {/* Floating Element 1 (Top right: Work Orders & Inspection) */}
                <div className="absolute top-0 right-0 transform -translate-y-16 translate-x-10 anim-float-1">
                  <div className="rounded-xl bg-white p-3.5 shadow-xl border border-slate-100 flex items-center justify-center">
                    <ClipboardList size={24} className="text-[#f95932]" />
                  </div>
                </div>

                {/* Floating Element 2 (Bottom left: Vehicle Intake) */}
                <div className="absolute bottom-0 left-0 transform translate-y-10 -translate-x-10 anim-float-2">
                  <div className="rounded-xl bg-white p-3.5 shadow-xl border border-slate-100 flex items-center justify-center">
                    <CarFront size={24} className="text-[#f95932]" />
                  </div>
                </div>

                {/* Floating Element 3 (Left: Licensed Security Shield) */}
                <div className="absolute top-1/2 left-0 transform -translate-x-16 -translate-y-8 anim-pulse-shield">
                  <div className="rounded-xl border border-orange-300/15 bg-[#172b49] p-3.5 shadow-lg flex items-center justify-center">
                    <ShieldCheck size={28} className="text-emerald-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-slate-300 text-sm max-w-sm leading-relaxed">
            Multi-bay vehicle intake, repair work orders, parts inventory management &amp; counter point of sale.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
            <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60">Bays 01–12</span>
            <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60">POS Billing</span>
            <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60">Job Cards</span>
            <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-emerald-400">Offline &amp; Cloud Ready</span>
          </div>
        </div>
      </div>

      {/* Right Column - Direct Full Page Form (NO CARD, NO BOX BORDER, NO SHADOW BOX) */}
      <div className="flex w-full items-center justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-20 bg-white">
        <div className="w-full max-w-md">
          
          <div className="mb-8">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#f95932] lg:hidden">
              <Wrench size={22} />
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#f95932]">
              Secure Workshop Access
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Welcome back</h2>
            <p className="mt-2 text-sm text-slate-500">Sign in to manage your workshop bays &amp; billing.</p>
          </div>

          {error && (
            <div className="p-3.5 mb-6 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  type="text"
                  name="username"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Username (e.g. admin or staff)"
                  className="w-full rounded-xl border border-slate-200/90 bg-slate-50/70 pl-10 pr-4 py-3.5 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#f95932] focus:bg-white focus:ring-4 focus:ring-orange-500/10 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-xl border border-slate-200/90 bg-slate-50/70 pl-10 pr-11 py-3.5 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#f95932] focus:bg-white focus:ring-4 focus:ring-orange-500/10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#f95932] border-slate-300 focus:ring-0 cursor-pointer"
                />
                <span>Remember this session</span>
              </label>

              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <ShieldCheck size={14} />
                <span>Licensed System</span>
              </span>
            </div>

            <button
              type="submit"
              disabled={busy || !username.trim() || !password}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-[#f95932] hover:bg-[#ea4e28] transition shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer active:scale-[0.99] mt-2"
            >
              {busy ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <LogIn size={17} />
                  <span>Sign In to Garage CRM</span>
                </>
              )}
            </button>

            <div className="flex flex-col items-center gap-2 pt-3">
              {onOpenActivation && (
                <button
                  type="button"
                  onClick={onOpenActivation}
                  className="text-xs text-slate-400 hover:text-[#f95932] transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <KeyRound size={13} />
                  <span>View License Details / Renew Key</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-red-500 transition inline-flex items-center gap-1.5 cursor-pointer mt-1"
                title="Wipe current registration cache and register a fresh workshop"
              >
                <RotateCcw size={12} />
                <span>Register a different workshop / Reset</span>
              </button>
            </div>
          </form>

          <p className="text-[11px] text-slate-400 text-center uppercase font-bold tracking-widest mt-10">
            Auto Care &amp; Service Hub · Workshop System
          </p>
        </div>
      </div>
    </div>
  );
}
