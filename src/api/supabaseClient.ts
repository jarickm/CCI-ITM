import { 
  Asset, 
  OnboardingRecord, 
  OffboardingRecord, 
  RequestRecord, 
  BorrowingRecord, 
  PreventiveMaintenanceRecord, 
  LiabilityRecord, 
  ActivityLog, 
  SystemSettings, 
  DropdownOptionsConfig, 
  KPITargets2026Data 
} from '../types/itm';

export interface DatabaseStatus {
  success: boolean;
  provider: string;
  connected: boolean;
  database?: string;
  serverTime?: string;
  totalAssets?: number;
  host?: string;
  error?: string;
}

export interface GoogleWorkspaceUser {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
  picture?: string;
  domain?: string;
  adId?: string;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `HTTP error ${res.status}`);
  }

  return res.json();
}

export const supabaseApi = {
  // Status
  async getStatus(): Promise<DatabaseStatus> {
    return request<DatabaseStatus>('/api/status');
  },

  // Google Workspace SSO
  async loginGoogleWorkspace(profile: {
    email: string;
    name?: string;
    picture?: string;
    role?: string;
    department?: string;
    hd?: string;
  }): Promise<{ success: boolean; user: GoogleWorkspaceUser }> {
    return request('/api/auth/google-workspace', {
      method: 'POST',
      body: JSON.stringify(profile),
    });
  },

  // Assets
  async getAssets(): Promise<Asset[]> {
    return request<Asset[]>('/api/assets');
  },

  async createAsset(asset: Omit<Asset, 'createdAt' | 'updatedAt'>): Promise<Asset> {
    return request<Asset>('/api/assets', {
      method: 'POST',
      body: JSON.stringify(asset),
    });
  },

  async updateAsset(id: string, updates: Partial<Asset>): Promise<Asset> {
    return request<Asset>(`/api/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteAsset(id: string): Promise<{ success: boolean; id: string }> {
    return request(`/api/assets/${id}`, {
      method: 'DELETE',
    });
  },

  // Onboardings
  async getOnboardings(): Promise<OnboardingRecord[]> {
    return request<OnboardingRecord[]>('/api/onboardings');
  },

  async createOnboarding(rec: Omit<OnboardingRecord, 'createdAt' | 'updatedAt'>): Promise<OnboardingRecord> {
    return request<OnboardingRecord>('/api/onboardings', {
      method: 'POST',
      body: JSON.stringify(rec),
    });
  },

  async updateOnboarding(id: string, updates: Partial<OnboardingRecord>): Promise<OnboardingRecord> {
    return request<OnboardingRecord>(`/api/onboardings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteOnboarding(id: string): Promise<{ success: boolean; id: string }> {
    return request(`/api/onboardings/${id}`, {
      method: 'DELETE',
    });
  },

  // Offboardings
  async getOffboardings(): Promise<OffboardingRecord[]> {
    return request<OffboardingRecord[]>('/api/offboardings');
  },

  async createOffboarding(rec: Omit<OffboardingRecord, 'createdAt' | 'updatedAt'>): Promise<OffboardingRecord> {
    return request<OffboardingRecord>('/api/offboardings', {
      method: 'POST',
      body: JSON.stringify(rec),
    });
  },

  async updateOffboarding(id: string, updates: Partial<OffboardingRecord>): Promise<OffboardingRecord> {
    return request<OffboardingRecord>(`/api/offboardings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteOffboarding(id: string): Promise<{ success: boolean; id: string }> {
    return request(`/api/offboardings/${id}`, {
      method: 'DELETE',
    });
  },

  // Requests
  async getRequests(): Promise<RequestRecord[]> {
    return request<RequestRecord[]>('/api/requests');
  },

  async createRequest(rec: Omit<RequestRecord, 'createdAt' | 'updatedAt'>): Promise<RequestRecord> {
    return request<RequestRecord>('/api/requests', {
      method: 'POST',
      body: JSON.stringify(rec),
    });
  },

  async updateRequest(id: string, updates: Partial<RequestRecord>): Promise<RequestRecord> {
    return request<RequestRecord>(`/api/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteRequest(id: string): Promise<{ success: boolean; id: string }> {
    return request(`/api/requests/${id}`, {
      method: 'DELETE',
    });
  },

  // Borrowings
  async getBorrowings(): Promise<BorrowingRecord[]> {
    return request<BorrowingRecord[]>('/api/borrowings');
  },

  async createBorrowing(rec: Omit<BorrowingRecord, 'createdAt' | 'updatedAt'>): Promise<BorrowingRecord> {
    return request<BorrowingRecord>('/api/borrowings', {
      method: 'POST',
      body: JSON.stringify(rec),
    });
  },

  async updateBorrowing(id: string, updates: Partial<BorrowingRecord>): Promise<BorrowingRecord> {
    return request<BorrowingRecord>(`/api/borrowings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteBorrowing(id: string): Promise<{ success: boolean; id: string }> {
    return request(`/api/borrowings/${id}`, {
      method: 'DELETE',
    });
  },

  // Preventive Maintenance
  async getPreventiveMaintenance(): Promise<PreventiveMaintenanceRecord[]> {
    return request<PreventiveMaintenanceRecord[]>('/api/preventive-maintenance');
  },

  async createPreventiveMaintenance(rec: Omit<PreventiveMaintenanceRecord, 'createdAt' | 'updatedAt'>): Promise<PreventiveMaintenanceRecord> {
    return request<PreventiveMaintenanceRecord>('/api/preventive-maintenance', {
      method: 'POST',
      body: JSON.stringify(rec),
    });
  },

  async updatePreventiveMaintenance(id: string, updates: Partial<PreventiveMaintenanceRecord>): Promise<PreventiveMaintenanceRecord> {
    return request<PreventiveMaintenanceRecord>(`/api/preventive-maintenance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deletePreventiveMaintenance(id: string): Promise<{ success: boolean; id: string }> {
    return request(`/api/preventive-maintenance/${id}`, {
      method: 'DELETE',
    });
  },

  // Liabilities
  async getLiabilities(): Promise<LiabilityRecord[]> {
    return request<LiabilityRecord[]>('/api/liabilities');
  },

  async createLiability(rec: Omit<LiabilityRecord, 'createdAt' | 'updatedAt'>): Promise<LiabilityRecord> {
    return request<LiabilityRecord>('/api/liabilities', {
      method: 'POST',
      body: JSON.stringify(rec),
    });
  },

  async updateLiability(id: string, updates: Partial<LiabilityRecord>): Promise<LiabilityRecord> {
    return request<LiabilityRecord>(`/api/liabilities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteLiability(id: string): Promise<{ success: boolean; id: string }> {
    return request(`/api/liabilities/${id}`, {
      method: 'DELETE',
    });
  },

  // Activity Logs
  async getActivityLogs(): Promise<ActivityLog[]> {
    return request<ActivityLog[]>('/api/activity-logs');
  },

  async createActivityLog(log: ActivityLog): Promise<{ success: boolean }> {
    return request('/api/activity-logs', {
      method: 'POST',
      body: JSON.stringify(log),
    });
  },

  // System Settings
  async getSettings(): Promise<SystemSettings | null> {
    return request<SystemSettings | null>('/api/settings');
  },

  async saveSettings(settings: SystemSettings): Promise<SystemSettings> {
    return request<SystemSettings>('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  },

  // Dropdown Categories
  async getDropdowns(): Promise<DropdownOptionsConfig | null> {
    return request<DropdownOptionsConfig | null>('/api/dropdowns');
  },

  async saveDropdowns(dropdowns: DropdownOptionsConfig): Promise<DropdownOptionsConfig> {
    return request<DropdownOptionsConfig>('/api/dropdowns', {
      method: 'POST',
      body: JSON.stringify(dropdowns),
    });
  },

  // KPI 2026 Records
  async getKPI2026(): Promise<KPITargets2026Data | null> {
    return request<KPITargets2026Data | null>('/api/kpi-records');
  },

  async saveKPI2026(kpi: KPITargets2026Data): Promise<KPITargets2026Data> {
    return request<KPITargets2026Data>('/api/kpi-records', {
      method: 'POST',
      body: JSON.stringify(kpi),
    });
  },

  // Seeding & Data Wipe
  async seedDatabase(): Promise<{ success: boolean; message: string }> {
    return request('/api/seed', { method: 'POST' });
  },

  async clearDatabase(password: string, clearScope: 'all' | 'assets' | 'requests' | 'borrowings'): Promise<{ success: boolean; message: string }> {
    return request('/api/clear', {
      method: 'POST',
      body: JSON.stringify({ password, clearScope }),
    });
  },
};
