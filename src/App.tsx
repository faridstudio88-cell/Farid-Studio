import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Info,
  MapPin,
  ShieldCheck,
  XCircle,
  Zap,
} from 'lucide-react';
import { AdminAutoAccTab } from './components/AdminAutoAccTab';
import { DesignStudioTab } from './components/DesignStudioTab';
import { ExcelDatabaseTab } from './components/ExcelDatabaseTab';
import { HeaderNav } from './components/HeaderNav';
import { MassQrTab } from './components/MassQrTab';
import {
  ChangePinModal,
  KtpModal,
  PinModal,
  PublicQrScannerModal,
  SecurityAuditModal,
} from './components/Modals';
import { PackagesAttendanceTab } from './components/PackagesAttendanceTab';
import { PortalTab } from './components/PortalTab';
import { RegisterTab } from './components/RegisterTab';
import {
  auth,
  onAuthStateChanged,
  signInWithGoogle,
  signOutFirebase,
} from './lib/firebase';
import type {
  AppTab,
  AttendanceLog,
  CardDesignConfig,
  DuplicateAttemptLog,
  MemberRecord,
  PackageConfig,
  SecurityLog,
  ToastMessage,
} from './types/studio';
import {
  applyAutoAccCard,
  DEFAULT_DESIGN,
  DEFAULT_MASTER_KEY_HASH,
  DEFAULT_PACKAGES,
  DEFAULT_PIN_HASH,
  extractCardNumberFromScan,
  formatSerialDigits,
  formatWhatsAppUrl,
  generateBatchMemberSlots,
  getCardDesignLabel,
  mapMembersForExcelExport,
  normalizeCardNumber,
  parseImportedExcelRows,
  processAttendanceCheckInRecord,
  seedInitialAttendanceLogs,
  seedInitialMembers,
  sha256Hex,
  STORAGE_KEY,
  upsertMemberRegistration,
} from './utils/cardLogic';

const DEVICE_LOCK_KEY = 'farid_studio_device_member_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('mass-qr');
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [packages, setPackages] = useState<PackageConfig[]>(DEFAULT_PACKAGES);
  const [design, setDesign] = useState<CardDesignConfig>(DEFAULT_DESIGN);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [duplicateLogs, setDuplicateLogs] = useState<DuplicateAttemptLog[]>([]);
  const [deviceRegisteredCard, setDeviceRegisteredCard] = useState<string | null>(null);
  const [massQrMode, setMassQrMode] = useState(false);

  const [pinHash, setPinHash] = useState('');
  const [masterKeyHash, setMasterKeyHash] = useState('');
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [autoLockOnBlur, setAutoLockOnBlur] = useState(true);
  const [idleSecondsLeft, setIdleSecondsLeft] = useState(300);

  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState<AppTab | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const [changePinOpen, setChangePinOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [ktpTargetCard, setKtpTargetCard] = useState<string | null>(null);
  const [publicScannerOpen, setPublicScannerOpen] = useState(false);

  const [prefilledCard, setPrefilledCard] = useState('');
  const [prefilledCategory, setPrefilledCategory] = useState('Umum');
  const [qrAutofilled, setQrAutofilled] = useState(false);
  const [portalQuery, setPortalQuery] = useState('');

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);
  const [cloudUserEmail, setCloudUserEmail] = useState<string | null>(null);
  const [cloudIdToken, setCloudIdToken] = useState<string | null>(null);
  const [cloudSyncBusy, setCloudSyncBusy] = useState(false);

  const notify = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const appendSecurityLog = useCallback((action: string, level: SecurityLog['level'] = 'INFO') => {
    const ts = new Date().toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setSecurityLogs((prev) => [{ ts, action, level }, ...prev].slice(0, 80));
  }, []);

  useEffect(() => {
    function init() {
      let nextPin = DEFAULT_PIN_HASH;
      let nextMk = DEFAULT_MASTER_KEY_HASH;
      let nextBlur = true;
      let nextSecLogs: SecurityLog[] = [];
      let nextDupLogs: DuplicateAttemptLog[] = [];
      let nextDeviceCard: string | null = null;
      let nextDesign: CardDesignConfig = DEFAULT_DESIGN;
      let nextPackages: PackageConfig[] = DEFAULT_PACKAGES;
      let nextMembers: MemberRecord[] = seedInitialMembers();
      let nextAttendance: AttendanceLog[] = seedInitialAttendanceLogs();

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.pinHash) nextPin = parsed.pinHash;
          if (parsed.masterKeyHash) nextMk = parsed.masterKeyHash;
          if (typeof parsed.autoLockOnBlur === 'boolean') nextBlur = parsed.autoLockOnBlur;
          if (Array.isArray(parsed.securityLogs)) nextSecLogs = parsed.securityLogs;
          if (Array.isArray(parsed.duplicateLogs)) nextDupLogs = parsed.duplicateLogs;
          if (parsed.design) {
            nextDesign = { ...DEFAULT_DESIGN, ...parsed.design };
            if (!nextDesign.phoneText || nextDesign.phoneText === '085241483041') {
              nextDesign.phoneText = DEFAULT_DESIGN.phoneText;
            }
          }
          if (Array.isArray(parsed.packages) && parsed.packages.length > 0) {
            nextPackages = parsed.packages;
          }
          if (Array.isArray(parsed.members)) nextMembers = parsed.members;
          if (Array.isArray(parsed.attendanceLogs)) nextAttendance = parsed.attendanceLogs;
        }
        nextDeviceCard = localStorage.getItem(DEVICE_LOCK_KEY);
      } catch {
        // Use seeded defaults when storage is unavailable or corrupted
      }

      setPinHash(nextPin);
      setMasterKeyHash(nextMk);
      setAutoLockOnBlur(nextBlur);
      setSecurityLogs(nextSecLogs);
      setDuplicateLogs(nextDupLogs);
      setDeviceRegisteredCard(nextDeviceCard || null);
      setDesign(nextDesign);
      setPackages(nextPackages);
      setMembers(nextMembers);
      setAttendanceLogs(nextAttendance);
      setHydrated(true);

      const params = new URLSearchParams(window.location.search);
      const urlCard = params.get('kartu');
      const isAutoQr = params.get('auto') === '1';
      const isMassQr = params.get('mode') === 'daftar-member';
      const isAdminEntry = params.get('admin') === '1' || window.location.hash === '#admin';
      if (isAdminEntry) {
        setPendingTab('admin');
        setPinModalOpen(true);
      } else if (urlCard || isAutoQr || isMassQr || window.location.hash === '#daftar') {
        setActiveTab('register');
        if (isMassQr || window.location.hash === '#daftar') {
          setMassQrMode(true);
        }
        if (urlCard) {
          const extracted = extractCardNumberFromScan(`?kartu=${urlCard}`, nextDesign.serialPrefix);
          if (extracted) {
            setPrefilledCard(extracted);
            setQrAutofilled(true);
          }
        }
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          pinHash,
          masterKeyHash,
          autoLockOnBlur,
          securityLogs,
          duplicateLogs,
          design,
          packages,
          members,
          attendanceLogs,
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [
    hydrated,
    pinHash,
    masterKeyHash,
    autoLockOnBlur,
    securityLogs,
    duplicateLogs,
    design,
    packages,
    members,
    attendanceLogs,
  ]);

  const lockAdminSession = useCallback(
    (reason = 'Sesi Admin dikunci') => {
      setAdminUnlocked(false);
      appendSecurityLog(reason, 'INFO');
      setActiveTab((prev) =>
        ['admin', 'design', 'excel', 'attendance'].includes(prev) ? 'mass-qr' : prev
      );
      notify(reason, 'info');
    },
    [appendSecurityLog, notify]
  );

  useEffect(() => {
    if (!adminUnlocked) return;
    setIdleSecondsLeft(300);
    const id = window.setInterval(() => {
      setIdleSecondsLeft((sec) => {
        if (sec <= 1) {
          lockAdminSession('Otomatis terkunci karena idle 5 menit');
          return 0;
        }
        return sec - 1;
      });
    }, 1000);

    const resetIdle = () => setIdleSecondsLeft(300);
    window.addEventListener('mousemove', resetIdle, { passive: true });
    window.addEventListener('keydown', resetIdle, { passive: true });
    window.addEventListener('click', resetIdle, { passive: true });

    return () => {
      window.clearInterval(id);
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('click', resetIdle);
    };
  }, [adminUnlocked, lockAdminSession]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && adminUnlocked && autoLockOnBlur) {
        lockAdminSession('Otomatis terkunci karena berpindah tab/aplikasi');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [adminUnlocked, autoLockOnBlur, lockAdminSession]);

  useEffect(() => {
    const handleAdminShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey || e.altKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (!adminUnlocked) {
          setPendingTab('admin');
          setPinModalOpen(true);
        } else {
          setActiveTab('admin');
        }
      }
    };
    window.addEventListener('keydown', handleAdminShortcut);
    return () => window.removeEventListener('keydown', handleAdminShortcut);
  }, [adminUnlocked]);

  useEffect(() => {
    if (lockoutUntil <= Date.now()) {
      setLockoutSeconds(0);
      return;
    }
    const tick = () => {
      const rem = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setLockoutSeconds(Math.max(0, rem));
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [lockoutUntil]);

  useEffect(() => {
    const onQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCloudUserEmail(user.email || user.displayName || 'Admin Google');
        try {
          const token = await user.getIdToken();
          setCloudIdToken(token);
        } catch {
          setCloudIdToken(null);
        }
      } else {
        setCloudUserEmail(null);
        setCloudIdToken(null);
      }
    });
    return () => unsub();
  }, []);

  const syncWithCloudSql = useCallback(
    async (tokenOverride?: string) => {
      const token = tokenOverride || cloudIdToken;
      if (!token) {
        notify('Silakan masuk dengan akun Google terlebih dahulu.', 'error');
        return;
      }
      setCloudSyncBusy(true);
      try {
        const pushRes = await fetch('/api/studio/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            members,
            attendanceLogs,
            duplicateLogs,
          }),
        });
        if (!pushRes.ok) {
          const errData = (await pushRes.json().catch(() => ({}))) as { error?: string };
          notify(errData.error || 'Gagal menyinkronkan database studio.', 'error');
          return;
        }
        const stateRes = await fetch('/api/studio/state', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (stateRes.ok) {
          const data = (await stateRes.json()) as {
            configured?: boolean;
            members?: MemberRecord[];
            attendanceLogs?: AttendanceLog[];
            duplicateLogs?: DuplicateAttemptLog[];
          };
          if (data.configured && Array.isArray(data.members) && data.members.length > 0) {
            setMembers(data.members);
          }
          if (
            data.configured &&
            Array.isArray(data.attendanceLogs) &&
            data.attendanceLogs.length > 0
          ) {
            setAttendanceLogs(data.attendanceLogs);
          }
          if (
            data.configured &&
            Array.isArray(data.duplicateLogs) &&
            data.duplicateLogs.length > 0
          ) {
            setDuplicateLogs(data.duplicateLogs);
          }
        }
        notify('Database member & presensi berhasil disinkronkan!', 'success');
      } catch {
        notify('Gagal terhubung ke server sinkronisasi.', 'error');
      } finally {
        setCloudSyncBusy(false);
      }
    },
    [cloudIdToken, members, attendanceLogs, duplicateLogs, notify]
  );

  const handleGoogleSignIn = useCallback(async () => {
    try {
      const { user, idToken } = await signInWithGoogle();
      setCloudUserEmail(user.email || user.displayName || 'Admin Google');
      setCloudIdToken(idToken);
      appendSecurityLog(`Login Google Admin berhasil (${user.email || user.uid})`, 'INFO');
      notify(`Masuk sebagai ${user.email || user.displayName}`, 'success');
      await syncWithCloudSql(idToken);
    } catch {
      notify('Login Google dibatalkan atau gagal.', 'error');
    }
  }, [appendSecurityLog, notify, syncWithCloudSql]);

  const handleGoogleSignOut = useCallback(async () => {
    try {
      await signOutFirebase();
      setCloudUserEmail(null);
      setCloudIdToken(null);
      notify('Akun Google Admin telah keluar.', 'info');
    } catch {
      notify('Gagal keluar dari akun Google.', 'error');
    }
  }, [notify]);

  function handleSelectTab(tab: AppTab) {
    const adminTabs: AppTab[] = ['admin', 'design', 'excel', 'attendance'];
    if (adminTabs.includes(tab) && !adminUnlocked) {
      setPendingTab(tab);
      setPinModalOpen(true);
      return;
    }
    setActiveTab(tab);
  }

  async function handleVerifyAdmin(pin: string, masterKey: string) {
    if (lockoutUntil > Date.now()) return;
    const [enteredPin, enteredMk] = await Promise.all([
      sha256Hex(pin.trim()),
      sha256Hex(masterKey.trim().toUpperCase()),
    ]);

    if (enteredPin === pinHash && enteredMk === masterKeyHash) {
      setFailedAttempts(0);
      setLockoutUntil(0);
      setAdminUnlocked(true);
      setPinModalOpen(false);
      appendSecurityLog('Login Admin 2FA berhasil', 'INFO');
      notify('Akses Admin Super Ketat berhasil dibuka!', 'success');
      if (pendingTab) {
        setActiveTab(pendingTab);
        setPendingTab(null);
      } else {
        setActiveTab('admin');
      }
    } else {
      const nextFails = failedAttempts + 1;
      appendSecurityLog(`Percobaan login Admin gagal (${nextFails}/3)`, 'WARN');
      if (nextFails >= 3) {
        setLockoutUntil(Date.now() + 60000);
        setFailedAttempts(0);
        appendSecurityLog('Kunci sementara 60 detik aktif karena 3x gagal login', 'ALERT');
      } else {
        setFailedAttempts(nextFails);
      }
      notify('PIN Admin atau Master Security Key salah!', 'error');
    }
  }

  async function handleSaveNewPin(newPin: string, newMk: string) {
    if (newPin.trim().length < 4 || newMk.trim().length < 4) {
      notify('PIN baru dan Master Key baru masing-masing minimal 4 karakter!', 'error');
      return;
    }
    const [pHash, mHash] = await Promise.all([
      sha256Hex(newPin.trim()),
      sha256Hex(newMk.trim().toUpperCase()),
    ]);
    setPinHash(pHash);
    setMasterKeyHash(mHash);
    appendSecurityLog('Kredensial PIN Admin & Master Key diperbarui', 'WARN');
    setChangePinOpen(false);
    notify('PIN Admin & Master Security Key baru berhasil disimpan!', 'success');
  }

  function handleRegisterSubmit(payload: {
    rawCardNumber: string;
    name: string;
    phone: string;
    category: string;
    org: string;
    address: string;
  }) {
    const pkg = packages.find((p) => p.id === payload.category);
    if (deviceRegisteredCard) {
      const existingDeviceMember = members.find(
        (m) => m.cardNumber.toUpperCase() === deviceRegisteredCard.toUpperCase()
      );
      const ts = new Date().toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const dupLog: DuplicateAttemptLog = {
        id: `DUP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ts,
        reason: 'DEVICE_ALREADY_REGISTERED',
        cardNumber: normalizeCardNumber(payload.rawCardNumber, pkg?.prefix || design.serialPrefix),
        attemptedName: payload.name.trim(),
        attemptedPhone: payload.phone.trim(),
        matchedCardNumber: deviceRegisteredCard,
        matchedName: existingDeviceMember?.name || deviceRegisteredCard,
      };
      setDuplicateLogs((prev) => [dupLog, ...prev].slice(0, 100));
      appendSecurityLog(`Blokir daftar 2x dari perangkat terkunci (${deviceRegisteredCard})`, 'WARN');
      const err = `Pencegahan Daftar 2x: Perangkat ini sudah terdaftar untuk kartu ${deviceRegisteredCard}.`;
      notify(err, 'error');
      return {
        saved: null,
        error: err,
        duplicateReason: 'DEVICE_ALREADY_REGISTERED' as const,
        matchedMember: existingDeviceMember,
      };
    }

    const res = upsertMemberRegistration(members, {
      ...payload,
      defaultPrefix: pkg?.prefix || design.serialPrefix,
      theme: design.theme,
    });
    if (res.error || !res.saved) {
      if (
        (res.duplicateReason === 'CARD_ALREADY_ACTIVE' ||
          res.duplicateReason === 'PHONE_ALREADY_REGISTERED') &&
        res.matchedMember
      ) {
        const ts = new Date().toLocaleString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        const dupLog: DuplicateAttemptLog = {
          id: `DUP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ts,
          reason: res.duplicateReason,
          cardNumber: normalizeCardNumber(payload.rawCardNumber, pkg?.prefix || design.serialPrefix),
          attemptedName: payload.name.trim(),
          attemptedPhone: payload.phone.trim(),
          matchedCardNumber: res.matchedMember.cardNumber,
          matchedName: res.matchedMember.name,
        };
        setDuplicateLogs((prev) => [dupLog, ...prev].slice(0, 100));
        appendSecurityLog(
          `Blokir daftar 2x (${res.duplicateReason}): ${dupLog.cardNumber} / ${dupLog.attemptedPhone}`,
          'WARN'
        );
      }
      notify(res.error || 'Gagal menyimpan registrasi.', 'error');
      return {
        saved: null,
        error: res.error,
        duplicateReason: res.duplicateReason,
        matchedMember: res.matchedMember,
      };
    }
    setMembers(res.members);
    setDeviceRegisteredCard(res.saved.cardNumber);
    try {
      localStorage.setItem(DEVICE_LOCK_KEY, res.saved.cardNumber);
    } catch {
      // Ignore storage errors
    }
    notify(`Selamat ${res.saved.name}! Kartu ${res.saved.cardNumber} sekarang sudah AKTIF.`, 'success');
    return { saved: res.saved };
  }

  function handleAutoAcc(val: string): string | null {
    const res = applyAutoAccCard(members, val, design.serialPrefix, design.theme);
    if (res.alreadyActiveCard) {
      notify(`Kartu ${res.alreadyActiveCard} sudah berstatus AKTIF sebelumnya.`, 'info');
      return null;
    }
    if (res.activatedCard) {
      setMembers(res.members);
      notify(`Kartu ${res.activatedCard} Auto-ACC AKTIF!`, 'success');
    }
    return res.activatedCard;
  }

  function handleToggleStatus(cardNumber: string) {
    setMembers((prev) =>
      prev.map((m) =>
        m.cardNumber === cardNumber
          ? { ...m, status: m.status === 'AKTIF' ? 'BELUM_AKTIF' : 'AKTIF' }
          : m
      )
    );
    notify(`Status kartu ${cardNumber} diperbarui.`, 'info');
  }

  function handleSaveKtp(
    cardNumber: string,
    data: { nik: string; kkNumber: string; kkRelation: string; ktpAddress: string }
  ) {
    setMembers((prev) =>
      prev.map((m) =>
        m.cardNumber === cardNumber
          ? {
              ...m,
              nik: data.nik.trim(),
              kkNumber: data.kkNumber.trim(),
              kkRelation: data.kkRelation,
              ktpAddress: data.ktpAddress.trim(),
            }
          : m
      )
    );
    setKtpTargetCard(null);
    notify(`Data KTP & KK untuk ${cardNumber} berhasil disimpan.`, 'success');
  }

  function handleGenerateBatchSlots(opts: {
    packageId: string;
    prefix: string;
    start: number;
    end: number;
  }) {
    const res = generateBatchMemberSlots(members, { ...opts, theme: design.theme });
    setMembers(res.members);
    return res.createdCards;
  }

  function handleExportMembersExcel(customFilename?: string) {
    const rows = mapMembersForExcelExport(members, design.theme);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Member');
    XLSX.writeFile(
      wb,
      customFilename || `DataMember_FaridStudio_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    notify('File Excel Data Member (.xlsx) berhasil diunduh!', 'success');
  }

  function handleImportMembersExcel(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        const res = parseImportedExcelRows(members, json, design.serialPrefix, design.theme);
        setMembers(res.members);
        notify(`${res.importedCount} baris data berhasil diimpor dari Excel!`, 'success');
      } catch {
        notify('Gagal membaca file Excel. Pastikan format kolom sesuai.', 'error');
      }
      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  }

  function handleUpdateExcelCell(index: number, field: keyof MemberRecord, value: string) {
    setMembers((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      const cleaned =
        field === 'cardNumber' ? normalizeCardNumber(value, design.serialPrefix) : value.trim();
      next[index] = { ...next[index], [field]: cleaned };
      return next;
    });
  }

  function handleDeleteExcelRow(index: number) {
    const removed = members[index];
    if (!removed) return;
    setMembers((prev) => prev.filter((_, i) => i !== index));
    appendSecurityLog(`Menghapus baris member ${removed.cardNumber} (${removed.name}) dari Excel`, 'WARN');
    notify(`Data ${removed.cardNumber} dihapus dari spreadsheet.`, 'info');
  }

  function handleClearAllExcel() {
    const total = members.length;
    setMembers([]);
    appendSecurityLog(`Menghapus SEMUA (${total}) baris data Excel member`, 'ALERT');
    notify(`Seluruh (${total}) data member di Excel telah dihapus.`, 'info');
  }

  function handleAddExcelRow() {
    const nextNum = members.length + 1;
    setMembers((prev) => [
      {
        cardNumber: `FS-${formatSerialDigits(nextNum)}`,
        name: 'Member Baru',
        phone: '-',
        category: 'Umum',
        cardDesign: getCardDesignLabel(design.theme),
        org: '-',
        address: '-',
        nik: '',
        kkNumber: '',
        kkRelation: 'Kepala Keluarga',
        ktpAddress: '',
        status: 'AKTIF',
        registeredAt: new Date().toLocaleDateString('id-ID'),
        notes: 'Ditambahkan Admin',
      },
      ...prev,
    ]);
  }

  function handleCheckIn(rawInput: string, purpose: string) {
    const res = processAttendanceCheckInRecord(
      members,
      attendanceLogs,
      rawInput,
      purpose,
      design.serialPrefix
    );
    if (res.status === 'ok' && res.log) {
      setAttendanceLogs(res.logs);
      notify(`Kehadiran dicatat: ${res.log.name} (${res.log.cardNumber})`, 'success');
    }
    return {
      status: res.status,
      cardNumber: res.cardNumber,
      log: res.log,
      memberName: res.member?.name,
      memberStatus: res.member?.status,
    };
  }

  function handleExportAttendance() {
    if (attendanceLogs.length === 0) {
      notify('Belum ada data kehadiran untuk diekspor.', 'error');
      return;
    }
    const rows = attendanceLogs.map((l, idx) => ({
      No: idx + 1,
      'Waktu Check-In': l.timestamp,
      'Nomor Kartu': l.cardNumber,
      'Nama Member': l.name,
      'Paket Member': l.category,
      'No. WhatsApp': l.phone,
      'Keperluan Kunjungan': l.purpose,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kehadiran Studio');
    XLSX.writeFile(wb, `Kehadiran_FaridStudio_${new Date().toISOString().slice(0, 10)}.xlsx`);
    notify('File Excel kehadiran studio berhasil diunduh.', 'success');
  }

  function handleQrDetectedFromModal(rawData: string) {
    setPublicScannerOpen(false);
    setActiveTab('register');
    const cardNo = extractCardNumberFromScan(rawData, design.serialPrefix);
    if (cardNo && !cardNo.startsWith('HTTP')) {
      setPrefilledCard(cardNo);
      setQrAutofilled(true);
      const prefixMatch = cardNo.match(/^([A-Z0-9]+)-/);
      if (prefixMatch) {
        const matchedPkg = packages.find(
          (p) => (p.prefix || '').toUpperCase() === prefixMatch[1]
        );
        if (matchedPkg) setPrefilledCategory(matchedPkg.id);
      }
      notify(`QR Kartu ${cardNo} terbaca otomatis!`, 'success');
    } else {
      setQrAutofilled(false);
      notify('QR Daftar Otomatis terbuka! Masukkan Nomor Seri Kartu Anda.', 'success');
    }
  }

  const registrationUrl = `${window.location.href.split('#')[0].split('?')[0]}?mode=daftar-member#daftar`;
  const ktpMember = ktpTargetCard
    ? members.find((m) => m.cardNumber === ktpTargetCard) || null
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#F6F8FA] text-slate-900">
      {/* Toast Notifications */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 z-50 flex max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-semibold shadow-lg ${
              t.type === 'success'
                ? 'border-emerald-700 bg-emerald-950 text-white'
                : t.type === 'error'
                  ? 'border-rose-700 bg-rose-950 text-white'
                  : 'border-slate-700 bg-slate-900 text-white'
            }`}
          >
            {t.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
            ) : t.type === 'error' ? (
              <XCircle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
            ) : (
              <Info className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      <HeaderNav
        activeTab={activeTab}
        adminUnlocked={adminUnlocked}
        idleSecondsLeft={idleSecondsLeft}
        onSelectTab={handleSelectTab}
        onLockAdmin={() => lockAdminSession('Kunci manual oleh Admin')}
      />

      {mapsQuotaExceeded && (
        <div
          role="status"
          className="border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-950"
        >
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 sm:px-6 lg:px-8">
            <p className="inline-flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              <span>
                Batas kuota harian peta Google Maps (100 req/hari) telah tercapai. Menampilkan info cabang ringkas.
              </span>
            </p>
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-amber-900 underline hover:text-amber-700"
            >
              Panduan Kuota Google Maps
            </a>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-7 sm:px-6 lg:px-8">
        {/* Executive Status Ribbon */}
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white px-4 py-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-800">
              <CreditCard className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Standar Cetak</p>
              <p className="tabular-nums text-xs font-extrabold text-slate-900 sm:text-sm">
                CR80 · 300 DPI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white px-4 py-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Zap className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Aktivasi Kartu</p>
              <p className="text-xs font-extrabold text-slate-900 sm:text-sm">
                Instan &amp; Auto-ACC
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white px-4 py-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Privasi Identitas</p>
              <p className="text-xs font-extrabold text-slate-900 sm:text-sm">
                Terenkripsi Admin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTab('portal');
              window.setTimeout(() => {
                document.getElementById('studio-map-section')?.scrollIntoView({ behavior: 'smooth' });
              }, 80);
            }}
            className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-left transition-colors hover:border-cyan-600 hover:bg-cyan-50/30"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <MapPin className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Lokasi &amp; Rute Peta</p>
              <p className="text-xs font-extrabold text-slate-900 sm:text-sm">
                Sudiang · Makassar
              </p>
            </div>
          </button>
        </div>

        {activeTab === 'mass-qr' && (
          <MassQrTab
            registrationUrl={registrationUrl}
            addressMain={design.addressMain}
            onCopyUrl={() => {
              navigator.clipboard?.writeText(registrationUrl).catch(() => {});
              notify('Tautan QR Massal daftar member berhasil disalin!', 'success');
            }}
            onOpenRegister={() => {
              setMassQrMode(true);
              setActiveTab('register');
            }}
            onNotify={notify}
          />
        )}

        {activeTab === 'register' && (
          <RegisterTab
            members={members}
            packages={packages}
            design={design}
            prefilledCard={prefilledCard}
            prefilledCategory={prefilledCategory}
            qrAutofilled={qrAutofilled}
            massQrMode={massQrMode}
            deviceRegisteredCard={deviceRegisteredCard}
            onSubmitRegistration={handleRegisterSubmit}
            onOpenQrScanner={() => setPublicScannerOpen(true)}
            onGoToPortal={(card) => {
              if (card) setPortalQuery(card);
              setActiveTab('portal');
            }}
            onResetDeviceLock={() => {
              setDeviceRegisteredCard(null);
              try {
                localStorage.removeItem(DEVICE_LOCK_KEY);
              } catch {
                // Ignore storage errors
              }
              notify('Mode meja kasir siap mendaftarkan pelanggan baru lainnya.', 'info');
            }}
          />
        )}

        {activeTab === 'portal' && (
          <PortalTab
            members={members}
            design={design}
            packages={packages}
            prefilledQuery={portalQuery}
            mapsQuotaExceeded={mapsQuotaExceeded}
          />
        )}

        {activeTab === 'admin' && adminUnlocked && (
          <AdminAutoAccTab
            members={members}
            duplicateLogs={duplicateLogs}
            autoLockOnBlur={autoLockOnBlur}
            adminPhone={design.phoneText}
            cloudUserEmail={cloudUserEmail}
            cloudSyncBusy={cloudSyncBusy}
            onSaveAdminPhone={(nextPhone) => {
              const cleaned = nextPhone.trim() || DEFAULT_DESIGN.phoneText;
              setDesign((prev) => ({ ...prev, phoneText: cleaned }));
              appendSecurityLog(`Nomor WhatsApp Admin & Kartu diperbarui ke ${cleaned}`, 'INFO');
              notify(`Nomor WhatsApp Admin & Kartu CR80 diperbarui: ${cleaned}`, 'success');
            }}
            onGoogleSignIn={handleGoogleSignIn}
            onGoogleSignOut={handleGoogleSignOut}
            onSyncCloudSql={() => syncWithCloudSql()}
            onAutoAccInput={handleAutoAcc}
            onToggleBlurAutoLock={setAutoLockOnBlur}
            onOpenKtpModal={(cardNo) => setKtpTargetCard(cardNo)}
            onToggleMemberStatus={handleToggleStatus}
            onOpenAuditModal={() => setAuditModalOpen(true)}
            onOpenChangePinModal={() => setChangePinOpen(true)}
            onClearDuplicateLogs={() => {
              setDuplicateLogs([]);
              notify('Riwayat blokir daftar ulang telah dibersihkan.', 'info');
            }}
          />
        )}

        {activeTab === 'design' && adminUnlocked && (
          <DesignStudioTab
            design={design}
            packages={packages}
            members={members}
            onChangeDesign={setDesign}
            onSaveDesign={() => notify('Pengaturan desain kartu CR80 berhasil disimpan!', 'success')}
            onGenerateBatchSlots={handleGenerateBatchSlots}
            onExportExcelAuto={handleExportMembersExcel}
            onNotify={notify}
          />
        )}

        {activeTab === 'excel' && adminUnlocked && (
          <ExcelDatabaseTab
            members={members}
            design={design}
            onUpdateCell={handleUpdateExcelCell}
            onDeleteRow={handleDeleteExcelRow}
            onClearAll={handleClearAllExcel}
            onAddRow={handleAddExcelRow}
            onExportExcel={() => handleExportMembersExcel()}
            onImportExcel={handleImportMembersExcel}
          />
        )}

        {activeTab === 'attendance' && adminUnlocked && (
          <PackagesAttendanceTab
            packages={packages}
            attendanceLogs={attendanceLogs}
            onSavePackages={(next) => {
              setPackages(next);
              notify('Pengaturan paket harga, kode seri & label kartu tersimpan!', 'success');
            }}
            onSelectPackageForReg={(pkgId) => {
              setPrefilledCategory(pkgId);
              setActiveTab('register');
            }}
            onCheckIn={handleCheckIn}
            onDeleteLog={(id) => setAttendanceLogs((prev) => prev.filter((l) => l.id !== id))}
            onClearLogs={() => {
              setAttendanceLogs([]);
              notify('Seluruh riwayat kehadiran studio telah dibersihkan.', 'info');
            }}
            onExportAttendance={handleExportAttendance}
          />
        )}
      </main>

      <footer className="mt-10 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <p
            onDoubleClick={() => {
              if (!adminUnlocked) {
                setPendingTab('admin');
                setPinModalOpen(true);
              } else {
                setActiveTab('admin');
              }
            }}
            className="font-semibold text-slate-700 select-none"
          >
            &copy; 2026 Farid Studio Multimedia — Sistem Keanggotaan CR80 &amp; Presensi Studio.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center sm:text-right">
            <span>
              Jl. Perintis Kemerdekaan Km.16 No.49 Sudiang &bull; Jl. Poros Taman Sudiang Indah
            </span>
            {formatWhatsAppUrl(design.phoneText) && (
              <a
                href={formatWhatsAppUrl(design.phoneText)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono font-bold text-cyan-800 hover:underline"
              >
                WA Admin: {design.phoneText}
              </a>
            )}
          </div>
        </div>
      </footer>

      <PinModal
        open={pinModalOpen}
        lockoutSeconds={lockoutSeconds}
        onClose={() => {
          setPinModalOpen(false);
          setPendingTab(null);
        }}
        onVerify={handleVerifyAdmin}
      />

      <ChangePinModal
        open={changePinOpen}
        onClose={() => setChangePinOpen(false)}
        onSave={handleSaveNewPin}
      />

      <KtpModal
        member={ktpMember}
        onClose={() => setKtpTargetCard(null)}
        onSave={handleSaveKtp}
      />

      <SecurityAuditModal
        open={auditModalOpen}
        logs={securityLogs}
        onClose={() => setAuditModalOpen(false)}
      />

      <PublicQrScannerModal
        open={publicScannerOpen}
        onClose={() => setPublicScannerOpen(false)}
        onDetected={handleQrDetectedFromModal}
        onCameraError={() => {
          setPublicScannerOpen(false);
          setActiveTab('register');
          notify('Kamera tidak tersedia. Silakan ketik Nomor Seri Kartu Anda secara manual.', 'info');
        }}
      />
    </div>
  );
}
