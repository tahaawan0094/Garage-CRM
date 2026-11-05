import { useState } from 'react';
import {
  KeyRound,
  Check,
  Copy,
  RefreshCw,
  Phone,
  Mail,
  MessageSquare,
  Wrench,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { licenseService, type BusinessRegistration, type LicenseStatus } from '../services/licenseService';

interface ActivationPageProps {
  registration: BusinessRegistration;
  license: LicenseStatus;
  onActivated: () => void;
  onGoToLogin?: () => void;
  onResetToRegister?: () => void;
}

export default function ActivationPage({
  registration,
  license: initialLicense,
  onActivated,
  onGoToLogin,
  onResetToRegister,
}: ActivationPageProps) {
  const [key, setKey] = useState('');
  const [license, setLicense] = useState<LicenseStatus>(initialLicense);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const contact = license.contact || {
    companyName: 'Vertexia Agency',
    phone: '+92 317 298 1931',
    whatsapp: '923172981931',
    email: 'support@vertexiaagency.com',
    instructions: 'Contact Vertexia Agency to obtain or renew your license key. Share your Registration ID below.',
  };

  const copyRegistrationId = async () => {
    try {
      await navigator.clipboard.writeText(registration.businessId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {
      setError('Select and copy your Registration ID below.');
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;

    setBusy(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await licenseService.activate(key);
      setLicense(res.license);
      if (res.license.accessAllowed) {
        setSuccessMsg('License activated successfully! Redirecting to sign in...');
        setTimeout(() => {
          onActivated();
        }, 1000);
      } else {
        setError(res.license.message || 'Key accepted, but access is not granted. Contact company.');
      }
    } catch (err: any) {
      setError(err.message || 'Activation failed. Please check the key and your connection.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    setBusy(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await licenseService.refresh();
      setLicense(res.license);
      if (res.license.accessAllowed) {
        setSuccessMsg('License verified successfully! Redirecting to sign in...');
        setTimeout(() => {
          onActivated();
        }, 1000);
      } else {
        setError(res.license.message || 'A license key is required. Contact company.');
      }
    } catch (_) {
      setError('Verification failed. Check your internet connection.');
    } finally {
      setBusy(false);
    }
  };

  const cleanWhatsapp = String(contact.whatsapp || '').replace(/[^0-9]/g, '');
  const cleanPhone = String(contact.phone || '').replace(/[^+0-9]/g, '');
  const whatsappText = `Hello ${contact.companyName}, please provide a Garage CRM license for ${registration.businessName}. Registration ID: ${registration.businessId}`;

  const isSuspended = license.status === 'SUSPENDED';
  const isExpired = license.status === 'EXPIRED';
  const isPermanent = license.license_type === 'PERMANENT';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 h-full min-h-0 w-full bg-white font-sans text-slate-900 overflow-hidden">
      
      {/* Left Column - Dark Slate / Support Area (50% on lg+, hidden on mobile) */}
      <div className="relative hidden lg:flex flex-col items-center justify-center overflow-hidden bg-[#0c1626] p-8 lg:p-12 text-white select-none h-full min-h-0">
        {/* Subtle Ambient Background Wireframe Circles */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -left-16 -top-16 h-72 w-72 rounded-full border border-orange-400/40" />
          <div className="absolute -bottom-28 -right-20 h-96 w-96 rounded-full border border-orange-300/30" />
          <div className="absolute right-16 top-24 text-orange-300/20"><KeyRound size={86} /></div>
          <div className="absolute bottom-20 left-16 text-orange-300/20"><ShieldCheck size={100} /></div>
        </div>

        <div className="relative z-10 flex max-w-lg flex-col items-center text-center">
          
          {/* Logo & Brand Header */}
          <div className="mb-8 flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white overflow-hidden shadow-sm p-2">
              <Wrench size={24} className="text-[#f95932]" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-bold tracking-tight text-white leading-tight">Garage CRM Suite</h1>
              <p className="text-xs text-slate-400">License Key &amp; System Activation</p>
            </div>
          </div>

          {/* Stepper Progress Indicator */}
          <div className="w-full max-w-sm mb-6 bg-[#14233c] border border-orange-400/20 rounded-2xl p-5 text-left shadow-xl">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#f95932] mb-3">Setup Progress</p>
            <div className="space-y-3.5">
              <div className="flex items-center gap-3 text-emerald-400">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-xs font-bold">
                  <Check size={13} strokeWidth={2.8} />
                </span>
                <div>
                  <strong className="text-xs font-semibold block text-emerald-300">1. Workshop Registered</strong>
                  <span className="text-[11px] text-slate-400">{registration.businessName}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#f95932] text-white flex items-center justify-center text-xs font-bold shadow-md shadow-orange-500/30">
                  2
                </span>
                <div>
                  <strong className="text-xs font-semibold text-white block">2. Activate License Key</strong>
                  <span className="text-[11px] text-slate-400">Apply company authorization key</span>
                </div>
              </div>
              <div className="flex items-center gap-3 opacity-60">
                <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <div>
                  <strong className="text-xs font-semibold text-slate-200 block">3. Workshop Sign In</strong>
                  <span className="text-[11px] text-slate-400">Access dashboard &amp; bays</span>
                </div>
              </div>
            </div>
          </div>

          {/* Support Information Card */}
          <div className="w-full max-w-sm bg-[#111e33] border border-slate-700/60 rounded-2xl p-5 text-left">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-2">
              <Phone size={14} className="text-[#f95932]" />
              Need a License Key?
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Contact <strong className="text-white">{contact.companyName || 'your CRM provider'}</strong> with your Registration ID to obtain or renew your license key.
            </p>

            <div className="space-y-2">
              {cleanWhatsapp && (
                <a
                  href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(whatsappText)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-400 hover:text-white bg-emerald-950/50 hover:bg-emerald-600/80 px-3.5 py-2.5 rounded-xl border border-emerald-500/30 transition w-full"
                >
                  <MessageSquare size={14} />
                  <span>Contact on WhatsApp</span>
                </a>
              )}

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                {cleanPhone && (
                  <a href={`tel:${cleanPhone}`} className="hover:text-white transition flex items-center gap-1.5">
                    <Phone size={12} className="text-slate-400" />
                    <span>{contact.phone}</span>
                  </a>
                )}
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="hover:text-white transition flex items-center gap-1.5">
                    <Mail size={12} className="text-slate-400" />
                    <span>{contact.email}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Responsive Scrollable Form Panel (50% on lg+, 100% on mobile) */}
      <div className="w-full h-full min-h-0 flex flex-col justify-center items-center overflow-y-auto p-6 sm:p-10 lg:p-12 bg-white">
        <div className="w-full max-w-lg mx-auto my-auto py-8">
          
          {/* Header */}
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#f95932] border border-orange-200/60 font-bold">
                  <Wrench size={20} />
                </div>
                <div>
                  <strong className="text-base font-bold text-slate-900 block leading-tight">Garage CRM</strong>
                  <span className="text-xs text-slate-500">License Activation</span>
                </div>
              </div>
              {onGoToLogin && license.accessAllowed && (
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
                Step 2 of 3 · License Verification
              </p>
              {onGoToLogin && license.accessAllowed && (
                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="hidden lg:inline-flex text-xs font-semibold text-slate-500 hover:text-[#f95932] transition cursor-pointer"
                >
                  Sign in with existing account →
                </button>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              {isExpired ? 'Renew Workshop License' : isSuspended ? 'Workshop License Suspended' : 'Activate Your Garage CRM'}
            </h2>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              Enter your official license key to activate system features and start managing workshop operations.
            </p>
          </div>

          {/* Status Banner */}
          <div
            className={`p-4 rounded-xl text-xs leading-relaxed mb-5 ${
              license.accessAllowed
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : isSuspended
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-amber-50 border border-amber-200 text-amber-900'
            }`}
          >
            <strong className="block text-[11px] font-bold uppercase tracking-wider mb-1">
              {license.accessAllowed
                ? '✓ License Active'
                : isSuspended
                ? '⚠ Access Paused by Company'
                : String(license.status || 'ACTIVATION_REQUIRED').replace(/_/g, ' ')}
            </strong>
            <p className="m-0 leading-relaxed">{license.message || 'A valid license key is required to activate and operate the system.'}</p>
            {isPermanent ? (
              <small className="block mt-1.5 font-semibold text-emerald-700">Permanent License · Company authorization active</small>
            ) : license.expires_at ? (
              <small className="block mt-1.5 font-semibold">Valid until {new Date(license.expires_at).toLocaleDateString()}</small>
            ) : null}
          </div>

          {/* Registration ID Box with Copy Button */}
          <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Your Workshop Registration ID
              </span>
              <button
                type="button"
                onClick={copyRegistrationId}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#f95932] hover:text-[#ea4e28] transition cursor-pointer"
              >
                {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy ID'}</span>
              </button>
            </div>
            <code className="block text-xs sm:text-sm font-mono font-bold text-slate-900 bg-white p-2.5 rounded-lg border border-slate-200 select-all break-all">
              {registration.businessId}
            </code>
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 mt-2 gap-1">
              <span>{registration.businessName} {registration.city ? `· ${registration.city}` : ''}</span>
              {registration.databaseName && (
                <span className="font-mono text-[10px] bg-slate-200/70 px-1.5 py-0.5 rounded text-slate-700 font-bold">
                  DB: {registration.databaseName}
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3.5 mb-5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 mb-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* License Form */}
          <form onSubmit={handleActivate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                License Key
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  type="text"
                  required
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="MK-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
                  value={key}
                  onChange={e => setKey(e.target.value.toUpperCase())}
                  disabled={busy}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200/90 rounded-xl text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#f95932] focus:ring-4 focus:ring-orange-500/10 outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy || !key.trim()}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-[#f95932] hover:bg-[#ea4e28] transition shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer active:scale-[0.99]"
            >
              <ShieldCheck size={17} />
              <span>{busy ? 'Activating License...' : 'Activate & Continue to Sign In'}</span>
            </button>
          </form>

          {/* Secondary Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={handleVerify}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              <RefreshCw size={13} className={busy ? 'animate-spin' : ''} />
              <span>Verify / Retry</span>
            </button>

            {onResetToRegister && (
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm('Do you want to reset and start a fresh workshop registration?')) {
                    await licenseService.reset();
                    onResetToRegister();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-red-500 transition cursor-pointer"
                title="Wipe registration and start from step 1"
              >
                <RotateCcw size={12} />
                <span>Reset &amp; Register Again</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-400 text-center uppercase font-bold tracking-widest mt-8">
            Auto Care &amp; Service Hub · Workshop System
          </p>
        </div>
      </div>
    </div>
  );
}
