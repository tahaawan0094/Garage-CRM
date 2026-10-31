import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  Lock,
  Eye,
  EyeOff,
  Wrench,
  ArrowRight,
} from 'lucide-react';
import { licenseService, type BusinessRegistration } from '../services/licenseService';

interface RegistrationPageProps {
  onRegistered: (registration: BusinessRegistration) => void;
}

export default function RegistrationPage({ onRegistered }: RegistrationPageProps) {
  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    username: '',
    password: '',
    confirmPassword: '',
    phone: '',
    email: '',
    city: '',
    existingRegistrationId: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please recheck.');
      return;
    }

    if (formData.password.length < 4) {
      setError('Password should be at least 4 characters long.');
      return;
    }

    setBusy(true);
    try {
      const res = await licenseService.register({
        businessName: formData.businessName.trim(),
        ownerName: formData.ownerName.trim(),
        username: formData.username.trim(),
        password: formData.password,
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        city: formData.city.trim(),
      });

      onRegistered(res.registration);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Check network connection.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white text-slate-800 font-sans flex flex-col justify-start">
      {/* Top Header Bar */}
      <header className="w-full bg-white border-b border-slate-100 px-6 sm:px-12 py-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200/60 text-[#f95932] flex items-center justify-center font-bold">
              <Wrench size={20} />
            </div>
            <div>
              <strong className="text-lg font-bold text-slate-900 block leading-tight">
                Auto Care &amp; Service Hub
              </strong>
              <span className="text-xs text-slate-500">Workshop Registration &amp; Setup</span>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-orange-50 text-[#f95932] border border-orange-200/60 w-fit">
            First-Time Installation Setup
          </span>
        </div>
      </header>

      {/* 3 Steps Minimal Stepper */}
      <div className="w-full bg-slate-50/70 border-b border-slate-100 px-6 sm:px-12 py-3">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 text-xs font-medium text-slate-400">
          <div className="flex items-center gap-2 font-bold text-[#f95932]">
            <span className="w-5 h-5 rounded-full bg-[#f95932] text-white flex items-center justify-center text-[10px] font-bold">
              1
            </span>
            <span>Register Workshop</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">
              2
            </span>
            <span>Activate License</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">
              3
            </span>
            <span>Sign In</span>
          </div>
        </div>
      </div>

      {/* Main Full-Page Form - Seamless Canvas (NO CARD, NO BOX SHADOW) */}
      <main className="w-full max-w-4xl mx-auto px-6 py-10 flex-1">
        {/* Intro */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-[#f95932] mb-1.5">
            Initial System Setup
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Register Your Workshop
          </h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Enter your garage details and master owner credentials. Your installation will register with your Company Licensing Dashboard to issue your official activation key.
          </p>
        </div>

        {error && (
          <div className="p-4 mb-6 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Section 1: Workshop & Location */}
          <div>
            <div className="flex items-center gap-2 pb-2.5 mb-5 border-b border-slate-100">
              <Building size={17} className="text-[#f95932]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                1. Workshop &amp; Location Details
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Garage / Business Name <span className="text-[#f95932]">*</span>
                </label>
                <div className="relative">
                  <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    type="text"
                    name="businessName"
                    required
                    placeholder="e.g. Al-Noor Auto Care & Service Hub"
                    value={formData.businessName}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200/90 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#f95932] focus:ring-4 focus:ring-orange-500/10 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  City / Location <span className="text-[#f95932]">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    type="text"
                    name="city"
                    required
                    placeholder="e.g. Doha, Qatar"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200/90 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#f95932] focus:ring-4 focus:ring-orange-500/10 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Phone / WhatsApp <span className="text-[#f95932]">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="e.g. +974 5511 2222"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200/90 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#f95932] focus:ring-4 focus:ring-orange-500/10 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Official Email (Optional)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    type="email"
                    name="email"
                    placeholder="service@autocare.qa"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200/90 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#f95932] focus:ring-4 focus:ring-orange-500/10 outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Master Owner Account */}
          <div>
            <div className="flex items-center gap-2 pb-2.5 mb-5 border-b border-slate-100">
              <User size={17} className="text-[#f95932]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                2. Master Owner Account
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Owner Full Name <span className="text-[#f95932]">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    type="text"
                    name="ownerName"
                    required
                    placeholder="e.g. Sheikh Ahmed"
                    value={formData.ownerName}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200/90 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#f95932] focus:ring-4 focus:ring-orange-500/10 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Owner Username <span className="text-[#f95932]">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    type="text"
                    name="username"
                    required
                    placeholder="e.g. admin"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200/90 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#f95932] focus:ring-4 focus:ring-orange-500/10 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Master Password <span className="text-[#f95932]">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-11 py-3 bg-slate-50/70 border border-slate-200/90 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#f95932] focus:ring-4 focus:ring-orange-500/10 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Confirm Password <span className="text-[#f95932]">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    required
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200/90 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#f95932] focus:ring-4 focus:ring-orange-500/10 outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Optional Migration ID */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Existing Registration ID (Optional - only for migrating an existing workshop installation)
            </label>
            <input
              name="existingRegistrationId"
              value={formData.existingRegistrationId}
              onChange={handleChange}
              maxLength={100}
              className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:bg-white focus:border-[#f95932]"
              placeholder="Leave blank for a fresh workshop installation"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={busy}
              className="w-full py-4 px-6 rounded-xl font-bold text-white bg-[#f95932] hover:bg-[#ea4e28] transition shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2.5 text-base disabled:opacity-60 cursor-pointer active:scale-[0.99]"
            >
              {busy ? (
                <span>Registering Workshop...</span>
              ) : (
                <>
                  <ShieldCheck size={20} />
                  <span>Register Workshop &amp; Proceed to Activation</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
            <p className="text-xs text-slate-400 text-center mt-3">
              Your workshop details will automatically appear in your company dashboard at{' '}
              <span className="font-semibold text-slate-600">medkit-pos.web.app</span> for activation key issuance.
            </p>
          </div>
        </form>
      </main>

      <footer className="w-full py-6 text-center text-xs text-slate-400 border-t border-slate-100 bg-white">
        Auto Care &amp; Service Hub · Workshop CRM System
      </footer>
    </div>
  );
}
