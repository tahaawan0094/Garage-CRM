import { useState } from 'react';
import { KeyRound, Check, Copy, RefreshCw, Phone, Mail, MessageSquare, Wrench } from 'lucide-react';
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
    companyName: 'Vertexia',
    phone: '+974 5511 2222',
    whatsapp: '+97455112222',
    email: 'support@vertexia.tech',
    instructions: 'Contact the company that supplied your CRM. Share your Registration ID; the company will issue a key for your workshop and agreed license period.',
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
    <div className="min-h-screen w-full bg-[#f5f7f9] text-[#243247] font-sans flex flex-col justify-start">
      
      {/* Top Header Bar */}
      <header className="w-full bg-white border-b border-[#dce3e9] px-6 sm:px-12 py-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-200 text-[#f95932] flex items-center justify-center font-bold shadow-xs">
              <Wrench size={22} />
            </div>
            <div>
              <strong className="text-xl font-bold text-[#253347] block leading-tight">
                Auto Care &amp; Service Hub
              </strong>
              <span className="text-xs text-[#788697]">Workshop registration &amp; license activation</span>
            </div>
          </div>
          {onGoToLogin && license.accessAllowed && (
            <button
              onClick={onGoToLogin}
              className="text-xs font-semibold text-[#f95932] hover:underline cursor-pointer"
            >
              Sign in with existing account →
            </button>
          )}
        </div>
      </header>

      {/* 3 Steps Horizontal Bar */}
      <div className="w-full bg-white border-b border-[#dce3e9] px-6 sm:px-12 py-3.5 shadow-xs">
        <div className="max-w-6xl mx-auto grid grid-cols-3 gap-4 text-xs font-medium text-[#8692a0]">
          <div className="flex items-center gap-2 font-medium text-emerald-600">
            <Check size={14} />
            <span>1. Registered</span>
          </div>
          <div className="flex items-center gap-2 font-bold text-[#f95932]">
            <span>2. Activate license</span>
          </div>
          <div className="flex items-center gap-2">
            <span>3. Sign in</span>
          </div>
        </div>
      </div>

      {/* Main Full-Page Body Layout */}
      <main className="w-full max-w-6xl mx-auto px-6 sm:px-12 py-8 sm:py-10 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Main Activation Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-start gap-3.5 text-[#f95932]">
              <KeyRound size={28} className="mt-0.5 flex-shrink-0" />
              <div>
                <h1 className="text-2xl font-bold text-[#253347] m-0">
                  {isExpired ? 'Renew your Workshop license' : isSuspended ? 'Workshop license suspended' : 'Activate your Garage CRM'}
                </h1>
                <p className="text-xs text-[#6e7b8c] mt-1 leading-relaxed">
                  Enter the license key provided by {contact.companyName || 'your CRM company'}.
                </p>
              </div>
            </div>

            {/* Notice Alert */}
            <div
              className={`p-4 rounded-xl text-xs leading-relaxed ${
                license.accessAllowed
                  ? 'bg-[#f0fdf5] border border-[#bbe7cc] text-[#178146]'
                  : isSuspended
                  ? 'bg-[#fef2f2] border border-[#fecaca] text-[#991b1b]'
                  : 'bg-[#fffaf0] border border-[#f2dfb1] text-[#806328]'
              }`}
            >
              <strong className="block text-[11px] uppercase tracking-wider mb-1">
                {license.accessAllowed
                  ? 'License Active'
                  : isSuspended
                  ? 'Access Paused by Company'
                  : String(license.status || 'ACTIVATION_REQUIRED').replace(/_/g, ' ')}
              </strong>
              <p className="m-0 leading-relaxed">{license.message || 'A license key is required to activate and operate the system.'}</p>
              {isPermanent ? (
                <small className="block mt-1.5 font-semibold text-emerald-700">Permanent license · Company suspension controls apply</small>
              ) : license.expires_at ? (
                <small className="block mt-1.5 font-semibold">Valid until {new Date(license.expires_at).toLocaleDateString()}</small>
              ) : null}
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-[#fff3f2] border border-[#fecdca] text-[#b42318] text-xs">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="p-3.5 rounded-xl bg-[#f0fdf5] border border-[#bbe7cc] text-[#178146] text-xs">
                {successMsg}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleActivate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  License key
                </label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="MK-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
                  value={key}
                  onChange={e => setKey(e.target.value.toUpperCase())}
                  disabled={busy}
                  className="w-full px-4 py-3 bg-white border border-[#d5dde5] rounded-xl text-sm font-mono text-gray-900 outline-none focus:border-[#f95932] focus:ring-2 focus:ring-[#f95932]/15 transition"
                />
              </div>

              <button
                type="submit"
                disabled={busy || !key.trim()}
                className="w-full py-3.5 px-4 bg-[#f95932] hover:bg-[#e04a25] text-white font-bold rounded-xl text-sm transition shadow-md shadow-orange-500/20 disabled:opacity-60 cursor-pointer active:scale-[0.99]"
              >
                {busy ? 'Please wait...' : 'Activate & continue to sign in'}
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleVerify}
                disabled={busy}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#d5dde5] bg-white text-xs font-semibold text-[#596b80] hover:bg-gray-50 transition cursor-pointer shadow-2xs"
              >
                <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
                <span>Verify license / retry</span>
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
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-red-200 bg-red-50/50 text-xs font-medium text-red-600 hover:bg-red-50 transition cursor-pointer"
                >
                  <span>← Register different workshop / Reset</span>
                </button>
              )}
            </div>

            <p className="text-xs text-[#7c899a] leading-relaxed pt-3">
              Your license belongs to this workshop and its approved computers. After activation, sign in with your workshop account.
            </p>
          </div>

          {/* Details & Support Column */}
          <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-[#dce3e9] pt-8 lg:pt-0 lg:pl-10 space-y-6">
            
            {/* Registration ID Section */}
            <div className="pb-6 border-b border-[#dce3e9]">
              <span className="block text-xs font-semibold text-[#7a8798] uppercase tracking-wider">
                Registration ID
              </span>
              <div className="flex items-center gap-2 mt-2 bg-white p-3 rounded-xl border border-[#dce3e9] shadow-2xs">
                <code className="text-xs font-mono text-gray-800 break-all select-all flex-1 font-semibold">
                  {registration.businessId}
                </code>
                <button
                  type="button"
                  onClick={copyRegistrationId}
                  title="Copy Registration ID"
                  className="p-1.5 rounded-md text-[#54806a] hover:bg-emerald-50 transition flex items-center gap-1 text-xs cursor-pointer"
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span className="text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <small className="block text-xs text-[#7a8798] mt-2">
                {registration.businessName} {registration.city ? `· ${registration.city}` : ''}
              </small>
            </div>

            {/* Company Support Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#253347] m-0">Company support</h3>
              <p className="text-xs text-[#6e7b8c] leading-relaxed">
                {contact.instructions ||
                  'Contact the company that supplied your CRM. Share your Registration ID; the company will issue a key for your agreed license period.'}
              </p>

              <div className="space-y-2.5 pt-2">
                {cleanWhatsapp && (
                  <a
                    href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(whatsappText)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3.5 py-2.5 rounded-xl border border-emerald-200 transition w-full justify-center shadow-2xs"
                  >
                    <MessageSquare size={15} />
                    <span>Contact on WhatsApp</span>
                  </a>
                )}

                {cleanPhone && (
                  <a
                    href={`tel:${cleanPhone}`}
                    className="flex items-center gap-2 text-xs font-medium text-[#078c4a] hover:underline pt-1"
                  >
                    <Phone size={13} />
                    <span>{contact.phone}</span>
                  </a>
                )}

                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-2 text-xs font-medium text-[#078c4a] hover:underline"
                  >
                    <Mail size={13} />
                    <span>{contact.email}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full py-6 text-center text-xs text-[#788697] border-t border-[#dce3e9] bg-white mt-12">
        Auto Care &amp; Service Hub · Workshop License Activation Portal
      </footer>
    </div>
  );
}
