const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: 'owner' | 'manager' | 'cashier' | 'mechanic' | 'staff';
  allowedTabs: string[];
  phone?: string;
  email?: string;
  isActive?: boolean;
}

const SESSION_KEY = 'garage_crm_user_session_v1';

export const ALL_CRM_TABS = [
  'Dashboard',
  'POS Billing',
  'New Intake',
  'Work Orders',
  'Quotations',
  'Invoices',
  'Vehicles',
  'Customers',
  'Parts Inventory',
  'Mechanics',
  'Reports',
  'Settings',
];

export const authService = {
  getCurrentUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  },

  setCurrentUser(user: AuthUser | null) {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      window.dispatchEvent(new CustomEvent('garage-auth-changed', { detail: user }));
    } else {
      localStorage.removeItem(SESSION_KEY);
      window.dispatchEvent(new CustomEvent('garage-auth-changed', { detail: null }));
    }
  },

  async login(username: string, password: string): Promise<AuthUser> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Login failed.');
    }
    this.setCurrentUser(data.user);
    return data.user;
  },

  logout() {
    this.setCurrentUser(null);
  },

  async getUsers(): Promise<AuthUser[]> {
    const res = await fetch(`${API_BASE}/auth/users`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed fetching staff users.');
    return data.data || [];
  },

  async createUser(payload: {
    username: string;
    fullName: string;
    password: string;
    role: string;
    allowedTabs: string[];
    phone?: string;
    email?: string;
  }): Promise<AuthUser> {
    const res = await fetch(`${API_BASE}/auth/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed creating user.');
    return data.data;
  },

  async updateUser(
    id: string,
    payload: {
      fullName?: string;
      role?: string;
      allowedTabs?: string[];
      isActive?: boolean;
      password?: string;
      phone?: string;
      email?: string;
    }
  ): Promise<AuthUser> {
    const res = await fetch(`${API_BASE}/auth/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed updating user.');
    return data.data;
  },

  async deleteUser(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/auth/users/${id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed deleting user.');
  },
};

