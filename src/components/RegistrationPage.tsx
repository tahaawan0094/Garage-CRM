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
  CarFront,
} from 'lucide-react';
import { licenseService, type BusinessRegistration } from '../services/licenseService';

interface RegistrationPageProps {
  onRegistered: (registration: BusinessRegistration) => void;
  onGoToLogin?: () => void;
}

export default function RegistrationPage({ onRegistered, onGoToLogin }: RegistrationPageProps) {
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
      // Clear ALL legacy and cached workshop data from localStorage for a 100% clean start
      Object.keys(localStorage).forEach((key) => {
        if (key !== 'garage_crm_zoom_level' && key !== 'garage_sidebar_locked_v3') {
          localStorage.removeItem(key);
        }
      });

      const res = await licenseService.register({
        businessName: formData.businessName.trim(),
        ownerName: formData.ownerName.trim(),
        username: formData.username.trim(),
        password: formData.password,
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        city: formData.city.trim(),
      });

      // Initialize clean tenant settings with the actual registered business info
      try {
        const initialSettings = {
          garageName: formData.businessName.trim(),
          facilitySubtitle: `${formData.city.trim() ? formData.city.trim() + ' ' : ''}Workshop Facility`,
          ownerName: formData.ownerName.trim(),
          ownerRole: "Garage Owner",
          phone: formData.phone.trim(),
          whatsapp: formData.phone.trim(),
          email: formData.email.trim(),
          crNumber: "",
          taxNumber: "",
          address: formData.city.trim(),
          city: formData.city.trim(),
          country: "",
          currency: "USD",
          operatingHours: "Mon – Sat: 8:00 AM – 8:00 PM",
          logoUrl: "",
          taxRate: 0,
          invoicePrefix: "INV-",
          workOrderPrefix: "WO-",
          quotationPrefix: "QT-",
          quotationValidityDays: 7,
          paymentTerms: "Due Upon Receipt",
          showLogoOnPrint: true,
          showSignatureLine: true,
          showTaxBreakdown: false,
          autoInvoiceOnApproval: true,
          invoiceFooterNotes: `Thank you for choosing ${formData.businessName.trim()}. All repairs carry workshop warranty.`,
          gatePassDisclaimer: "The vehicle has passed safety verification inspection and is authorized for release from workshop bays.",
          printerMode: "windows",
          paperSize: "80mm",
          autoPrint: true,
        };
        localStorage.setItem('garage_crm_settings_v1', JSON.stringify(initialSettings));
        window.dispatchEvent(new CustomEvent('garage-settings-updated', { detail: initialSettings }));
      } catch (_) {}

      onRegistered(res.registration);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Check network connection.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 h-full min-h-0 w-full bg-white font-sans text-slate-900 overflow-hidden">
      
      {/* Left Column - Dark Slate / Workshop Branding Area (50% on lg+, hidden on mobile) */}
      <div className="relative hidden lg:flex flex-col items-center justify-center overflow-hidden bg-[#0c1626] p-8 lg:p-12 text-white select-none h-full min-h-0">
        {/* Subtle Ambient Background Circles */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -left-16 -top-16 h-72 w-72 rounded-full border border-orange-400/40" />
          <div className="absolute -bottom-28 -right-20 h-96 w-96 rounded-full border border-orange-300/30" />
          <div className="absolute right-16 top-24 text-orange-300/20"><CarFront size={86} /></div>
          <div className="absolute bottom-20 left-16 text-orange-300/20"><Wrench size={100} /></div>
        </div>

        <div className="relative z-10 flex max-w-lg flex-col items-center text-center">
          
          {/* Brand Header */}
          <div className="mb-8 flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white overflow-hidden shadow-sm p-2">
              <Wrench size={24} className="text-[#f95932]" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-bold tracking-tight text-white leading-tight">Garage CRM Suite</h1>
              <p className="text-xs text-slate-400">Workshop Setup &amp; Onboarding</p>
            </div>
          </div>

          {/* Stepper Progress Indicator */}
          <div className="w-full max-w-sm mb-8 bg-[#14233c] border border-orange-400/20 rounded-2xl p-5 text-left shadow-xl">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#f95932] mb-3">Setup Progress</p>
            <div className="space-y-3.5">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#f95932] text-white flex items-center justify-center text-xs font-bold shadow-md shadow-orange-500/30">
                  1
                </span>
                <div>
                  <strong className="text-xs font-semibold text-white block">Register Workshop</strong>
                  <span className="text-[11px] text-slate-400">Owner account &amp; garage details</span>
                </div>
              </div>
              <div className="flex items-center gap-3 opacity-60">
                <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <div>
                  <strong className="text-xs font-semibold text-slate-200 block">Activate License</strong>
                  <span className="text-[11px] text-slate-400">Issue &amp; apply license key</span>
                </div>
              </div>
              <div className="flex items-center gap-3 opacity-60">
                <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <div>
                  <strong className="text-xs font-semibold text-slate-200 block">Sign In &amp; Launch</strong>
                  <span className="text-[11px] text-slate-400">Access workshop workspace</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-slate-300 text-sm max-w-sm leading-relaxed">
            Configure your workshop profile to unlock full point-of-sale billing, repair job cards, and inventory tracking.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
            <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60">Multi-Bay Ready</span>
            <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60">POS Billing</span>
            <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60">Inspection Quotes</span>
            <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-emerald-400">Atlas Cloud Ready</span>
          </div>
        </div>
      </div>

      {/* Right Column - Responsive Scrollable Form Panel (50% on lg+, 100% on mobile) */}
      <div className="w-full h-full min-h-0 flex flex-col justify-start items-center overflow-y-auto p-4 sm:p-8 lg:p-10 bg-white">
        <div className="w-full max-w-xl mx-auto py-6 sm:py-8">
          
          {/* Header */}
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#f95932] border border-orange-200/60 font-bold">
                  <Wrench size={20} />
                </div>
                <div>
                  <strong className="text-base font-bold text-slate-900 block leading-tight">Garage CRM</strong>
                  <span className="text-xs text-slate-500">Workshop Setup</span>
                </div>
              </div>
              {onGoToLogin && (
                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:border-[#f95932] hover:text-[#f95932] transition cursor-pointer"
                >
                  Sign In →
                </button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f95932]">
                Step 1 of 3 · Initial System Setup
              </p>
              {onGoToLogin && (
                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="hidden lg:inline-flex text-xs font-semibold text-slate-500 hover:text-[#f95932] transition cursor-pointer"
                >
                  Existing Workshop? Sign In →
                </button>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              Register Your Workshop
            </h2>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              Enter your garage details and master owner credentials to generate your official registration ID.
            </p>
          </div>

          {/* Prominent Multi-PC / Existing Workshop Cloud Login Banner */}
          {onGoToLogin && (
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#f95932] text-white flex items-center justify-center flex-shrink-0 font-bold shadow-sm">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <strong className="block text-sm font-bold text-slate-900">
                    Want to Access Your CRM from Another PC or Laptop?
                  </strong>
                  <span className="text-xs text-slate-600 block mt-0.5">
                    If your workshop is already registered, there is no need to register again. Simply sign in with your credentials on any computer.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onGoToLogin}
                className="px-5 py-2.5 text-xs font-bold text-white bg-[#f95932] hover:bg-[#ea4e28] rounded-xl shadow-md transition whitespace-nowrap cursor-pointer flex-shrink-0 flex items-center gap-1.5"
              >
                <span>Log In to Existing CRM</span>
                <span>→</span>
              </button>
            </div>
          )}

          {error && (
            <div className="p-4 mb-6 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Section 1: Workshop & Location */}
            <div>
              <div className="flex items-center gap-2 pb-2 mb-4 border-b border-slate-100">
                <Building size={16} className="text-[#f95932]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  1. Workshop &amp; Location Details
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
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

                <div className="sm:col-span-2">
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
              <div className="flex items-center gap-2 pb-2 mb-4 border-b border-slate-100">
                <User size={16} className="text-[#f95932]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  2. Master Owner Account
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Existing Registration ID (Optional - only for restoring an existing workshop)
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
            <div className="pt-2">
              <button
                type="submit"
                disabled={busy}
                className="w-full py-4 px-6 rounded-xl font-bold text-white bg-[#f95932] hover:bg-[#ea4e28] transition shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2.5 text-sm sm:text-base disabled:opacity-60 cursor-pointer active:scale-[0.99]"
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
              {onGoToLogin && (
                <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                  <p className="text-xs text-slate-500">
                    Already registered your workshop on another machine?{' '}
                    <button
                      type="button"
                      onClick={onGoToLogin}
                      className="font-bold text-[#f95932] hover:underline cursor-pointer"
                    >
                      Sign In to Your Existing Workshop →
                    </button>
                  </p>
                </div>
              )}
            </div>
          </form>

          <p className="text-[11px] text-slate-400 text-center uppercase font-bold tracking-widest mt-8">
            Garage CRM Suite · Cloud Workspace System
          </p>
        </div>
      </div>
    </div>
  );
}
