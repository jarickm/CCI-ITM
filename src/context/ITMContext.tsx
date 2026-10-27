import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  supabaseApi, 
  DatabaseStatus, 
  GoogleWorkspaceUser 
} from '../api/supabaseClient';
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
  UserProfile, 
  UserRole, 
  LanguageCode, 
  DropdownOptionsConfig, 
  KPITargets2026Data, 
  AssetCustodyTransfer, 
  OrientationSessionLog, 
  NetsuiteConcernLog, 
  MONTHS_LIST 
} from '../types/itm';
import { 
  SEED_ASSETS, 
  SEED_ONBOARDINGS, 
  SEED_OFFBOARDINGS, 
  SEED_REQUESTS, 
  SEED_BORROWINGS, 
  SEED_PREVENTIVE_MAINTENANCE, 
  SEED_LIABILITIES, 
  SEED_ACTIVITY_LOGS, 
  INITIAL_SETTINGS, 
  DEFAULT_DROPDOWN_OPTIONS, 
  SEED_KPI_2026 
} from '../data/seedData';
import { TRANSLATIONS } from '../utils/i18n';

export interface AlertNotification {
  id: string;
  type: 'low_stock' | 'warranty' | 'overdue' | 'maintenance';
  title: string;
  message: string;
  date: string;
  read: boolean;
}

interface ITMContextType {
  // Collections from Supabase PostgreSQL
  assets: Asset[];
  onboardings: OnboardingRecord[];
  offboardings: OffboardingRecord[];
  requests: RequestRecord[];
  borrowings: BorrowingRecord[];
  preventiveMaintenance: PreventiveMaintenanceRecord[];
  liabilities: LiabilityRecord[];
  activityLogs: ActivityLog[];
  settings: SystemSettings;
  dropdownOptions: DropdownOptionsConfig;

  // Dropdown & Category Operations
  updateDropdownOptions: (newOptions: Partial<DropdownOptionsConfig>) => Promise<void>;
  addDropdownOption: (categoryKey: keyof DropdownOptionsConfig, value: string) => Promise<void>;
  editDropdownOption: (categoryKey: keyof DropdownOptionsConfig, oldValue: string, newValue: string, updateExistingRecords?: boolean) => Promise<void>;
  deleteDropdownOption: (categoryKey: keyof DropdownOptionsConfig, value: string) => Promise<void>;
  resetDropdownCategoryToDefault: (categoryKey: keyof DropdownOptionsConfig) => Promise<void>;

  // Official Measurement of Target - IT 2026
  kpi2026: KPITargets2026Data;
  updateKPI2026: (updates: Partial<KPITargets2026Data>) => Promise<void>;
  resetKPI2026ToDefaults: () => Promise<void>;
  autoSyncKPIFromSystem: () => Promise<KPITargets2026Data>;
  addOrientationSession: (session: Omit<OrientationSessionLog, 'id' | 'createdAt'>) => Promise<void>;
  deleteOrientationSession: (id: string) => Promise<void>;
  addNetsuiteConcern: (concern: Omit<NetsuiteConcernLog, 'id' | 'createdAt'>) => Promise<void>;
  deleteNetsuiteConcern: (id: string) => Promise<void>;

  // CRUD Asset & Custody Transfer
  addAsset: (asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateAsset: (id: string, updates: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  transferAsset: (transferData: AssetCustodyTransfer) => Promise<void>;
  markAssetPMSDone: (assetId: string, pmsHalf: '1st Half' | '2nd Half' | 'Both', technician: string, remarks?: string) => Promise<void>;

  // CRUD Onboarding
  addOnboarding: (rec: Omit<OnboardingRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateOnboarding: (id: string, updates: Partial<OnboardingRecord>) => Promise<void>;
  deleteOnboarding: (id: string) => Promise<void>;

  // CRUD Offboarding
  addOffboarding: (rec: Omit<OffboardingRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateOffboarding: (id: string, updates: Partial<OffboardingRecord>) => Promise<void>;
  deleteOffboarding: (id: string) => Promise<void>;

  // CRUD Request
  addRequest: (rec: Omit<RequestRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateRequest: (id: string, updates: Partial<RequestRecord>) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;

  // CRUD Borrowing
  addBorrowing: (rec: Omit<BorrowingRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateBorrowing: (id: string, updates: Partial<BorrowingRecord>) => Promise<void>;
  deleteBorrowing: (id: string) => Promise<void>;

  // CRUD Preventive Maintenance
  addPreventiveMaintenance: (rec: Omit<PreventiveMaintenanceRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updatePreventiveMaintenance: (id: string, updates: Partial<PreventiveMaintenanceRecord>) => Promise<void>;
  deletePreventiveMaintenance: (id: string) => Promise<void>;

  // CRUD Liability
  addLiability: (rec: Omit<LiabilityRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateLiability: (id: string, updates: Partial<LiabilityRecord>) => Promise<void>;
  deleteLiability: (id: string) => Promise<void>;

  // Audit
  logActivity: (action: string, targetEntity: string, targetId: string, details: string) => Promise<void>;

  // Settings & DB Management
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
  seedInitialDataToFirebase: () => Promise<void>; // Backward-compatible name, writes to Supabase
  clearAllData: () => Promise<void>;
  clearAssetsOnly: () => Promise<void>;
  clearDataWithPassword: (password: string, clearScope: 'all' | 'assets' | 'requests' | 'borrowings') => Promise<{ success: boolean; message: string }>;
  createBackupSnapshot: () => void;
  restoreBackupSnapshot: (jsonData: string) => Promise<void>;

  // Auth & Roles
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  setUserRole: (role: UserRole) => void;
  googleWorkspaceUser: GoogleWorkspaceUser | null;
  loginWithGoogleWorkspace: (email: string, name?: string, picture?: string) => Promise<void>;
  logoutGoogleWorkspace: () => Promise<void>;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;

  // Cloud Database State (Supabase PostgreSQL)
  isOnline: boolean;
  isSupabaseConnected: boolean;
  isFirebaseConnected: boolean; // Alias for UI components
  isCloudLoading: boolean;
  dismissCloudLoading: () => void;
  cloudDatabaseId: string;
  dbStatus: DatabaseStatus | null;
  refreshFromSupabase: () => Promise<void>;
  alerts: AlertNotification[];
  markAlertRead: (id: string) => void;
  clearAllAlerts: () => void;

  // Global UI State
  quickSearchQuery: string;
  setQuickSearchQuery: (q: string) => void;
  selectedAssetForQR: Asset | null;
  setSelectedAssetForQR: (asset: Asset | null) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const ITMContext = createContext<ITMContextType | undefined>(undefined);

const SUPABASE_DB_HOST = 'aws-0-ap-northeast-1.pooler.supabase.com';

export const ITMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Pure Supabase PostgreSQL State
  const [assets, setAssets] = useState<Asset[]>(SEED_ASSETS);
  const [onboardings, setOnboardings] = useState<OnboardingRecord[]>(SEED_ONBOARDINGS);
  const [offboardings, setOffboardings] = useState<OffboardingRecord[]>(SEED_OFFBOARDINGS);
  const [requests, setRequests] = useState<RequestRecord[]>(SEED_REQUESTS);
  const [borrowings, setBorrowings] = useState<BorrowingRecord[]>(SEED_BORROWINGS);
  const [preventiveMaintenance, setPreventiveMaintenance] = useState<PreventiveMaintenanceRecord[]>(SEED_PREVENTIVE_MAINTENANCE);
  const [liabilities, setLiabilities] = useState<LiabilityRecord[]>(SEED_LIABILITIES);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(SEED_ACTIVITY_LOGS);
  const [settings, setSettingsState] = useState<SystemSettings>(INITIAL_SETTINGS);
  const [dropdownOptions, setDropdownOptionsState] = useState<DropdownOptionsConfig>(DEFAULT_DROPDOWN_OPTIONS);
  const [kpi2026, setKpi2026] = useState<KPITargets2026Data>(SEED_KPI_2026);

  const [googleWorkspaceUser, setGoogleWorkspaceUser] = useState<GoogleWorkspaceUser | null>(null);

  const [currentUser, setCurrentUser] = useState<UserProfile>({
    name: 'JK Peralta',
    email: 'jk.peralta@coolaireconsolidated.com',
    role: 'Super Admin',
    department: 'IT Infrastructure & Security',
    adId: 'COOLAIRE\\jk.peralta',
  });

  const [language, setLanguage] = useState<LanguageCode>('en');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(true);
  const [isCloudLoading, setIsCloudLoading] = useState<boolean>(true);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);

  const [quickSearchQuery, setQuickSearchQuery] = useState<string>('');
  const [selectedAssetForQR, setSelectedAssetForQR] = useState<Asset | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);

  const dismissCloudLoading = useCallback(() => {
    setIsCloudLoading(false);
  }, []);

  // Online / offline listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Compute Alerts dynamically (Low stock, upcoming maintenance, overdue borrowings, expiring warranties)
  useEffect(() => {
    const newAlerts: AlertNotification[] = [];

    // 1. Low stock alert
    const categoryCounts: Record<string, number> = {};
    assets.forEach(a => {
      if (a.status === 'Available') {
        categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
      }
    });

    Object.entries(settings.lowStockThresholds || {}).forEach(([cat, threshold]) => {
      const count = categoryCounts[cat] || 0;
      if (count < threshold) {
        newAlerts.push({
          id: `alert-stock-${cat}`,
          type: 'low_stock',
          title: `Low Stock Alert: ${cat}`,
          message: `Only ${count} available unit(s) remaining (threshold: ${threshold}). Automated reorder dispatch ready.`,
          date: new Date().toLocaleDateString(),
          read: false,
        });
      }
    });

    // 2. Overdue borrowings
    const nowStr = new Date().toISOString().split('T')[0];
    borrowings.forEach(b => {
      if (b.status === 'Active / Borrowed' && b.returnDate < nowStr) {
        newAlerts.push({
          id: `alert-borrow-${b.id}`,
          type: 'overdue',
          title: `Overdue Loan: ${b.borrowerName}`,
          message: `${b.itemCategory} was due on ${b.returnDate}. Return is overdue.`,
          date: b.returnDate,
          read: false,
        });
      }
    });

    // 3. Warranty expirations within 90 days
    const in90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    assets.forEach(a => {
      if (a.warrantyExpiry && a.warrantyExpiry <= in90Days && a.status !== 'Retired') {
        newAlerts.push({
          id: `alert-warranty-${a.id}`,
          type: 'warranty',
          title: `Warranty Expiration: ${a.assetCode}`,
          message: `${a.employeeOrDeviceName} warranty expires on ${a.warrantyExpiry}. Check renewal or maintenance contract.`,
          date: a.warrantyExpiry,
          read: false,
        });
      }
    });

    setAlerts(newAlerts);
  }, [assets, borrowings, settings.lowStockThresholds]);

  // Load all data from Supabase PostgreSQL
  const refreshFromSupabase = useCallback(async () => {
    try {
      const [
        statusRes,
        assetsRes,
        onbRes,
        offRes,
        reqRes,
        brwRes,
        pmRes,
        liaRes,
        logsRes,
        settingsRes,
        dropdownsRes,
        kpiRes
      ] = await Promise.all([
        supabaseApi.getStatus().catch(() => ({ success: false, provider: 'Supabase', connected: false })),
        supabaseApi.getAssets().catch(() => []),
        supabaseApi.getOnboardings().catch(() => []),
        supabaseApi.getOffboardings().catch(() => []),
        supabaseApi.getRequests().catch(() => []),
        supabaseApi.getBorrowings().catch(() => []),
        supabaseApi.getPreventiveMaintenance().catch(() => []),
        supabaseApi.getLiabilities().catch(() => []),
        supabaseApi.getActivityLogs().catch(() => []),
        supabaseApi.getSettings().catch(() => null),
        supabaseApi.getDropdowns().catch(() => null),
        supabaseApi.getKPI2026().catch(() => null),
      ]);

      setDbStatus(statusRes as DatabaseStatus);
      setIsSupabaseConnected((statusRes as DatabaseStatus).connected);

      if (Array.isArray(assetsRes) && assetsRes.length > 0) {
        setAssets(assetsRes);
      }
      if (Array.isArray(onbRes) && onbRes.length > 0) {
        setOnboardings(onbRes);
      }
      if (Array.isArray(offRes) && offRes.length > 0) {
        setOffboardings(offRes);
      }
      if (Array.isArray(reqRes) && reqRes.length > 0) {
        setRequests(reqRes);
      }
      if (Array.isArray(brwRes) && brwRes.length > 0) {
        setBorrowings(brwRes);
      }
      if (Array.isArray(pmRes) && pmRes.length > 0) {
        setPreventiveMaintenance(pmRes);
      }
      if (Array.isArray(liaRes) && liaRes.length > 0) {
        setLiabilities(liaRes);
      }
      if (Array.isArray(logsRes) && logsRes.length > 0) {
        setActivityLogs(logsRes);
      }
      if (settingsRes) {
        setSettingsState(prev => ({ ...prev, ...settingsRes }));
      }
      if (dropdownsRes) {
        setDropdownOptionsState(prev => ({ ...prev, ...dropdownsRes }));
      }
      if (kpiRes) {
        setKpi2026(kpiRes);
      }

      setIsCloudLoading(false);
    } catch (err) {
      console.warn('Supabase fetch notice:', err);
      setIsCloudLoading(false);
    }
  }, []);

  // Initial Load & Automatic Background Sync every 15s
  useEffect(() => {
    let isMounted = true;

    // Safety timeout: never lock user screen
    const timer = setTimeout(() => {
      if (isMounted) setIsCloudLoading(false);
    }, 2000);

    refreshFromSupabase();

    const interval = setInterval(() => {
      if (isMounted) refreshFromSupabase();
    }, 15000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [refreshFromSupabase]);

  // Google Workspace SSO Authentication
  const loginWithGoogleWorkspace = async (email: string, name?: string, picture?: string) => {
    try {
      const res = await supabaseApi.loginGoogleWorkspace({
        email,
        name: name || email.split('@')[0],
        picture,
        role: email.includes('peralta') || email.includes('admin') ? 'Super Admin' : 'IT Admin',
        department: 'IT Infrastructure & Security',
        hd: email.split('@')[1] || 'coolaireconsolidated.com',
      });

      if (res.success && res.user) {
        setGoogleWorkspaceUser(res.user);
        setCurrentUser({
          name: res.user.name,
          email: res.user.email,
          role: res.user.role as UserRole,
          department: res.user.department,
          adId: res.user.adId || `COOLAIRE\\${email.split('@')[0]}`,
        });
      }
    } catch (err) {
      console.error('Google Workspace login error:', err);
      throw err;
    }
  };

  const logoutGoogleWorkspace = async () => {
    setGoogleWorkspaceUser(null);
    await logActivity('GOOGLE_WORKSPACE_LOGOUT', 'User', currentUser.email, `Logged out from Google Workspace SSO`);
  };

  // Translation helper
  const t = useCallback((key: string): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS['en'];
    return dict[key] || TRANSLATIONS['en'][key] || key;
  }, [language]);

  // Log activity helper
  const logActivity = async (action: string, targetEntity: string, targetId: string, details: string) => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: `${currentUser.email} (${currentUser.role})`,
      action,
      targetEntity,
      targetId,
      details,
    };

    setActivityLogs(prev => [newLog, ...prev]);

    try {
      await supabaseApi.createActivityLog(newLog);
    } catch (err) {
      console.warn('Activity log sync error:', err);
    }
  };

  // CRUD ASSETS
  const addAsset = async (assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const id = `ast-${Date.now()}`;
    const now = new Date().toISOString();
    const newAsset: Asset = {
      ...assetData,
      id,
      createdAt: now,
      updatedAt: now,
    };

    setAssets(prev => [newAsset, ...prev]);
    await logActivity('ASSET_CREATE', 'Asset', newAsset.assetCode, `Created asset ${newAsset.employeeOrDeviceName} (${newAsset.assetCode})`);

    try {
      await supabaseApi.createAsset(newAsset);
    } catch (err) {
      console.error('Failed to create asset in Supabase:', err);
    }
    return id;
  };

  const updateAsset = async (id: string, updates: Partial<Asset>) => {
    const now = new Date().toISOString();
    setAssets(prev => prev.map(a => a.id === id ? { ...a, ...updates, updatedAt: now } : a));
    const target = assets.find(a => a.id === id);
    await logActivity('ASSET_UPDATE', 'Asset', target?.assetCode || id, `Updated asset fields: ${Object.keys(updates).join(', ')}`);

    try {
      await supabaseApi.updateAsset(id, updates);
    } catch (err) {
      console.error('Failed to update asset in Supabase:', err);
    }
  };

  const deleteAsset = async (id: string) => {
    const target = assets.find(a => a.id === id);
    setAssets(prev => prev.filter(a => a.id !== id));
    await logActivity('ASSET_DELETE', 'Asset', target?.assetCode || id, `Deleted asset ${target?.employeeOrDeviceName}`);

    try {
      await supabaseApi.deleteAsset(id);
    } catch (err) {
      console.error('Failed to delete asset from Supabase:', err);
    }
  };

  // ASSET CUSTODY TRANSFER & TURNOVER
  const transferAsset = async (transferData: AssetCustodyTransfer) => {
    const targetAsset = assets.find(a => a.id === transferData.id || a.assetCode === transferData.id);
    if (!targetAsset) return;

    const existingHistory = targetAsset.custodyHistory || [];
    const updatedHistory = [transferData, ...existingHistory];

    const updates: Partial<Asset> = {
      employeeOrDeviceName: transferData.toEmployee,
      department: transferData.toDepartment,
      location: transferData.toBranch || targetAsset.location,
      status: transferData.reason === 'Return to IT Stock' ? 'Available' : 'In Use',
      custodyHistory: updatedHistory,
      notes: `${targetAsset.notes || ''}\n[${transferData.transferDate}] Transferred from ${transferData.fromEmployee} to ${transferData.toEmployee} (${transferData.reason}). Slip: ${transferData.turnoverReceiptNumber}`.trim(),
    };

    await updateAsset(targetAsset.id, updates);
    await logActivity(
      'ASSET_CUSTODY_TRANSFER',
      'Asset',
      targetAsset.assetCode,
      `Device ${targetAsset.assetCode} transferred from ${transferData.fromEmployee} (${transferData.fromDepartment}) to ${transferData.toEmployee} (${transferData.toDepartment}). Reason: ${transferData.reason}. Turnover Slip #${transferData.turnoverReceiptNumber}`
    );
  };

  // MARK ASSET PMS DONE
  const markAssetPMSDone = async (assetId: string, pmsHalf: '1st Half' | '2nd Half' | 'Both', technician: string, remarks?: string) => {
    const today = new Date().toISOString().substring(0, 10);
    await updateAsset(assetId, {
      pmsCompleted: true,
      pmsDate: today,
      pmsHalf,
      pmsTechnician: technician,
      pmsRemarks: remarks || 'Semi-annual inspection and diagnostics completed.',
    });
    const asset = assets.find(a => a.id === assetId);
    if (asset) {
      await addPreventiveMaintenance({
        description: `PMS Inspection (${pmsHalf}) - ${asset.employeeOrDeviceName}`,
        date: today,
        datePurchase: asset.purchaseDate || today,
        assetCode: asset.assetCode,
        activityWorkDone: `Completed thermal clean, diagnostic health test, memory check, and OS updates. ${remarks || ''}`.trim(),
        performedBy: technician,
        status: 'Completed',
        recommendation: 'Unit in good operational state. Keep in service.',
        department: asset.department,
      });
    }
  };

  // CRUD ONBOARDING
  const addOnboarding = async (rec: Omit<OnboardingRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const id = `onb-${Date.now()}`;
    const now = new Date().toISOString();
    const newRec: OnboardingRecord = { ...rec, id, createdAt: now, updatedAt: now };
    setOnboardings(prev => [newRec, ...prev]);
    await logActivity('ONBOARDING_CREATE', 'Onboarding', newRec.controlNumber, `Registered onboarding for ${newRec.employeeName}`);

    try {
      await supabaseApi.createOnboarding(newRec);
    } catch (err) {
      console.error('Failed to create onboarding in Supabase:', err);
    }
    return id;
  };

  const updateOnboarding = async (id: string, updates: Partial<OnboardingRecord>) => {
    const now = new Date().toISOString();
    setOnboardings(prev => prev.map(r => r.id === id ? { ...r, ...updates, updatedAt: now } : r));
    await logActivity('ONBOARDING_UPDATE', 'Onboarding', id, `Updated onboarding record`);

    try {
      await supabaseApi.updateOnboarding(id, updates);
    } catch (err) {
      console.error('Failed to update onboarding in Supabase:', err);
    }
  };

  const deleteOnboarding = async (id: string) => {
    setOnboardings(prev => prev.filter(r => r.id !== id));
    await logActivity('ONBOARDING_DELETE', 'Onboarding', id, `Deleted onboarding record`);

    try {
      await supabaseApi.deleteOnboarding(id);
    } catch (err) {
      console.error('Failed to delete onboarding from Supabase:', err);
    }
  };

  // CRUD OFFBOARDING
  const addOffboarding = async (rec: Omit<OffboardingRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const id = `off-${Date.now()}`;
    const now = new Date().toISOString();
    const newRec: OffboardingRecord = { ...rec, id, createdAt: now, updatedAt: now };
    setOffboardings(prev => [newRec, ...prev]);
    await logActivity('OFFBOARDING_CREATE', 'Offboarding', newRec.controlNumber, `Created separation clearance for ${newRec.employeeName}`);

    try {
      await supabaseApi.createOffboarding(newRec);
    } catch (err) {
      console.error('Failed to create offboarding in Supabase:', err);
    }
    return id;
  };

  const updateOffboarding = async (id: string, updates: Partial<OffboardingRecord>) => {
    const now = new Date().toISOString();
    setOffboardings(prev => prev.map(r => r.id === id ? { ...r, ...updates, updatedAt: now } : r));
    await logActivity('OFFBOARDING_UPDATE', 'Offboarding', id, `Updated offboarding clearance`);

    try {
      await supabaseApi.updateOffboarding(id, updates);
    } catch (err) {
      console.error('Failed to update offboarding in Supabase:', err);
    }
  };

  const deleteOffboarding = async (id: string) => {
    setOffboardings(prev => prev.filter(r => r.id !== id));
    await logActivity('OFFBOARDING_DELETE', 'Offboarding', id, `Deleted offboarding clearance`);

    try {
      await supabaseApi.deleteOffboarding(id);
    } catch (err) {
      console.error('Failed to delete offboarding from Supabase:', err);
    }
  };

  // CRUD REQUESTS (PR / IER)
  const addRequest = async (rec: Omit<RequestRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const id = `req-${Date.now()}`;
    const now = new Date().toISOString();
    const newRec: RequestRecord = { ...rec, id, createdAt: now, updatedAt: now };
    setRequests(prev => [newRec, ...prev]);
    await logActivity('REQUEST_CREATE', 'Request', newRec.referenceNo, `Submitted ${newRec.requestType} ticket: ${newRec.referenceNo}`);

    try {
      await supabaseApi.createRequest(newRec);
    } catch (err) {
      console.error('Failed to create request in Supabase:', err);
    }
    return id;
  };

  const updateRequest = async (id: string, updates: Partial<RequestRecord>) => {
    const now = new Date().toISOString();
    setRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates, updatedAt: now } : r));
    await logActivity('REQUEST_UPDATE', 'Request', id, `Updated request ticket status/details`);

    try {
      await supabaseApi.updateRequest(id, updates);
    } catch (err) {
      console.error('Failed to update request in Supabase:', err);
    }
  };

  const deleteRequest = async (id: string) => {
    setRequests(prev => prev.filter(r => r.id !== id));
    await logActivity('REQUEST_DELETE', 'Request', id, `Deleted request ticket`);

    try {
      await supabaseApi.deleteRequest(id);
    } catch (err) {
      console.error('Failed to delete request from Supabase:', err);
    }
  };

  // CRUD BORROWINGS
  const addBorrowing = async (rec: Omit<BorrowingRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const id = `brw-${Date.now()}`;
    const now = new Date().toISOString();
    const newRec: BorrowingRecord = { ...rec, id, createdAt: now, updatedAt: now };
    setBorrowings(prev => [newRec, ...prev]);
    await logActivity('BORROW_CREATE', 'Borrowing', id, `Borrowed ${newRec.itemCategory} by ${newRec.borrowerName}`);

    try {
      await supabaseApi.createBorrowing(newRec);
    } catch (err) {
      console.error('Failed to create borrowing in Supabase:', err);
    }
    return id;
  };

  const updateBorrowing = async (id: string, updates: Partial<BorrowingRecord>) => {
    const now = new Date().toISOString();
    setBorrowings(prev => prev.map(r => r.id === id ? { ...r, ...updates, updatedAt: now } : r));
    await logActivity('BORROW_UPDATE', 'Borrowing', id, `Updated equipment loan status`);

    try {
      await supabaseApi.updateBorrowing(id, updates);
    } catch (err) {
      console.error('Failed to update borrowing in Supabase:', err);
    }
  };

  const deleteBorrowing = async (id: string) => {
    setBorrowings(prev => prev.filter(r => r.id !== id));
    await logActivity('BORROW_DELETE', 'Borrowing', id, `Deleted equipment loan`);

    try {
      await supabaseApi.deleteBorrowing(id);
    } catch (err) {
      console.error('Failed to delete borrowing from Supabase:', err);
    }
  };

  // CRUD PREVENTIVE MAINTENANCE
  const addPreventiveMaintenance = async (rec: Omit<PreventiveMaintenanceRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const id = `pm-${Date.now()}`;
    const now = new Date().toISOString();
    const newRec: PreventiveMaintenanceRecord = { ...rec, id, createdAt: now, updatedAt: now };
    setPreventiveMaintenance(prev => [newRec, ...prev]);
    await logActivity('PM_CREATE', 'PreventiveMaintenance', newRec.assetCode, `Recorded PM activity for ${newRec.assetCode}`);

    try {
      await supabaseApi.createPreventiveMaintenance(newRec);
    } catch (err) {
      console.error('Failed to create PM log in Supabase:', err);
    }
    return id;
  };

  const updatePreventiveMaintenance = async (id: string, updates: Partial<PreventiveMaintenanceRecord>) => {
    const now = new Date().toISOString();
    setPreventiveMaintenance(prev => prev.map(r => r.id === id ? { ...r, ...updates, updatedAt: now } : r));
    await logActivity('PM_UPDATE', 'PreventiveMaintenance', id, `Updated PM record`);

    try {
      await supabaseApi.updatePreventiveMaintenance(id, updates);
    } catch (err) {
      console.error('Failed to update PM log in Supabase:', err);
    }
  };

  const deletePreventiveMaintenance = async (id: string) => {
    setPreventiveMaintenance(prev => prev.filter(r => r.id !== id));
    await logActivity('PM_DELETE', 'PreventiveMaintenance', id, `Deleted PM log`);

    try {
      await supabaseApi.deletePreventiveMaintenance(id);
    } catch (err) {
      console.error('Failed to delete PM log from Supabase:', err);
    }
  };

  // CRUD LIABILITY
  const addLiability = async (rec: Omit<LiabilityRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const id = `lia-${Date.now()}`;
    const now = new Date().toISOString();
    const newRec: LiabilityRecord = { ...rec, id, createdAt: now, updatedAt: now };
    setLiabilities(prev => [newRec, ...prev]);
    await logActivity('LIABILITY_CREATE', 'Liability', newRec.assetCode, `Issued accountability form to ${newRec.employeeName}`);

    try {
      await supabaseApi.createLiability(newRec);
    } catch (err) {
      console.error('Failed to create liability in Supabase:', err);
    }
    return id;
  };

  const updateLiability = async (id: string, updates: Partial<LiabilityRecord>) => {
    const now = new Date().toISOString();
    setLiabilities(prev => prev.map(r => r.id === id ? { ...r, ...updates, updatedAt: now } : r));
    await logActivity('LIABILITY_UPDATE', 'Liability', id, `Updated liability custody record`);

    try {
      await supabaseApi.updateLiability(id, updates);
    } catch (err) {
      console.error('Failed to update liability in Supabase:', err);
    }
  };

  const deleteLiability = async (id: string) => {
    setLiabilities(prev => prev.filter(r => r.id !== id));
    await logActivity('LIABILITY_DELETE', 'Liability', id, `Deleted liability record`);

    try {
      await supabaseApi.deleteLiability(id);
    } catch (err) {
      console.error('Failed to delete liability from Supabase:', err);
    }
  };

  // SETTINGS
  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    const merged = { ...settings, ...newSettings };
    setSettingsState(merged);
    await logActivity('SETTINGS_UPDATE', 'Settings', 'global', `System settings updated`);

    try {
      await supabaseApi.saveSettings(merged);
    } catch (err) {
      console.warn('Settings sync notice:', err);
    }
  };

  // DROPDOWN & CATEGORY TAXONOMY
  const updateDropdownOptions = async (newOptions: Partial<DropdownOptionsConfig>) => {
    const merged = { ...dropdownOptions, ...newOptions };
    setDropdownOptionsState(merged);
    await logActivity('DROPDOWNS_UPDATE', 'Settings', 'dropdowns', `Customized dropdown category options in Supabase`);

    try {
      await supabaseApi.saveDropdowns(merged);
    } catch (err) {
      console.error('Failed to update dropdowns in Supabase:', err);
    }
  };

  const addDropdownOption = async (categoryKey: keyof DropdownOptionsConfig, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const currentList = dropdownOptions[categoryKey] || [];
    if (currentList.some(item => item.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }
    const updatedList = [...currentList, trimmed];
    const updatedConfig = { ...dropdownOptions, [categoryKey]: updatedList };
    setDropdownOptionsState(updatedConfig);
    await logActivity('DROPDOWN_OPTION_ADD', 'Category', categoryKey, `Added "${trimmed}" to ${categoryKey} list`);

    try {
      await supabaseApi.saveDropdowns(updatedConfig);
    } catch (err) {
      console.error('Failed to save dropdown option to Supabase:', err);
    }
  };

  const editDropdownOption = async (
    categoryKey: keyof DropdownOptionsConfig, 
    oldValue: string, 
    newValue: string, 
    updateExistingRecords = true
  ) => {
    const trimmedNew = newValue.trim();
    if (!trimmedNew || trimmedNew === oldValue) return;
    const currentList = dropdownOptions[categoryKey] || [];
    const updatedList = currentList.map(item => item === oldValue ? trimmedNew : item);
    const updatedConfig = { ...dropdownOptions, [categoryKey]: updatedList };
    setDropdownOptionsState(updatedConfig);

    await logActivity('DROPDOWN_OPTION_EDIT', 'Category', categoryKey, `Renamed "${oldValue}" to "${trimmedNew}" in ${categoryKey}`);

    try {
      await supabaseApi.saveDropdowns(updatedConfig);
    } catch (err) {
      console.error('Failed to save renamed dropdown to Supabase:', err);
    }

    if (updateExistingRecords) {
      if (categoryKey === 'departments') {
        assets.forEach(a => { if (a.department === oldValue) updateAsset(a.id, { department: trimmedNew }); });
        onboardings.forEach(o => { if (o.department === oldValue) updateOnboarding(o.id, { department: trimmedNew }); });
        offboardings.forEach(o => { if (o.department === oldValue) updateOffboarding(o.id, { department: trimmedNew }); });
        requests.forEach(r => { if (r.departmentOrBranches === oldValue) updateRequest(r.id, { departmentOrBranches: trimmedNew }); });
        borrowings.forEach(b => { if (b.department === oldValue) updateBorrowing(b.id, { department: trimmedNew }); });
        preventiveMaintenance.forEach(p => { if (p.department === oldValue) updatePreventiveMaintenance(p.id, { department: trimmedNew }); });
        liabilities.forEach(l => { if (l.department === oldValue) updateLiability(l.id, { department: trimmedNew }); });
      } else if (categoryKey === 'assetCategories') {
        assets.forEach(a => { if (a.category === oldValue) updateAsset(a.id, { category: trimmedNew as any }); });
        borrowings.forEach(b => { if (b.itemCategory === oldValue) updateBorrowing(b.id, { itemCategory: trimmedNew }); });
      } else if (categoryKey === 'assetStatuses') {
        assets.forEach(a => { if (a.status === oldValue) updateAsset(a.id, { status: trimmedNew as any }); });
      } else if (categoryKey === 'requestTypes') {
        requests.forEach(r => { if (r.requestType === oldValue) updateRequest(r.id, { requestType: trimmedNew as any }); });
      } else if (categoryKey === 'requestStatuses') {
        requests.forEach(r => { if (r.status === oldValue) updateRequest(r.id, { status: trimmedNew as any }); });
      } else if (categoryKey === 'onboardingStatuses') {
        onboardings.forEach(o => { if (o.status === oldValue) updateOnboarding(o.id, { status: trimmedNew as any }); });
      } else if (categoryKey === 'offboardingStatuses') {
        offboardings.forEach(o => { if (o.status === oldValue) updateOffboarding(o.id, { status: trimmedNew as any }); });
      } else if (categoryKey === 'borrowStatuses') {
        borrowings.forEach(b => { if (b.status === oldValue) updateBorrowing(b.id, { status: trimmedNew as any }); });
      } else if (categoryKey === 'pmStatuses') {
        preventiveMaintenance.forEach(p => { if (p.status === oldValue) updatePreventiveMaintenance(p.id, { status: trimmedNew as any }); });
      } else if (categoryKey === 'liabilityStatuses') {
        liabilities.forEach(l => { if (l.status === oldValue) updateLiability(l.id, { status: trimmedNew as any }); });
      } else if (categoryKey === 'unitsOfMeasure') {
        liabilities.forEach(l => { if (l.uom === oldValue) updateLiability(l.id, { uom: trimmedNew }); });
      } else if (categoryKey === 'companies') {
        onboardings.forEach(o => { if (o.company === oldValue) updateOnboarding(o.id, { company: trimmedNew }); });
        offboardings.forEach(o => { if (o.company === oldValue) updateOffboarding(o.id, { company: trimmedNew }); });
        liabilities.forEach(l => { if (l.company === oldValue) updateLiability(l.id, { company: trimmedNew }); });
      } else if (categoryKey === 'locations') {
        assets.forEach(a => { if (a.location === oldValue) updateAsset(a.id, { location: trimmedNew }); });
      }
    }
  };

  const deleteDropdownOption = async (categoryKey: keyof DropdownOptionsConfig, value: string) => {
    const currentList = dropdownOptions[categoryKey] || [];
    const updatedList = currentList.filter(item => item !== value);
    const updatedConfig = { ...dropdownOptions, [categoryKey]: updatedList };
    setDropdownOptionsState(updatedConfig);
    await logActivity('DROPDOWN_OPTION_DELETE', 'Category', categoryKey, `Removed "${value}" from ${categoryKey} list`);

    try {
      await supabaseApi.saveDropdowns(updatedConfig);
    } catch (err) {
      console.error('Failed to delete dropdown option in Supabase:', err);
    }
  };

  const resetDropdownCategoryToDefault = async (categoryKey: keyof DropdownOptionsConfig) => {
    const defaultList = DEFAULT_DROPDOWN_OPTIONS[categoryKey];
    const updatedConfig = { ...dropdownOptions, [categoryKey]: defaultList };
    setDropdownOptionsState(updatedConfig);
    await logActivity('DROPDOWN_CATEGORY_RESET', 'Category', categoryKey, `Reset ${categoryKey} to factory defaults`);

    try {
      await supabaseApi.saveDropdowns(updatedConfig);
    } catch (err) {
      console.error('Failed to reset dropdown in Supabase:', err);
    }
  };

  // KPI 2026 TARGET MEASUREMENTS OPERATIONS
  const updateKPI2026 = async (updates: Partial<KPITargets2026Data>) => {
    const merged: KPITargets2026Data = {
      ...kpi2026,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    setKpi2026(merged);
    await logActivity('KPI_UPDATE', 'KPI2026', 'targets', 'Updated official IT 2026 Target Measurement records');

    try {
      await supabaseApi.saveKPI2026(merged);
    } catch (err) {
      console.error('Failed to update KPI 2026 in Supabase:', err);
    }
  };

  const resetKPI2026ToDefaults = async () => {
    setKpi2026(SEED_KPI_2026);
    await logActivity('KPI_RESET', 'KPI2026', 'targets', 'Reset IT 2026 Target Measurement records to official baseline');

    try {
      await supabaseApi.saveKPI2026(SEED_KPI_2026);
    } catch (err) {
      console.error('Failed to reset KPI 2026 in Supabase:', err);
    }
  };

  // Re-seed Initial Baseline Data to Supabase
  const seedInitialDataToFirebase = async () => {
    try {
      await supabaseApi.seedDatabase();
      await refreshFromSupabase();
      await logActivity('DATABASE_SEED', 'System', 'all', 'Seeded initial enterprise dataset into Supabase PostgreSQL');
    } catch (err) {
      console.error('Seeding error:', err);
    }
  };

  // Clear All System Data
  const clearAllData = async () => {
    setAssets([]);
    setOnboardings([]);
    setOffboardings([]);
    setRequests([]);
    setBorrowings([]);
    setPreventiveMaintenance([]);
    setLiabilities([]);
    setActivityLogs([]);

    try {
      await supabaseApi.clearDatabase(settings.masterAdminPassword || 'ITAdmin@2026', 'all');
      await logActivity('SYSTEM_CLEARED', 'Supabase', 'all', 'All system data and inventory records cleared from Supabase');
    } catch (err) {
      console.error('Failed to clear Supabase database:', err);
    }
  };

  // Clear Inventory Assets Only
  const clearAssetsOnly = async () => {
    setAssets([]);
    try {
      await supabaseApi.clearDatabase(settings.masterAdminPassword || 'ITAdmin@2026', 'assets');
      await logActivity('ASSETS_CLEARED', 'Supabase', 'assets', 'All inventory asset records cleared from Supabase');
    } catch (err) {
      console.error('Failed to clear assets in Supabase:', err);
    }
  };

  // SECURE CLEAR ALL DATA WITH MASTER PASSWORD PROTECTION
  const clearDataWithPassword = async (
    password: string, 
    clearScope: 'all' | 'assets' | 'requests' | 'borrowings'
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await supabaseApi.clearDatabase(password, clearScope);
      await refreshFromSupabase();
      return res;
    } catch (err: any) {
      return { success: false, message: err.message || 'Error executing database clear operation' };
    }
  };

  // ROLE & USER PERMISSIONS
  const setUserRole = (role: UserRole) => {
    setCurrentUser(prev => ({ ...prev, role }));
  };

  // AUTO-CALCULATE & SYNC KPI DATA FROM LIVE SYSTEM
  const autoSyncKPIFromSystem = async (): Promise<KPITargets2026Data> => {
    const pmsDoneFirstHalf = assets.filter(a => a.pmsCompleted && (a.pmsHalf === '1st Half' || a.pmsHalf === 'Both')).length;
    const pmsDoneSecondHalf = assets.filter(a => a.pmsCompleted && (a.pmsHalf === '2nd Half' || a.pmsHalf === 'Both')).length;

    const locationTargets: Record<string, { planned: number; actualDoneFirstHalf: number; actualDoneSecondHalf: number }> = {
      ...(kpi2026.pms.locationTargets || {})
    };
    (dropdownOptions.branches || []).forEach(branch => {
      const branchAssets = assets.filter(a => 
        (a.location && a.location.toLowerCase().includes(branch.toLowerCase())) ||
        (a.department && a.department.toLowerCase().includes(branch.toLowerCase()))
      );
      const firstHalfDone = branchAssets.filter(a => a.pmsCompleted && (a.pmsHalf === '1st Half' || a.pmsHalf === 'Both')).length;
      const secondHalfDone = branchAssets.filter(a => a.pmsCompleted && (a.pmsHalf === '2nd Half' || a.pmsHalf === 'Both')).length;
      if (!locationTargets[branch]) {
        locationTargets[branch] = { 
          planned: Math.max(10, branchAssets.length || 15), 
          actualDoneFirstHalf: firstHalfDone, 
          actualDoneSecondHalf: secondHalfDone 
        };
      } else {
        locationTargets[branch].actualDoneFirstHalf = firstHalfDone > 0 ? firstHalfDone : locationTargets[branch].actualDoneFirstHalf;
        locationTargets[branch].actualDoneSecondHalf = secondHalfDone > 0 ? secondHalfDone : locationTargets[branch].actualDoneSecondHalf;
      }
    });

    const updated: KPITargets2026Data = {
      ...kpi2026,
      pms: {
        firstHalf: {
          planned: kpi2026.pms.firstHalf.planned || 161,
          actualDone: pmsDoneFirstHalf > 0 ? pmsDoneFirstHalf : kpi2026.pms.firstHalf.actualDone,
        },
        secondHalf: {
          planned: kpi2026.pms.secondHalf.planned || 161,
          actualDone: pmsDoneSecondHalf > 0 ? pmsDoneSecondHalf : kpi2026.pms.secondHalf.actualDone,
        },
        locationTargets,
      },
      updatedAt: new Date().toISOString(),
    };

    await updateKPI2026(updated);
    return updated;
  };

  // ADD & DELETE ORIENTATION SESSIONS
  const addOrientationSession = async (session: Omit<OrientationSessionLog, 'id' | 'createdAt'>) => {
    const id = `ori-${Date.now()}`;
    const newSession: OrientationSessionLog = { ...session, id, createdAt: new Date().toISOString() };
    const currentSessions = kpi2026.orientationSessions || [];
    const updatedSessions = [newSession, ...currentSessions];

    const dateObj = new Date(session.date);
    const monthIndex = isNaN(dateObj.getMonth()) ? 0 : dateObj.getMonth();
    const monthName = MONTHS_LIST[monthIndex] || 'January';

    const currentMonthData = kpi2026.orientations[monthName] || { conductedNetsuite: 0, scheduledNetsuite: 0, conductedBasic: 0, scheduledBasic: 0 };
    const isNetsuite = session.category === 'NetSuite System Training';
    const updatedMonthData = {
      ...currentMonthData,
      conductedNetsuite: isNetsuite && session.status === 'Conducted' ? currentMonthData.conductedNetsuite + 1 : currentMonthData.conductedNetsuite,
      scheduledNetsuite: isNetsuite ? currentMonthData.scheduledNetsuite + 1 : currentMonthData.scheduledNetsuite,
      conductedBasic: !isNetsuite && session.status === 'Conducted' ? currentMonthData.conductedBasic + 1 : currentMonthData.conductedBasic,
      scheduledBasic: !isNetsuite ? currentMonthData.scheduledBasic + 1 : currentMonthData.scheduledBasic,
    };

    const updatedKPI: Partial<KPITargets2026Data> = {
      orientationSessions: updatedSessions,
      orientations: {
        ...kpi2026.orientations,
        [monthName]: updatedMonthData,
      }
    };
    await updateKPI2026(updatedKPI);
  };

  const deleteOrientationSession = async (id: string) => {
    const updatedSessions = (kpi2026.orientationSessions || []).filter(s => s.id !== id);
    await updateKPI2026({ orientationSessions: updatedSessions });
  };

  // ADD & DELETE NETSUITE CONCERNS WITH SCREENSHOT SUPPORT
  const addNetsuiteConcern = async (concern: Omit<NetsuiteConcernLog, 'id' | 'createdAt'>) => {
    const id = `ns-${Date.now()}`;
    const newConcern: NetsuiteConcernLog = { ...concern, id, createdAt: new Date().toISOString() };
    const currentConcerns = kpi2026.netsuiteConcerns || [];
    const updatedConcerns = [newConcern, ...currentConcerns];

    const dateObj = new Date(concern.dateReported);
    const monthIndex = isNaN(dateObj.getMonth()) ? 0 : dateObj.getMonth();
    const monthName = MONTHS_LIST[monthIndex] || 'January';

    const currentMonthData = kpi2026.netsuite[monthName] || { minorResolvedDays: 0, minorReported: 0, majorResolvedDays: 0, majorReported: 0 };
    const isMinor = concern.priority.includes('Minor');
    const updatedMonthData = {
      ...currentMonthData,
      minorReported: isMinor ? currentMonthData.minorReported + 1 : currentMonthData.minorReported,
      minorResolvedDays: isMinor && concern.resolvedOnTime ? currentMonthData.minorResolvedDays + Number(concern.daysToResolve || 1) : currentMonthData.minorResolvedDays,
      majorReported: !isMinor ? currentMonthData.majorReported + 1 : currentMonthData.majorReported,
      majorResolvedDays: !isMinor && concern.resolvedOnTime ? currentMonthData.majorResolvedDays + Number(concern.daysToResolve || 1) : currentMonthData.majorResolvedDays,
    };

    const updatedKPI: Partial<KPITargets2026Data> = {
      netsuiteConcerns: updatedConcerns,
      netsuite: {
        ...kpi2026.netsuite,
        [monthName]: updatedMonthData,
      }
    };
    await updateKPI2026(updatedKPI);
  };

  const deleteNetsuiteConcern = async (id: string) => {
    const updatedConcerns = (kpi2026.netsuiteConcerns || []).filter(c => c.id !== id);
    await updateKPI2026({ netsuiteConcerns: updatedConcerns });
  };

  // Backup snapshots - direct export
  const createBackupSnapshot = () => {
    const snapshot = {
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      system: 'ITM Pro Enterprise Supabase Cloud',
      database: 'Supabase PostgreSQL (aws-0-ap-northeast-1.pooler.supabase.com)',
      company: settings.companyName,
      data: {
        assets,
        onboardings,
        offboardings,
        requests,
        borrowings,
        preventiveMaintenance,
        liabilities,
        activityLogs,
        settings,
        dropdownOptions,
        kpi2026,
      }
    };

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ITM_Supabase_Backup_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    updateSettings({ lastBackupDate: new Date().toISOString() });
    logActivity('BACKUP_EXPORT', 'Supabase', 'snapshot', 'Created full JSON snapshot backup of Supabase database');
  };

  // Restore directly into Supabase
  const restoreBackupSnapshot = async (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.data) {
        if (parsed.data.assets && Array.isArray(parsed.data.assets)) {
          for (const a of parsed.data.assets) {
            await supabaseApi.createAsset(a);
          }
        }
        if (parsed.data.onboardings && Array.isArray(parsed.data.onboardings)) {
          for (const o of parsed.data.onboardings) {
            await supabaseApi.createOnboarding(o);
          }
        }
        if (parsed.data.offboardings && Array.isArray(parsed.data.offboardings)) {
          for (const off of parsed.data.offboardings) {
            await supabaseApi.createOffboarding(off);
          }
        }
        if (parsed.data.requests && Array.isArray(parsed.data.requests)) {
          for (const r of parsed.data.requests) {
            await supabaseApi.createRequest(r);
          }
        }
        if (parsed.data.borrowings && Array.isArray(parsed.data.borrowings)) {
          for (const b of parsed.data.borrowings) {
            await supabaseApi.createBorrowing(b);
          }
        }
        if (parsed.data.preventiveMaintenance && Array.isArray(parsed.data.preventiveMaintenance)) {
          for (const p of parsed.data.preventiveMaintenance) {
            await supabaseApi.createPreventiveMaintenance(p);
          }
        }
        if (parsed.data.liabilities && Array.isArray(parsed.data.liabilities)) {
          for (const l of parsed.data.liabilities) {
            await supabaseApi.createLiability(l);
          }
        }
        if (parsed.data.dropdownOptions) {
          await supabaseApi.saveDropdowns(parsed.data.dropdownOptions);
        }
        if (parsed.data.settings) {
          await supabaseApi.saveSettings(parsed.data.settings);
        }
        if (parsed.data.kpi2026) {
          await supabaseApi.saveKPI2026(parsed.data.kpi2026);
        }
        await refreshFromSupabase();
        await logActivity('BACKUP_RESTORE', 'Supabase', 'snapshot', 'Restored ITM database directly into Supabase PostgreSQL');
      }
    } catch (err) {
      console.error('Failed to parse backup JSON:', err);
      throw new Error('Invalid backup file format');
    }
  };

  const markAlertRead = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  return (
    <ITMContext.Provider
      value={{
        assets,
        onboardings,
        offboardings,
        requests,
        borrowings,
        preventiveMaintenance,
        liabilities,
        activityLogs,
        settings,
        dropdownOptions,
        updateDropdownOptions,
        addDropdownOption,
        editDropdownOption,
        deleteDropdownOption,
        resetDropdownCategoryToDefault,
        kpi2026,
        updateKPI2026,
        resetKPI2026ToDefaults,
        autoSyncKPIFromSystem,
        addOrientationSession,
        deleteOrientationSession,
        addNetsuiteConcern,
        deleteNetsuiteConcern,
        addAsset,
        updateAsset,
        deleteAsset,
        transferAsset,
        markAssetPMSDone,
        addOnboarding,
        updateOnboarding,
        deleteOnboarding,
        addOffboarding,
        updateOffboarding,
        deleteOffboarding,
        addRequest,
        updateRequest,
        deleteRequest,
        addBorrowing,
        updateBorrowing,
        deleteBorrowing,
        addPreventiveMaintenance,
        updatePreventiveMaintenance,
        deletePreventiveMaintenance,
        addLiability,
        updateLiability,
        deleteLiability,
        logActivity,
        updateSettings,
        seedInitialDataToFirebase,
        clearAllData,
        clearAssetsOnly,
        clearDataWithPassword,
        createBackupSnapshot,
        restoreBackupSnapshot,
        currentUser,
        setCurrentUser,
        setUserRole,
        googleWorkspaceUser,
        loginWithGoogleWorkspace,
        logoutGoogleWorkspace,
        language,
        setLanguage,
        t,
        isOnline,
        isSupabaseConnected,
        isFirebaseConnected: isSupabaseConnected,
        isCloudLoading,
        dismissCloudLoading,
        cloudDatabaseId: SUPABASE_DB_HOST,
        dbStatus,
        refreshFromSupabase,
        alerts,
        markAlertRead,
        clearAllAlerts,
        quickSearchQuery,
        setQuickSearchQuery,
        selectedAssetForQR,
        setSelectedAssetForQR,
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </ITMContext.Provider>
  );
};

export const useITM = () => {
  const context = useContext(ITMContext);
  if (!context) {
    throw new Error('useITM must be used within an ITMProvider');
  }
  return context;
};
