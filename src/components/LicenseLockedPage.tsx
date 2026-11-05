import { useState } from 'react';
import {
  Lock,
  KeyRound,
  Check,
  Copy,
  RefreshCw,
  Phone,
  Mail,
  MessageSquare,
  AlertTriangle,
  Building2,
  ShieldAlert,
  LogOut,
} from 'lucide-react';
import { licenseService, type BusinessRegistration, type LicenseStatus } from '../services/licenseService';

interface LicenseLockedPageProps {
  registration?: BusinessRegistration | null;
  license: LicenseStatus;
  deviceId?: string;
  onUnlocked: () => void;
  onLogout?: () => void;
  onResetToRegister?: () => void;
}

export default function LicenseLockedPage({
  registration,
  license: initialLicense,
  onUnlocked,
  onLogout,
}: LicenseLockedPageProps) {
  const [key, setKey] = useState('');
  const [license, setLicense] = useState<LicenseStatus>(initialLicense);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const contact = license.contact || {
    companyName: 'Vertexia Agency',
    phone: '+92 317 298 1931',
    whatsapp: '923172981931',
    email: 'support@vertexiaagency.com',
    instructions: 'Aapka software license period khatam ho chuka hai. License renew karwane ke liye Vertexia Agency helpline ya WhatsApp par apna Registration ID bheinjein.',
  };

  const businessId = registration?.businessId || 'N/A';
  const businessName = registration?.businessName || 'Garage Workshop';

  const copyRegistrationId = async () => {
    try {
      await navigator.clipboard.writeText(businessId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    } catch (_) {
      setError('Select and copy your Registration ID manually.');
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) {
      setError('Please enter a valid renewal license key.');
      return;
    }

    setBusy(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await licenseService.activate(key.trim());
      if (res.license?.accessAllowed) {
        setLicense(res.license);
        setSuccessMsg('License renewed successfully! Unlocking your workshop...');
        setTimeout(() => {
          onUnlocked();
        }, 1200);
      } else {
        setError(res.license?.message || 'Key accepted but license is not yet active. Contact agency.');
      }
    } catch (err: any) {
      setError(err.message || 'Renewal activation failed. Check the key and try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleRefreshOnline = async () => {
    setBusy(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await licenseService.refresh();
      if (res.license?.accessAllowed) {
        setLicense(res.license);
        setSuccessMsg('Active license verified from agency cloud! Unlocking...');
        setTimeout(() => {
          onUnlocked();
        }, 1200);
      } else {
        setLicense(res.license);
        setError(res.license?.message || 'Agency has not yet renewed this license key. Please contact support.');
      }
    } catch (err: any) {
      setError(err.message || 'Could not verify license status online.');
    } finally {
      setBusy(false);
    }
  };

  const expiryFormatted = license.expires_at
    ? new Date(license.expires_at).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Period Elapsed';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #fff7ed 100%)',
        color: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        overflowY: 'auto',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Background ambient warm decorative circles */}
      <div
        style={{
          position: 'absolute',
          top: '12%',
          right: '15%',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249, 115, 22, 0.08) 0%, rgba(255, 255, 255, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '12%',
          width: '420px',
          height: '420px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(234, 88, 12, 0.06) 0%, rgba(255, 255, 255, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '680px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08), 0 2px 10px rgba(234, 88, 12, 0.06)',
          overflow: 'hidden',
        }}
      >
        {/* Top Critical Alert Bar - CRM Orange Gradient */}
        <div
          style={{
            background: 'linear-gradient(90deg, #ea580c, #ff631c)',
            padding: '12px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={20} />
            <strong style={{ fontSize: '13px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              Software License Expired • Workshop Access Paused
            </strong>
          </div>
          <span
            style={{
              fontSize: '11px',
              padding: '3px 10px',
              borderRadius: '20px',
              background: 'rgba(0, 0, 0, 0.22)',
              fontWeight: 800,
              letterSpacing: '0.5px',
            }}
          >
            LOCKED
          </span>
        </div>

        <div style={{ padding: '28px 32px' }}>
          {/* Lock Icon & Title */}
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 14px',
                borderRadius: '50%',
                background: 'rgba(234, 88, 12, 0.1)',
                border: '2px solid rgba(234, 88, 12, 0.25)',
                display: 'grid',
                placeItems: 'center',
                color: '#ea580c',
              }}
            >
              <Lock size={30} />
            </div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
              Access Paused by Software Provider
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
              The software license period for <strong style={{ color: '#0f172a' }}>{businessName}</strong> ended on{' '}
              <span style={{ color: '#ea580c', fontWeight: 700 }}>{expiryFormatted}</span>. Workshop operations, POS, and job bookings are temporarily locked.
            </p>
          </div>

          {/* Client Registration Reference Card (For Agency Support) */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px 18px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Client Registration Reference
              </span>
              <button
                type="button"
                onClick={copyRegistrationId}
                style={{
                  background: copiedId ? '#15803d' : '#ea580c',
                  border: 0,
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'background 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                {copiedId ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedId ? 'Copied' : 'Copy ID'}</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <div>
                <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b' }}>Workshop Name:</span>
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>{businessName}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b' }}>Registration ID:</span>
                <code style={{ fontSize: '12px', color: '#ea580c', background: 'rgba(234, 88, 12, 0.08)', padding: '3px 7px', borderRadius: '4px', fontWeight: 700 }}>
                  {businessId}
                </code>
              </div>
              {license.key_hint && (
                <div>
                  <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b' }}>Last License Key:</span>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>...{license.key_hint}</span>
                </div>
              )}
            </div>
          </div>

          {/* Official Agency Contact Card */}
          <div
            style={{
              background: '#ffffff',
              border: '1.5px solid #fed7aa',
              borderRadius: '10px',
              padding: '16px 18px',
              marginBottom: '20px',
              boxShadow: '0 2px 8px rgba(234, 88, 12, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Building2 size={17} color="#ea580c" />
              <strong style={{ fontSize: '13px', color: '#ea580c' }}>
                {contact.companyName} Support &amp; Renewal Desk
              </strong>
            </div>

            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
              {contact.instructions || 'Share your Registration ID with Vertexia Agency to renew your software license key.'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: '#f8fafc',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    color: '#0f172a',
                    textDecoration: 'none',
                    fontSize: '11.5px',
                    fontWeight: 600,
                  }}
                >
                  <Phone size={14} color="#ea580c" />
                  <span>{contact.phone}</span>
                </a>
              )}

              {contact.whatsapp && (
                <a
                  href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}?text=Hello%20Vertexia%20Agency,%20I%20need%20to%20renew%20the%20license%20for%20my%20garage%20workshop.%20Registration%20ID:%20${encodeURIComponent(businessId)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: '#f8fafc',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    color: '#0f172a',
                    textDecoration: 'none',
                    fontSize: '11.5px',
                    fontWeight: 600,
                  }}
                >
                  <MessageSquare size={14} color="#16a34a" />
                  <span>WhatsApp Renewal Desk</span>
                </a>
              )}

              {contact.email && (
                <a
                  href={`mailto:${contact.email}?subject=Garage%20CRM%20License%20Renewal%20-%20${encodeURIComponent(businessName)}&body=Registration%20ID:%20${encodeURIComponent(businessId)}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: '#f8fafc',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    color: '#0f172a',
                    textDecoration: 'none',
                    fontSize: '11.5px',
                    fontWeight: 600,
                  }}
                >
                  <Mail size={14} color="#0284c7" />
                  <span>{contact.email}</span>
                </a>
              )}
            </div>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '12px',
                marginBottom: '16px',
              }}
            >
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                color: '#15803d',
                fontSize: '12px',
                marginBottom: '16px',
              }}
            >
              <Check size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Renewal Key Activation Form */}
          <form onSubmit={handleUnlock} style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Enter Renewed License Key to Unlock:
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                placeholder="e.g. MK-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
                disabled={busy}
                style={{
                  flex: '1 1 280px',
                  height: '42px',
                  padding: '0 12px',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  color: '#0f172a',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  letterSpacing: '1px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={busy || !key.trim()}
                style={{
                  height: '42px',
                  padding: '0 20px',
                  background: 'linear-gradient(110deg, #ff631c, #ea580c)',
                  border: 0,
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: busy || !key.trim() ? 'not-allowed' : 'pointer',
                  opacity: busy || !key.trim() ? 0.6 : 1,
                  boxShadow: '0 2px 8px rgba(234, 88, 12, 0.35)',
                }}
              >
                {busy ? <RefreshCw size={15} className="animate-spin" /> : <KeyRound size={15} />}
                <span>Activate &amp; Unlock</span>
              </button>
            </div>
          </form>

          {/* Secondary Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '14px',
              borderTop: '1px solid #e2e8f0',
              fontSize: '12px',
            }}
          >
            <button
              type="button"
              onClick={handleRefreshOnline}
              disabled={busy}
              style={{
                background: 'transparent',
                border: 0,
                color: '#ea580c',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontWeight: 700,
              }}
            >
              <RefreshCw size={13} className={busy ? 'animate-spin' : ''} />
              <span>Check License Status Online</span>
            </button>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                style={{
                  background: 'transparent',
                  border: 0,
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontWeight: 600,
                }}
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
