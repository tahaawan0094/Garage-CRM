/**
 * API Service Layer for Garage CRM System
 * Connects frontend directly to Express backend + MongoDB Atlas
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Standard HTTP Request helper
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.message || `Request failed with status ${response.status}`);
    }

    return json;
  } catch (error: any) {
    console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, error.message);
    throw error;
  }
}

/**
 * Helper to normalize MongoDB documents to have frontend `.id`
 */
function normalizeId<T extends Record<string, any>>(item: T): T {
  if (!item) return item;
  const id =
    item.customerId ||
    item.vehicleId ||
    item.workOrderId ||
    item.quotationId ||
    item.invoiceId ||
    item.partId ||
    item.mechanicId ||
    item.transactionId ||
    item._id ||
    item.id;
  return { ...item, id };
}

// ─── CUSTOMERS API ──────────────────────────────────────────────────────────
export const customersApi = {
  async getAll(params?: { search?: string; type?: string; status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.type && params.type !== 'All Customer Types') query.append('type', params.type);
    if (params?.status && params.status !== 'All Status') query.append('status', params.status);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const res = await request<{ success: boolean; data: any[]; pagination: any }>(`/customers?${query.toString()}`);
    return {
      ...res,
      data: res.data.map(normalizeId),
    };
  },

  async getById(id: string) {
    const res = await request<{ success: boolean; data: any }>(`/customers/${id}`);
    return normalizeId(res.data);
  },

  async create(data: any) {
    const res = await request<{ success: boolean; data: any }>(`/customers`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return normalizeId(res.data);
  },

  async update(id: string, data: any) {
    const res = await request<{ success: boolean; data: any }>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return normalizeId(res.data);
  },

  async delete(id: string) {
    return request<{ success: boolean; message: string }>(`/customers/${id}`, {
      method: 'DELETE',
    });
  },
};

// ─── VEHICLES API ───────────────────────────────────────────────────────────
export const vehiclesApi = {
  async getAll(params?: { search?: string; status?: string; type?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'All Status') query.append('status', params.status);
    if (params?.type && params.type !== 'All Vehicle Types') query.append('type', params.type);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const res = await request<{ success: boolean; data: any[]; pagination: any }>(`/vehicles?${query.toString()}`);
    return {
      ...res,
      data: res.data.map(normalizeId),
    };
  },

  async getById(id: string) {
    const res = await request<{ success: boolean; data: any }>(`/vehicles/${id}`);
    return normalizeId(res.data);
  },

  async getByCustomer(customerId: string) {
    const res = await request<{ success: boolean; data: any[] }>(`/vehicles/customer/${customerId}`);
    return res.data.map(normalizeId);
  },

  async create(data: any) {
    const res = await request<{ success: boolean; data: any }>(`/vehicles`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return normalizeId(res.data);
  },

  async update(id: string, data: any) {
    const res = await request<{ success: boolean; data: any }>(`/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return normalizeId(res.data);
  },

  async delete(id: string) {
    return request<{ success: boolean; message: string }>(`/vehicles/${id}`, {
      method: 'DELETE',
    });
  },
};

// ─── WORK ORDERS API ────────────────────────────────────────────────────────
export const workOrdersApi = {
  async getAll(params?: { search?: string; status?: string; mechanic?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'All') query.append('status', params.status);
    if (params?.mechanic) query.append('mechanic', params.mechanic);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const res = await request<{ success: boolean; data: any[]; pagination: any }>(`/work-orders?${query.toString()}`);
    return {
      ...res,
      data: res.data.map(normalizeId),
    };
  },

  async getById(id: string) {
    const res = await request<{ success: boolean; data: any }>(`/work-orders/${id}`);
    return normalizeId(res.data);
  },

  async create(data: any) {
    const res = await request<{ success: boolean; data: any }>(`/work-orders`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return normalizeId(res.data);
  },

  async update(id: string, data: any) {
    const res = await request<{ success: boolean; data: any }>(`/work-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return normalizeId(res.data);
  },

  async updateStatus(id: string, status: string) {
    const res = await request<{ success: boolean; data: any }>(`/work-orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return normalizeId(res.data);
  },

  async delete(id: string) {
    return request<{ success: boolean; message: string }>(`/work-orders/${id}`, {
      method: 'DELETE',
    });
  },

  async getNextNumber() {
    const res = await request<{ success: boolean; data: { nextId: string } }>(`/work-orders/next-number`);
    return res.data?.nextId;
  },
};

// ─── QUOTATIONS API ─────────────────────────────────────────────────────────
export const quotationsApi = {
  async getAll(params?: { search?: string; status?: string; advisor?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'All Status') query.append('status', params.status);
    if (params?.advisor && params.advisor !== 'All Service Advisors') query.append('advisor', params.advisor);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const res = await request<{ success: boolean; data: any[]; pagination: any }>(`/quotations?${query.toString()}`);
    return {
      ...res,
      data: res.data.map(normalizeId),
    };
  },

  async getById(id: string) {
    const res = await request<{ success: boolean; data: any }>(`/quotations/${id}`);
    return normalizeId(res.data);
  },

  async create(data: any) {
    const res = await request<{ success: boolean; data: any }>(`/quotations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return normalizeId(res.data);
  },

  async update(id: string, data: any) {
    const res = await request<{ success: boolean; data: any }>(`/quotations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return normalizeId(res.data);
  },

  async approve(id: string) {
    const res = await request<{ success: boolean; data: any }>(`/quotations/${id}/approve`, {
      method: 'PATCH',
    });
    return normalizeId(res.data);
  },

  async reject(id: string) {
    const res = await request<{ success: boolean; data: any }>(`/quotations/${id}/reject`, {
      method: 'PATCH',
    });
    return normalizeId(res.data);
  },

  async delete(id: string) {
    return request<{ success: boolean; message: string }>(`/quotations/${id}`, {
      method: 'DELETE',
    });
  },
};

// ─── INVOICES API ───────────────────────────────────────────────────────────
export const invoicesApi = {
  async getAll(params?: { search?: string; status?: string; advisor?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'All Status') query.append('status', params.status);
    if (params?.advisor) query.append('advisor', params.advisor);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const res = await request<{ success: boolean; data: any[]; pagination: any }>(`/invoices?${query.toString()}`);
    return {
      ...res,
      data: res.data.map(normalizeId),
    };
  },

  async getById(id: string) {
    const res = await request<{ success: boolean; data: any }>(`/invoices/${id}`);
    return normalizeId(res.data);
  },

  async create(data: any) {
    const res = await request<{ success: boolean; data: any }>(`/invoices`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return normalizeId(res.data);
  },

  async update(id: string, data: any) {
    const res = await request<{ success: boolean; data: any }>(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return normalizeId(res.data);
  },

  async markPaid(id: string, paymentMethod?: string) {
    const res = await request<{ success: boolean; data: any }>(`/invoices/${id}/pay`, {
      method: 'PATCH',
      body: JSON.stringify({ paymentMethod }),
    });
    return normalizeId(res.data);
  },

  async delete(id: string) {
    return request<{ success: boolean; message: string }>(`/invoices/${id}`, {
      method: 'DELETE',
    });
  },

  async getNextNumber() {
    const res = await request<{ success: boolean; data: { nextId: string } }>(`/invoices/next-number`);
    return res.data?.nextId;
  },
};

// ─── PARTS API ──────────────────────────────────────────────────────────────
export const partsApi = {
  async getAll(params?: { search?: string; category?: string; status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category && params.category !== 'All Categories') query.append('category', params.category);
    if (params?.status && params.status !== 'All') query.append('status', params.status);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const res = await request<{ success: boolean; data: any[]; pagination: any }>(`/parts?${query.toString()}`);
    return {
      ...res,
      data: res.data.map(normalizeId),
    };
  },

  async getById(id: string) {
    const res = await request<{ success: boolean; data: any }>(`/parts/${id}`);
    return normalizeId(res.data);
  },

  async create(data: any) {
    const res = await request<{ success: boolean; data: any }>(`/parts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return normalizeId(res.data);
  },

  async update(id: string, data: any) {
    const res = await request<{ success: boolean; data: any }>(`/parts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return normalizeId(res.data);
  },

  async adjustStock(id: string, adjustment: { type: string; quantity: number; reference?: string; notes?: string }) {
    const res = await request<{ success: boolean; data: any }>(`/parts/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify(adjustment),
    });
    return normalizeId(res.data);
  },

  async delete(id: string) {
    return request<{ success: boolean; message: string }>(`/parts/${id}`, {
      method: 'DELETE',
    });
  },
};

// ─── MECHANICS API ──────────────────────────────────────────────────────────
export const mechanicsApi = {
  async getAll(params?: { search?: string; role?: string; status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.role && params.role !== 'All Roles') query.append('role', params.role);
    if (params?.status && params.status !== 'All Status') query.append('status', params.status);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const res = await request<{ success: boolean; data: any[]; pagination: any }>(`/mechanics?${query.toString()}`);
    return {
      ...res,
      data: res.data.map(normalizeId),
    };
  },

  async getById(id: string) {
    const res = await request<{ success: boolean; data: any }>(`/mechanics/${id}`);
    return normalizeId(res.data);
  },

  async create(data: any) {
    const res = await request<{ success: boolean; data: any }>(`/mechanics`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return normalizeId(res.data);
  },

  async update(id: string, data: any) {
    const res = await request<{ success: boolean; data: any }>(`/mechanics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return normalizeId(res.data);
  },

  async updateStatus(id: string, status: string) {
    const res = await request<{ success: boolean; data: any }>(`/mechanics/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return normalizeId(res.data);
  },

  async delete(id: string) {
    return request<{ success: boolean; message: string }>(`/mechanics/${id}`, {
      method: 'DELETE',
    });
  },

  async recordSalary(mechanicId: string, salaryData: any) {
    const res = await request<{ success: boolean; data: any }>(`/mechanics/${mechanicId}/salary`, {
      method: 'POST',
      body: JSON.stringify(salaryData),
    });
    return res.data;
  },

  async getAllSalaries() {
    try {
      const res = await fetch(`${API_BASE_URL}/mechanics/salaries/all`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },
};

// ─── POS TRANSACTIONS API ───────────────────────────────────────────────────
export const transactionsApi = {
  async getAll(params?: { search?: string; status?: string; payment?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'All') query.append('status', params.status);
    if (params?.payment) query.append('payment', params.payment);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const res = await request<{ success: boolean; data: any[]; pagination: any }>(`/transactions?${query.toString()}`);
    return {
      ...res,
      data: res.data.map(normalizeId),
    };
  },

  async create(data: any) {
    const res = await request<{ success: boolean; data: any }>(`/transactions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return normalizeId(res.data);
  },

  async delete(id: string) {
    return request<{ success: boolean; message: string }>(`/transactions/${id}`, {
      method: 'DELETE',
    });
  },
};

// ─── REPORTS API ────────────────────────────────────────────────────────────
export const reportsApi = {
  async getDashboard() {
    const res = await request<{ success: boolean; data: any }>(`/reports/dashboard`);
    return res.data;
  },

  async getRevenue(from?: string, to?: string) {
    const query = new URLSearchParams();
    if (from) query.append('from', from);
    if (to) query.append('to', to);
    const res = await request<{ success: boolean; data: any }>(`/reports/revenue?${query.toString()}`);
    return res.data;
  },

  async getJobs() {
    const res = await request<{ success: boolean; data: any }>(`/reports/jobs`);
    return res.data;
  },

  async getParts() {
    const res = await request<{ success: boolean; data: any }>(`/reports/parts`);
    return res.data;
  },
};
