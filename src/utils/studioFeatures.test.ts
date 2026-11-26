import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_DESIGN,
  DEFAULT_PACKAGES,
  seedInitialAttendanceLogs,
  seedInitialMembers,
} from './cardLogic';
import {
  buildAnnualAttendanceReportData,
  buildMemberSummaryReportData,
  buildMonthlyAttendanceReportData,
  buildWeeklyAttendanceReportData,
  createWaDeliveryLog,
  DEFAULT_STUDIO_BRANCHES,
  DEFAULT_WA_AUTO_REPLY,
  DEFAULT_WA_TEMPLATES,
  renderWaTemplate,
  updateStudioBranchLocation,
  validateWaPhoneForDelivery,
} from './studioFeatures';
import { decryptStudioBackup, encryptStudioBackup } from './encryptedBackup';

test('updateStudioBranchLocation updates coordinates, title, address, and Google Maps link safely', () => {
  const updated = updateStudioBranchLocation(DEFAULT_STUDIO_BRANCHES, 'utama', {
    title: 'Farid Studio Flagship',
    address: 'Jl. Perintis Kemerdekaan Km.17, Makassar',
    lat: -5.091234,
    lng: 119.518765,
  });

  const utama = updated.find((b) => b.id === 'utama');
  const cabang = updated.find((b) => b.id === 'cabang');
  assert.equal(utama?.title, 'Farid Studio Flagship');
  assert.equal(utama?.position.lat, -5.091234);
  assert.equal(utama?.position.lng, 119.518765);
  assert.match(utama?.mapsUrl || '', /-5\.091234,119\.518765/);
  assert.equal(cabang?.position.lat, DEFAULT_STUDIO_BRANCHES[1].position.lat);

  // Clamps out-of-range coordinates
  const clamped = updateStudioBranchLocation(DEFAULT_STUDIO_BRANCHES, 'cabang', {
    lat: 120,
    lng: -240,
  });
  const clampedBranch = clamped.find((b) => b.id === 'cabang');
  assert.equal(clampedBranch?.position.lat, 90);
  assert.equal(clampedBranch?.position.lng, -180);
});

test('renderWaTemplate interpolates automatic variables and validateWaPhoneForDelivery detects failed numbers', () => {
  const rendered = renderWaTemplate(
    'Halo {{nama}}, kartu {{kartu}} ({{paket}}) kini {{status}} di {{studio}}.',
    {
      nama: 'Rina Marlina',
      kartu: 'FS-0010',
      paket: 'Wisudawan',
      status: 'AKTIF',
      studio: 'Farid Studio Sudiang',
    }
  );
  assert.equal(
    rendered,
    'Halo Rina Marlina, kartu FS-0010 (Wisudawan) kini AKTIF di Farid Studio Sudiang.'
  );

  assert.equal(validateWaPhoneForDelivery('0852-4148-3041').valid, true);
  assert.equal(validateWaPhoneForDelivery('+62 813 4299 8877').valid, true);
  assert.equal(validateWaPhoneForDelivery('-').valid, false);
  assert.equal(validateWaPhoneForDelivery('0812').valid, false);
  assert.equal(validateWaPhoneForDelivery('1234567890').valid, false);

  const validLog = createWaDeliveryLog({
    member: seedInitialMembers()[0],
    template: DEFAULT_WA_TEMPLATES[0],
    triggerType: 'BULK',
    markAsSent: true,
  });
  assert.equal(validLog.status, 'TERKIRIM');
  assert.match(validLog.waUrl, /^https:\/\/wa\.me\/6285241483041\?text=/);

  const failedLog = createWaDeliveryLog({
    member: {
      cardNumber: 'FS-0099',
      name: 'Member Tanpa WA',
      phone: '0812',
      category: 'Umum',
      status: 'AKTIF',
    },
    template: DEFAULT_WA_TEMPLATES[1],
    triggerType: 'AUTO_AKTIF',
  });
  assert.equal(failedLog.status, 'GAGAL');
  assert.ok(failedLog.errorReason);
});

test('Weekly, Monthly, Annual attendance reports and Member Summary report compute accurate totals', () => {
  const ref = new Date('2026-11-25T15:00:00.000Z');
  const seeded = seedInitialAttendanceLogs(ref);

  const weekly = buildWeeklyAttendanceReportData(seeded, ref);
  assert.equal(weekly.totalVisits, 23);
  assert.equal(weekly.dailyBreakdown.length, 7);
  assert.equal(weekly.peakHourLabel, '14:00');

  const monthlyOct = buildMonthlyAttendanceReportData(seeded, '2026-10');
  assert.equal(monthlyOct.totalVisits, 15);
  assert.equal(monthlyOct.startDate, '2026-10-01');
  assert.equal(monthlyOct.endDate, '2026-10-31');

  const annual = buildAnnualAttendanceReportData(seeded, 2026);
  assert.equal(annual.year, 2026);
  assert.equal(annual.monthlyBreakdown.length, 12);
  assert.equal(annual.totalVisits, seeded.length);
  assert.equal(annual.peakMonthVisits, 23);
  assert.ok(annual.categoryComparison.length >= 4);

  const members = [
    ...seedInitialMembers(),
    {
      ...seedInitialMembers()[0],
      cardNumber: 'FS-0003',
      name: 'Slot Kosong',
      status: 'BELUM_AKTIF' as const,
      category: 'Umum',
    },
  ];
  const memberSummary = buildMemberSummaryReportData(members);
  assert.equal(memberSummary.totalMembers, 3);
  assert.equal(memberSummary.activeCount, 2);
  assert.equal(memberSummary.inactiveCount, 1);
});

test('encryptStudioBackup and decryptStudioBackup round-trip AES-GCM payload and reject wrong password', async () => {
  const ref = new Date('2026-11-25T15:00:00.000Z');
  const payload = {
    exportedAt: ref.toISOString(),
    members: seedInitialMembers(),
    packages: DEFAULT_PACKAGES,
    design: DEFAULT_DESIGN,
    attendanceLogs: seedInitialAttendanceLogs(ref),
    securityLogs: [{ ts: '25 Nov 2026', action: 'Test Log', level: 'INFO' as const }],
    duplicateLogs: [],
    studioBranches: DEFAULT_STUDIO_BRANCHES,
    waTemplates: DEFAULT_WA_TEMPLATES,
    waLogs: [],
    waAutoReply: DEFAULT_WA_AUTO_REPLY,
  };

  const envelope = await encryptStudioBackup(payload, 'farid-secret-2026');
  assert.equal(envelope.encrypted, true);
  assert.equal(envelope.algorithm, 'AES-GCM');

  const raw = JSON.stringify(envelope);
  const restored = await decryptStudioBackup(raw, 'farid-secret-2026');
  assert.equal(restored.members.length, payload.members.length);
  assert.equal(restored.attendanceLogs.length, payload.attendanceLogs.length);
  assert.equal(restored.studioBranches[0].title, DEFAULT_STUDIO_BRANCHES[0].title);

  await assert.rejects(
    () => decryptStudioBackup(raw, 'wrong-password'),
    /Kata sandi backup salah/
  );
  await assert.rejects(() => decryptStudioBackup('{not-json', '1234'), /tidak valid/);
});
