import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeRegistrationDuplicates,
  applyAutoAccCard,
  buildAttendanceDashboardSummary,
  buildCategoryVisitDistribution,
  buildFilteredAttendanceDashboardSummary,
  buildHourlyPeakStats,
  buildLast7DaysCheckInStats,
  buildMonthlyVisitTrend,
  DEFAULT_DESIGN,
  DEFAULT_MASTER_KEY_HASH,
  DEFAULT_PIN_HASH,
  extractCardNumberFromScan,
  extractLogHour,
  filterAttendanceLogsByDateRange,
  formatSerialDigits,
  formatWhatsAppUrl,
  generateBatchMemberSlots,
  normalizeCardNumber,
  normalizeDateRange,
  normalizePhoneNumber,
  parseImportedExcelRows,
  processAttendanceCheckInRecord,
  resolveAttendanceDatePreset,
  seedInitialAttendanceLogs,
  seedInitialMembers,
  sha256Hex,
  upsertMemberRegistration,
} from './cardLogic';

test('formatSerialDigits pads numbers below 10000 to 4 digits and preserves larger', () => {
  assert.equal(formatSerialDigits(1), '0001');
  assert.equal(formatSerialDigits(45), '0045');
  assert.equal(formatSerialDigits(10000), '10000');
});

test('normalizeCardNumber handles digits, prefixless, and hyphenated formats', () => {
  assert.equal(normalizeCardNumber('5', 'FS'), 'FS-0005');
  assert.equal(normalizeCardNumber('vip-12', 'FS'), 'VIP-0012');
  assert.equal(normalizeCardNumber('exc0007', 'FS'), 'EXC-0007');
  assert.equal(normalizeCardNumber('', 'FS'), '');
});

test('extractCardNumberFromScan parses ?kartu= URLs and raw codes', () => {
  assert.equal(
    extractCardNumberFromScan('https://faridstudio.id/?kartu=VIP-0042#daftar', 'FS'),
    'VIP-0042'
  );
  assert.equal(extractCardNumberFromScan('0009', 'FS'), 'FS-0009');
  assert.equal(extractCardNumberFromScan('EXC-0010', 'FS'), 'EXC-0010');
});

test('sha256Hex returns deterministic 64-char hex digest and default hashes are 64-char SHA-256', async () => {
  const h1 = await sha256Hex('test-secret');
  const h2 = await sha256Hex('test-secret');
  assert.equal(h1, h2);
  assert.equal(h1.length, 64);
  assert.equal(DEFAULT_PIN_HASH.length, 64);
  assert.equal(DEFAULT_MASTER_KEY_HASH.length, 64);
});

test('upsertMemberRegistration validates required inputs and activates member', () => {
  const base = seedInitialMembers();
  const invalid = upsertMemberRegistration(base, {
    rawCardNumber: '',
    name: 'Budi',
    phone: '0812',
    category: 'Umum',
  });
  assert.equal(invalid.saved, null);
  assert.ok(invalid.error);

  const valid = upsertMemberRegistration(base, {
    rawCardNumber: '0005',
    name: 'Budi Santoso',
    phone: '08123456789',
    category: 'VIP',
    defaultPrefix: 'VIP',
    registeredAt: '25 Nov 2026',
  });
  assert.equal(valid.saved?.cardNumber, 'VIP-0005');
  assert.equal(valid.saved?.status, 'AKTIF');
  assert.equal(valid.members.length, base.length + 1);
});

test('applyAutoAccCard requires >=4 digits and activates existing or new card', () => {
  const base = seedInitialMembers();
  const ignored = applyAutoAccCard(base, '00');
  assert.equal(ignored.activatedCard, null);

  const activated = applyAutoAccCard(base, '0009', 'FS');
  assert.equal(activated.activatedCard, 'FS-0009');
  assert.equal(activated.members[0].cardNumber, 'FS-0009');
  assert.equal(activated.members[0].status, 'AKTIF');
});

test('generateBatchMemberSlots creates BELUM_AKTIF slots with design label', () => {
  const base = seedInitialMembers();
  const res = generateBatchMemberSlots(base, {
    packageId: 'Umum',
    prefix: 'FS',
    start: 10,
    end: 12,
    theme: 'royal-navy',
  });
  assert.deepEqual(res.createdCards, ['FS-0010', 'FS-0011', 'FS-0012']);
  assert.equal(res.members.length, base.length + 3);
  const slot10 = res.members.find((m) => m.cardNumber === 'FS-0010');
  assert.equal(slot10?.status, 'BELUM_AKTIF');
  assert.equal(slot10?.cardDesign, 'Royal Navy & Gold');
});

test('processAttendanceCheckInRecord rejects unknown/inactive and logs active members', () => {
  const base = seedInitialMembers();
  const withBatch = generateBatchMemberSlots(base, {
    packageId: 'Umum',
    prefix: 'FS',
    start: 10,
    end: 10,
    theme: 'teal-modern',
  }).members;

  const missing = processAttendanceCheckInRecord(withBatch, [], 'FS-9999', 'Sesi Foto Studio');
  assert.equal(missing.status, 'not_found');

  const inactive = processAttendanceCheckInRecord(withBatch, [], 'FS-0010', 'Sesi Foto Studio');
  assert.equal(inactive.status, 'inactive');

  const ok = processAttendanceCheckInRecord(withBatch, [], '0001', 'Sesi Foto Studio');
  assert.equal(ok.status, 'ok');
  assert.equal(ok.logs.length, 1);
  assert.equal(ok.logs[0].cardNumber, 'FS-0001');
  assert.equal(typeof ok.logs[0].hour, 'number');
});

test('parseImportedExcelRows upserts rows cleanly', () => {
  const base = seedInitialMembers();
  const res = parseImportedExcelRows(base, [
    {
      'Nomor Kartu': 'FS-0099',
      'Nama Lengkap': 'Citra Dewi',
      'No. WhatsApp': '0812999888',
      'Paket Member': 'VIP',
      Status: 'AKTIF',
    },
  ]);
  assert.equal(res.importedCount, 1);
  assert.equal(res.members.some((m) => m.cardNumber === 'FS-0099' && m.name === 'Citra Dewi'), true);
});

test('extractLogHour parses explicit hour, dot timestamps, and colon timestamps', () => {
  assert.equal(
    extractLogHour({
      id: '1',
      dateKey: '2026-11-25',
      timestamp: '25 Nov 2026, 14.30.00',
      hour: 14,
      cardNumber: 'FS-0001',
      name: 'Test',
      category: 'Umum',
      phone: '-',
      purpose: 'Sesi Foto Studio',
    }),
    14
  );
  assert.equal(
    extractLogHour({
      id: '2',
      dateKey: '2026-11-25',
      timestamp: '25 Nov 2026, 16:45:10',
      cardNumber: 'FS-0001',
      name: 'Test',
      category: 'Umum',
      phone: '-',
      purpose: 'Sesi Foto Studio',
    }),
    16
  );
  assert.equal(
    extractLogHour({
      id: '3',
      dateKey: '2026-11-25',
      timestamp: '25 Nov 2026, 09.15.00',
      cardNumber: 'FS-0001',
      name: 'Test',
      category: 'Umum',
      phone: '-',
      purpose: 'Sesi Foto Studio',
    }),
    9
  );
});

test('buildLast7DaysCheckInStats returns 7 chronological days including zeros and today', () => {
  const ref = new Date('2026-11-25T10:00:00.000Z');
  const seeded = seedInitialAttendanceLogs(ref);
  const stats = buildLast7DaysCheckInStats(seeded, ref);

  assert.equal(stats.length, 7);
  assert.equal(stats[0].dateKey, '2026-11-19');
  assert.equal(stats[6].dateKey, '2026-11-25');
  assert.equal(stats[6].dayLabel, 'Hari Ini');
  assert.equal(stats[6].count, 0);
  assert.equal(stats[5].count, 6);
});

test('buildHourlyPeakStats & buildAttendanceDashboardSummary detect peak day and peak visitor hour', () => {
  const ref = new Date('2026-11-25T15:00:00.000Z');
  const seeded = seedInitialAttendanceLogs(ref);
  const summary = buildAttendanceDashboardSummary(seeded, ref);

  assert.equal(summary.last7DaysTotal, 23);
  assert.equal(summary.peakDayCount, 6);
  assert.equal(summary.peakHourLabel, '14:00');
  assert.equal(summary.peakHourCount, 6);

  const hourly = buildHourlyPeakStats(seeded);
  const h14 = hourly.find((h) => h.hour === 14);
  assert.equal(h14?.isPeak, true);
});

test('normalizePhoneNumber standardizes +62, 62, and 08 prefixes', () => {
  assert.equal(normalizePhoneNumber('+62 852-4148-3041'), '085241483041');
  assert.equal(normalizePhoneNumber('6281342998877'), '081342998877');
  assert.equal(normalizePhoneNumber('0812 3456 789'), '08123456789');
});

test('upsertMemberRegistration blocks re-registration on active cards and duplicate WhatsApp numbers', () => {
  const base = seedInitialMembers();
  const withSlot = generateBatchMemberSlots(base, {
    packageId: 'Umum',
    prefix: 'FS',
    start: 10,
    end: 10,
    theme: 'teal-modern',
  }).members;

  // Attempt to overwrite already-active card FS-0001
  const dupCard = upsertMemberRegistration(withSlot, {
    rawCardNumber: 'FS-0001',
    name: 'Penyusup Baru',
    phone: '089999999999',
    category: 'Umum',
  });
  assert.equal(dupCard.saved, null);
  assert.equal(dupCard.duplicateReason, 'CARD_ALREADY_ACTIVE');
  assert.equal(dupCard.members.find((m) => m.cardNumber === 'FS-0001')?.name, 'Andi Muhammad Farid');

  // Attempt to register new card using existing member's WhatsApp in +62 format
  const dupPhone = upsertMemberRegistration(withSlot, {
    rawCardNumber: 'FS-0010',
    name: 'Andi Duplikat',
    phone: '+62 852-4148-3041',
    category: 'Umum',
  });
  assert.equal(dupPhone.saved, null);
  assert.equal(dupPhone.duplicateReason, 'PHONE_ALREADY_REGISTERED');
  assert.equal(dupPhone.matchedMember?.cardNumber, 'FS-0001');

  // Claiming unclaimed BELUM_AKTIF slot FS-0010 with unique WhatsApp succeeds
  const validSlot = upsertMemberRegistration(withSlot, {
    rawCardNumber: 'FS-0010',
    name: 'Rina Marlina',
    phone: '082188887777',
    category: 'Umum',
  });
  assert.equal(validSlot.saved?.cardNumber, 'FS-0010');
  assert.equal(validSlot.saved?.status, 'AKTIF');
});

test('analyzeRegistrationDuplicates summarizes active protections, slot counts, and blocked attempts', () => {
  const base = seedInitialMembers();
  const withBatch = generateBatchMemberSlots(base, {
    packageId: 'Umum',
    prefix: 'FS',
    start: 20,
    end: 21,
    theme: 'teal-modern',
  }).members;

  const summary = analyzeRegistrationDuplicates(withBatch, [
    {
      id: 'DUP-1',
      ts: '25 Nov 2026',
      reason: 'CARD_ALREADY_ACTIVE',
      cardNumber: 'FS-0001',
      attemptedName: 'Budi',
      attemptedPhone: '08111111111',
      matchedCardNumber: 'FS-0001',
      matchedName: 'Andi Muhammad Farid',
    },
    {
      id: 'DUP-2',
      ts: '25 Nov 2026',
      reason: 'PHONE_ALREADY_REGISTERED',
      cardNumber: 'FS-0020',
      attemptedName: 'Andi',
      attemptedPhone: '085241483041',
      matchedCardNumber: 'FS-0001',
      matchedName: 'Andi Muhammad Farid',
    },
  ]);

  assert.equal(summary.activeMembersCount, 2);
  assert.equal(summary.availableSlotsCount, 2);
  assert.equal(summary.blockedAttemptsTotal, 2);
  assert.equal(summary.blockedByCardCount, 1);
  assert.equal(summary.blockedByPhoneCount, 1);
  assert.equal(summary.blockedByDeviceCount, 0);
  assert.equal(summary.duplicateCardGroups.length, 0);
  assert.equal(summary.riskStatus, 'AMAN');
});

test('normalizeCardNumber closes spacing/punctuation bypasses and blocks claimed cards even if paused', () => {
  assert.equal(normalizeCardNumber('fs 0001', 'FS'), 'FS-0001');
  assert.equal(normalizeCardNumber('FS/1', 'FS'), 'FS-0001');
  assert.equal(normalizeCardNumber('FS_0001', 'FS'), 'FS-0001');
  assert.equal(normalizeCardNumber('FS.0001', 'FS'), 'FS-0001');

  const base = seedInitialMembers();
  const bypassAttempt = upsertMemberRegistration(base, {
    rawCardNumber: 'fs 0001',
    name: 'Pendaftar Ganda',
    phone: '089876543210',
    category: 'Umum',
  });
  assert.equal(bypassAttempt.saved, null);
  assert.equal(bypassAttempt.duplicateReason, 'CARD_ALREADY_ACTIVE');

  // Even if FS-0002 is temporarily toggled to BELUM_AKTIF, its claimed owner cannot be overwritten
  const pausedOwner = base.map((m) =>
    m.cardNumber === 'FS-0002' ? { ...m, status: 'BELUM_AKTIF' as const } : m
  );
  const hijackPaused = upsertMemberRegistration(pausedOwner, {
    rawCardNumber: 'FS-0002',
    name: 'Penimpa Kartu',
    phone: '089876543211',
    category: 'Umum',
  });
  assert.equal(hijackPaused.saved, null);
  assert.equal(hijackPaused.duplicateReason, 'CARD_ALREADY_ACTIVE');
});

test('buildCategoryVisitDistribution aggregates categories sorted by frequency with percentages', () => {
  assert.deepEqual(buildCategoryVisitDistribution([]), []);

  const ref = new Date('2026-11-25T15:00:00.000Z');
  const seeded = seedInitialAttendanceLogs(ref);
  const dist = buildCategoryVisitDistribution(seeded);

  assert.equal(dist.length, 5);
  const totalCount = dist.reduce((sum, item) => sum + item.count, 0);
  assert.equal(totalCount, seeded.length);
  assert.equal(dist[0].category, 'Wisudawan');
  assert.ok(dist[0].count >= dist[1].count);
  assert.ok(dist[0].percentage > 0 && dist[0].percentage <= 100);
  assert.ok(dist.every((d) => d.color.startsWith('#')));
});

test('buildMonthlyVisitTrend returns 6 chronological months with counts and unique members', () => {
  const ref = new Date('2026-11-25T15:00:00.000Z');
  const seeded = seedInitialAttendanceLogs(ref);
  const trend = buildMonthlyVisitTrend(seeded, 6, ref);

  assert.equal(trend.length, 6);
  assert.equal(trend[0].monthKey, '2026-06');
  assert.equal(trend[4].monthKey, '2026-10');
  assert.equal(trend[4].count, 15);
  assert.equal(trend[5].monthKey, '2026-11');
  assert.equal(trend[5].isCurrentMonth, true);
  assert.equal(trend[5].count, 23);

  const summary = buildAttendanceDashboardSummary(seeded, ref);
  assert.equal(summary.topCategoryLabel, 'Wisudawan');
  assert.equal(summary.currentMonthCount, 23);
  assert.equal(summary.peakMonthCount, 23);
});

import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  computeCr80PdfLayout,
  CR80_HEIGHT_MM,
  CR80_WIDTH_MM,
  sanitizePdfFilenamePart,
} from './cr80PdfLayout';

test('computeCr80PdfLayout formats A4 print-ready sheet with exact CR80 85.6x53.98mm cards and crop marks', () => {
  const member = seedInitialMembers()[0];
  const layout = computeCr80PdfLayout(member, 'a4-sheet');

  assert.equal(layout.pageWidthMm, A4_WIDTH_MM);
  assert.equal(layout.pageHeightMm, A4_HEIGHT_MM);
  assert.equal(layout.filename, 'KartuMember_CR80_SiapCetak_FS-0001.pdf');
  assert.equal(layout.cards.length, 2);

  const [front, back] = layout.cards;
  assert.equal(front.side, 'front');
  assert.equal(front.widthMm, CR80_WIDTH_MM);
  assert.equal(front.heightMm, CR80_HEIGHT_MM);
  assert.equal(front.cropMarks.length, 8);

  assert.equal(back.side, 'back');
  assert.equal(back.widthMm, CR80_WIDTH_MM);
  assert.equal(back.heightMm, CR80_HEIGHT_MM);
  assert.ok(back.xMm >= front.xMm + front.widthMm + 10);
  assert.equal(layout.metadataRows.find((r) => r.label === 'Nomor Kartu')?.value, 'FS-0001');
  assert.equal(layout.metadataRows.find((r) => r.label === 'Status Kartu')?.value, 'AKTIF');
});

test('computeCr80PdfLayout formats 2-page direct CR80 PVC card dimensions and sanitizes filenames', () => {
  const member = {
    ...seedInitialMembers()[0],
    cardNumber: 'VIP/0099 *',
  };
  assert.equal(sanitizePdfFilenamePart(member.cardNumber), 'VIP_0099');

  const cardLayout = computeCr80PdfLayout(member, 'cr80-card');
  assert.equal(cardLayout.pageWidthMm, CR80_WIDTH_MM);
  assert.equal(cardLayout.pageHeightMm, CR80_HEIGHT_MM);
  assert.equal(cardLayout.filename, 'KartuMember_CR80_VIP_0099.pdf');
  assert.equal(cardLayout.cards[0].xMm, 0);
  assert.equal(cardLayout.cards[1].side, 'back');
});

test('DEFAULT_DESIGN uses +62-8523-097-571 and formatWhatsAppUrl builds wa.me links cleanly', () => {
  assert.equal(DEFAULT_DESIGN.phoneText, '+62-8523-097-571');
  assert.equal(formatWhatsAppUrl('+62-8523-097-571'), 'https://wa.me/628523097571');
  assert.equal(formatWhatsAppUrl('0852-3097-571'), 'https://wa.me/628523097571');
  assert.equal(formatWhatsAppUrl(''), '');
});

test('resolveAttendanceDatePreset and normalizeDateRange handle presets and reversed date inputs', () => {
  const ref = new Date('2026-11-25T15:00:00.000Z');

  assert.deepEqual(resolveAttendanceDatePreset('7d', ref), {
    startDate: '2026-11-19',
    endDate: '2026-11-25',
  });
  assert.deepEqual(resolveAttendanceDatePreset('month', ref), {
    startDate: '2026-11-01',
    endDate: '2026-11-25',
  });
  assert.deepEqual(resolveAttendanceDatePreset('last-month', ref), {
    startDate: '2026-10-01',
    endDate: '2026-10-31',
  });
  assert.deepEqual(resolveAttendanceDatePreset('6m', ref), {
    startDate: '2026-06-01',
    endDate: '2026-11-25',
  });

  const swapped = normalizeDateRange('2026-11-25', '2026-11-19', ref);
  assert.equal(swapped.startDate, '2026-11-19');
  assert.equal(swapped.endDate, '2026-11-25');
  assert.equal(swapped.daySpan, 7);
  assert.equal(swapped.wasSwapped, true);
});

test('buildFilteredAttendanceDashboardSummary adapts granularity and metrics for weekly, monthly, multi-month, and empty ranges', () => {
  const ref = new Date('2026-11-25T15:00:00.000Z');
  const seeded = seedInitialAttendanceLogs(ref);

  // 1. Weekly (7d): daily bars, 23 check-ins
  const weeklyPreset = resolveAttendanceDatePreset('7d', ref);
  const weekly = buildFilteredAttendanceDashboardSummary(
    seeded,
    weeklyPreset.startDate,
    weeklyPreset.endDate,
    ref
  );
  assert.equal(weekly.granularity, 'day');
  assert.equal(weekly.daySpan, 7);
  assert.equal(weekly.periodPoints.length, 7);
  assert.equal(weekly.totalCount, 23);
  assert.equal(weekly.peakPeriodCount, 6);
  assert.equal(weekly.peakHourLabel, '14:00');

  // 2. Last month (2026-10-01..2026-10-31): 31 daily bars, 15 check-ins from Oct
  const octPreset = resolveAttendanceDatePreset('last-month', ref);
  const oct = buildFilteredAttendanceDashboardSummary(
    seeded,
    octPreset.startDate,
    octPreset.endDate,
    ref
  );
  assert.equal(oct.granularity, 'day');
  assert.equal(oct.periodPoints.length, 31);
  assert.equal(oct.totalCount, 15);
  assert.equal(oct.topCategoryLabel, 'Wisudawan');
  assert.equal(filterAttendanceLogsByDateRange(seeded, octPreset.startDate, octPreset.endDate, ref).length, 15);

  // 3. 6 months (2026-06-01..2026-11-25): monthly granularity, 6 months, 75 total visits
  const sixMPreset = resolveAttendanceDatePreset('6m', ref);
  const sixM = buildFilteredAttendanceDashboardSummary(
    seeded,
    sixMPreset.startDate,
    sixMPreset.endDate,
    ref
  );
  assert.equal(sixM.granularity, 'month');
  assert.equal(sixM.periodPoints.length, 6);
  assert.equal(sixM.totalCount, seeded.length);

  // 4. Empty future range
  const empty = buildFilteredAttendanceDashboardSummary(seeded, '2027-01-01', '2027-01-07', ref);
  assert.equal(empty.totalCount, 0);
  assert.equal(empty.uniqueMembersCount, 0);
  assert.equal(empty.peakPeriodLabel, '-');
  assert.equal(empty.peakHourLabel, '-');
  assert.equal(empty.categoryPoints.length, 0);
});



