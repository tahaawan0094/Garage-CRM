const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface CompanyContact {
  companyName: string;
  phone: string;
  whatsapp: string;
  email: string;
  instructions: string;
}

export interface LicenseStatus {
  status: 'UNREGISTERED' | 'ACTIVATION_REQUIRED' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'DEVICE_RELEASED';
  accessAllowed: boolean;
  license_type?: 'PERMANENT' | 'DATED';
  expires_at?: string | null;
  key_hint?: string | null;
  message?: string;
  contact?: CompanyContact;
}

export interface BusinessRegistration {
  businessId: string;
  businessName: string;
  businessType: string;
  ownerName: string;
  phone: string;
  email?: string;
  city: string;
}

export interface SystemStatusResponse {
  success: boolean;
  isSetupCompleted: boolean;
  isRegistered: boolean;
  deviceId?: string;
  registration?: BusinessRegistration;
  license: LicenseStatus;
}

export const licenseService = {
  async getStatus(): Promise<SystemStatusResponse> {
    try {
      const res = await fetch(`${API_BASE}/license/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.isRegistered && data.registration) {
          localStorage.setItem('garage_registration_cache', JSON.stringify(data.registration));
        } else {
          localStorage.removeItem('garage_registration_cache');
          localStorage.removeItem('garage_license_cache');
          localStorage.removeItem('garage_crm_user_session_v1');
        }
        if (data.license) {
          localStorage.setItem('garage_license_cache', JSON.stringify(data.license));
        }
        return data;
      }
    } catch (err: any) {
      console.warn('Backend status check failed, using fallback:', err.message);
    }

    // Fallback from localStorage only if cached
    const cachedReg = localStorage.getItem('garage_registration_cache');
    const cachedLicense = localStorage.getItem('garage_license_cache');
    if (cachedReg) {
      try {
        return {
          success: true,
          isSetupCompleted: true,
          isRegistered: true,
          registration: JSON.parse(cachedReg),
          license: cachedLicense
            ? JSON.parse(cachedLicense)
            : {
                status: 'ACTIVATION_REQUIRED',
                accessAllowed: false,
                message: 'Working offline with cached license.',
              },
        };
      } catch (_) {}
    }
    return {
      success: false,
      isSetupCompleted: false,
      isRegistered: false,
      license: {
        status: 'UNREGISTERED',
        accessAllowed: false,
        message: 'Could not connect to service.',
      },
    };
  },

  async register(formData: {
    businessName: string;
    ownerName: string;
    username: string;
    password: string;
    phone: string;
    email?: string;
    city: string;
  }): Promise<{ registration: BusinessRegistration; license: LicenseStatus }> {
    const res = await fetch(`${API_BASE}/license/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Registration failed.');
    }
    if (data.registration) {
      localStorage.setItem('garage_registration_cache', JSON.stringify(data.registration));
    }
    if (data.license) {
      localStorage.setItem('garage_license_cache', JSON.stringify(data.license));
    }
    return data;
  },

  async activate(key: string): Promise<SystemStatusResponse> {
    const res = await fetch(`${API_BASE}/license/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: key.trim().toUpperCase() }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Activation failed.');
    }
    if (data.license) {
      localStorage.setItem('garage_license_cache', JSON.stringify(data.license));
    }
    return data;
  },

  async refresh(): Promise<SystemStatusResponse> {
    const res = await fetch(`${API_BASE}/license/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Verification failed.');
    }
    if (data.license) {
      localStorage.setItem('garage_license_cache', JSON.stringify(data.license));
    }
    return data;
  },

  async reset(): Promise<any> {
    localStorage.removeItem('garage_registration_cache');
    localStorage.removeItem('garage_license_cache');
    localStorage.removeItem('garage_crm_user_session_v1');
    try {
      const res = await fetch(`${API_BASE}/license/reset`, { method: 'POST' });
      return await res.json();
    } catch (_) {
      return { success: true };
    }
  },
};

