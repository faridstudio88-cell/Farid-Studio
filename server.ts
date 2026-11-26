import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Request, type Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { desc } from 'drizzle-orm';
import { db, isSqlConfigured } from './src/db/index.ts';
import { attendanceLogs, duplicateAttempts, members } from './src/db/schema.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { requireAuth, type AuthenticatedRequest } from './src/middleware/auth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const app = express();

app.use(express.json({ limit: '1mb' }));

interface GroundingReviewSnippet {
  text: string;
  uri?: string;
}

interface GroundedPlaceItem {
  title: string;
  uri: string;
  placeId?: string;
  reviewSnippets?: GroundingReviewSnippet[];
}

function sanitizeStr(val: unknown, maxLen: number, fallback = ''): string {
  if (typeof val !== 'string') return fallback;
  return val.trim().slice(0, maxLen);
}

app.get('/api/studio/state', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Sesi pengguna tidak valid.' });
      return;
    }

    if (!isSqlConfigured()) {
      res.json({
        configured: false,
        members: [],
        attendanceLogs: [],
        duplicateLogs: [],
      });
      return;
    }

    await getOrCreateUser(req.user.uid, req.user.email, req.user.name);

    const [memberRows, attendanceRows, duplicateRows] = await Promise.all([
      db.select().from(members).orderBy(desc(members.updatedAt)).limit(1000),
      db.select().from(attendanceLogs).orderBy(desc(attendanceLogs.createdAt)).limit(500),
      db.select().from(duplicateAttempts).orderBy(desc(duplicateAttempts.createdAt)).limit(200),
    ]);

    res.json({
      configured: true,
      members: memberRows.map((m) => ({
        cardNumber: m.cardNumber,
        name: m.name,
        phone: m.phone,
        category: m.category,
        cardDesign: m.cardDesign,
        org: m.org,
        address: m.address,
        nik: m.nik,
        kkNumber: m.kkNumber,
        kkRelation: m.kkRelation,
        ktpAddress: m.ktpAddress,
        status: m.status === 'BELUM_AKTIF' ? 'BELUM_AKTIF' : 'AKTIF',
        registeredAt: m.registeredAt,
        notes: m.notes,
      })),
      attendanceLogs: attendanceRows.map((a) => ({
        id: a.id,
        dateKey: a.dateKey,
        timestamp: a.timestamp,
        isoTimestamp: a.isoTimestamp ?? undefined,
        hour: a.hour ?? undefined,
        cardNumber: a.cardNumber,
        name: a.name,
        category: a.category,
        phone: a.phone,
        purpose: a.purpose,
      })),
      duplicateLogs: duplicateRows.map((d) => ({
        id: d.id,
        ts: d.ts,
        reason:
          d.reason === 'PHONE_ALREADY_REGISTERED' || d.reason === 'DEVICE_ALREADY_REGISTERED'
            ? d.reason
            : 'CARD_ALREADY_ACTIVE',
        cardNumber: d.cardNumber,
        attemptedName: d.attemptedName,
        attemptedPhone: d.attemptedPhone,
        matchedCardNumber: d.matchedCardNumber,
        matchedName: d.matchedName,
      })),
    });
  } catch (err) {
    console.error('Failed loading studio state:', err);
    res.status(500).json({ error: 'Gagal memuat data studio dari database.' });
  }
});

app.post('/api/studio/sync', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Sesi pengguna tidak valid.' });
      return;
    }

    if (!isSqlConfigured()) {
      res.json({ configured: false, syncedMembers: 0, syncedAttendance: 0, syncedDuplicates: 0 });
      return;
    }

    await getOrCreateUser(req.user.uid, req.user.email, req.user.name);

    const body = req.body as Record<string, unknown>;
    const rawMembers = Array.isArray(body?.members) ? body.members.slice(0, 500) : [];
    const rawAttendance = Array.isArray(body?.attendanceLogs) ? body.attendanceLogs.slice(0, 300) : [];
    const rawDuplicates = Array.isArray(body?.duplicateLogs) ? body.duplicateLogs.slice(0, 150) : [];

    let syncedMembers = 0;
    for (const item of rawMembers) {
      if (!item || typeof item !== 'object') continue;
      const m = item as Record<string, unknown>;
      const cardNumber = sanitizeStr(m.cardNumber, 40).toUpperCase();
      const name = sanitizeStr(m.name, 255);
      if (!cardNumber || !name) continue;

      await db
        .insert(members)
        .values({
          cardNumber,
          name,
          phone: sanitizeStr(m.phone, 64, '-'),
          category: sanitizeStr(m.category, 64, 'Umum'),
          cardDesign: sanitizeStr(m.cardDesign, 120, 'Teal Modern (Biru Putih)'),
          org: sanitizeStr(m.org, 255, '-'),
          address: sanitizeStr(m.address, 500, '-'),
          nik: sanitizeStr(m.nik, 32, ''),
          kkNumber: sanitizeStr(m.kkNumber, 32, ''),
          kkRelation: sanitizeStr(m.kkRelation, 64, 'Kepala Keluarga'),
          ktpAddress: sanitizeStr(m.ktpAddress, 500, ''),
          status: m.status === 'BELUM_AKTIF' ? 'BELUM_AKTIF' : 'AKTIF',
          registeredAt: sanitizeStr(m.registeredAt, 64, '-'),
          notes: sanitizeStr(m.notes, 500, ''),
          updatedByUid: req.user.uid,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: members.cardNumber,
          set: {
            name,
            phone: sanitizeStr(m.phone, 64, '-'),
            category: sanitizeStr(m.category, 64, 'Umum'),
            cardDesign: sanitizeStr(m.cardDesign, 120, 'Teal Modern (Biru Putih)'),
            org: sanitizeStr(m.org, 255, '-'),
            address: sanitizeStr(m.address, 500, '-'),
            nik: sanitizeStr(m.nik, 32, ''),
            kkNumber: sanitizeStr(m.kkNumber, 32, ''),
            kkRelation: sanitizeStr(m.kkRelation, 64, 'Kepala Keluarga'),
            ktpAddress: sanitizeStr(m.ktpAddress, 500, ''),
            status: m.status === 'BELUM_AKTIF' ? 'BELUM_AKTIF' : 'AKTIF',
            registeredAt: sanitizeStr(m.registeredAt, 64, '-'),
            notes: sanitizeStr(m.notes, 500, ''),
            updatedByUid: req.user.uid,
            updatedAt: new Date(),
          },
        });
      syncedMembers++;
    }

    let syncedAttendance = 0;
    for (const item of rawAttendance) {
      if (!item || typeof item !== 'object') continue;
      const a = item as Record<string, unknown>;
      const id = sanitizeStr(a.id, 80);
      const cardNumber = sanitizeStr(a.cardNumber, 40);
      const dateKey = sanitizeStr(a.dateKey, 16);
      if (!id || !cardNumber || !dateKey) continue;

      const parsedHour =
        typeof a.hour === 'number' && Number.isInteger(a.hour) && a.hour >= 0 && a.hour <= 23
          ? a.hour
          : null;

      await db
        .insert(attendanceLogs)
        .values({
          id,
          dateKey,
          timestamp: sanitizeStr(a.timestamp, 64, '-'),
          isoTimestamp: sanitizeStr(a.isoTimestamp, 64) || null,
          hour: parsedHour,
          cardNumber,
          name: sanitizeStr(a.name, 255, 'Member'),
          category: sanitizeStr(a.category, 64, 'Umum'),
          phone: sanitizeStr(a.phone, 64, '-'),
          purpose: sanitizeStr(a.purpose, 255, 'Kunjungan Studio'),
        })
        .onConflictDoNothing({ target: attendanceLogs.id });
      syncedAttendance++;
    }

    let syncedDuplicates = 0;
    for (const item of rawDuplicates) {
      if (!item || typeof item !== 'object') continue;
      const d = item as Record<string, unknown>;
      const id = sanitizeStr(d.id, 80);
      if (!id) continue;

      await db
        .insert(duplicateAttempts)
        .values({
          id,
          ts: sanitizeStr(d.ts, 64, '-'),
          reason: sanitizeStr(d.reason, 64, 'CARD_ALREADY_ACTIVE'),
          cardNumber: sanitizeStr(d.cardNumber, 40, '-'),
          attemptedName: sanitizeStr(d.attemptedName, 255, '-'),
          attemptedPhone: sanitizeStr(d.attemptedPhone, 64, '-'),
          matchedCardNumber: sanitizeStr(d.matchedCardNumber, 40, '-'),
          matchedName: sanitizeStr(d.matchedName, 255, '-'),
        })
        .onConflictDoNothing({ target: duplicateAttempts.id });
      syncedDuplicates++;
    }

    res.json({
      configured: true,
      syncedMembers,
      syncedAttendance,
      syncedDuplicates,
    });
  } catch (err) {
    console.error('Failed syncing studio state:', err);
    res.status(500).json({ error: 'Gagal menyinkronkan data ke database Cloud SQL.' });
  }
});

app.post('/api/maps-grounding', async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const query = sanitizeStr(body?.query, 240);
    if (!query) {
      res.status(400).json({ error: 'Pertanyaan lokasi atau rute tidak boleh kosong.' });
      return;
    }

    const latRaw = body?.lat;
    const lngRaw = body?.lng;
    const hasValidCoords =
      typeof latRaw === 'number' &&
      typeof lngRaw === 'number' &&
      Number.isFinite(latRaw) &&
      Number.isFinite(lngRaw) &&
      latRaw >= -90 &&
      latRaw <= 90 &&
      lngRaw >= -180 &&
      lngRaw <= 180;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'Layanan pencarian Google Maps berbasis AI sedang tidak tersedia di server.',
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `Berikan informasi lokasi, rute akses, dan patokan terdekat dalam bahasa Indonesia yang ringkas dan jelas untuk pengunjung Farid Studio Multimedia di Sudiang, Makassar (Studio Utama: Jl. Perintis Kemerdekaan Km.16 No.49 Sudiang, Cabang: Jl. Poros Taman Sudiang Indah). Pertanyaan pengguna: ${query}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        ...(hasValidCoords
          ? {
              toolConfig: {
                retrievalConfig: {
                  latLng: {
                    latitude: latRaw,
                    longitude: lngRaw,
                  },
                },
              },
            }
          : {}),
      },
    });

    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata as
      | {
          groundingChunks?: Array<{
            maps?: {
              title?: string;
              uri?: string;
              placeId?: string;
              placeAnswerSources?: {
                reviewSnippets?: Array<{
                  googleMapsUri?: string;
                  reviewId?: string;
                  title?: string;
                }>;
              };
            };
          }>;
          googleMapsWidgetContextToken?: string;
        }
      | undefined;

    const places: GroundedPlaceItem[] = [];
    const seenUris = new Set<string>();
    const chunks = groundingMetadata?.groundingChunks || [];

    for (const chunk of chunks) {
      if (!chunk.maps?.uri) continue;
      if (seenUris.has(chunk.maps.uri)) continue;
      seenUris.add(chunk.maps.uri);

      const snippets: GroundingReviewSnippet[] = [];
      const rawReviews = chunk.maps.placeAnswerSources?.reviewSnippets || [];
      for (const rev of rawReviews) {
        if (rev.title || rev.googleMapsUri) {
          snippets.push({
            text: rev.title || 'Ulasan Pengunjung di Google Maps',
            uri: rev.googleMapsUri,
          });
        }
      }

      places.push({
        title: chunk.maps.title || 'Lokasi di Google Maps',
        uri: chunk.maps.uri,
        placeId: chunk.maps.placeId,
        reviewSnippets: snippets.length > 0 ? snippets : undefined,
      });
    }

    res.json({
      answer: response.text || 'Informasi lokasi berhasil ditemukan di Google Maps.',
      places,
      widgetToken: groundingMetadata?.googleMapsWidgetContextToken || null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
      res.status(429).json({
        error: 'Batas permintaan pencarian Google Maps AI sementara tercapai. Coba lagi sebentar.',
      });
      return;
    }
    console.error('Maps grounding error:', err);
    res.status(500).json({ error: 'Gagal memproses pencarian lokasi Google Maps.' });
  }
});

app.post('/api/search-grounding', async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const query = sanitizeStr(body?.query, 240);
    if (!query) {
      res.status(400).json({ error: 'Topik riset desain studio tidak boleh kosong.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'Layanan riset Google Search berbasis AI belum tersedia di server.',
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `Berikan rekomendasi desain kartu member CR80 profesional untuk studio foto (palet warna, tipografi, komposisi visual, dan elemen kepercayaan member) dalam bahasa Indonesia yang ringkas, praktis, dan terstruktur. Pertanyaan pengguna: ${query}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata as
      | {
          groundingChunks?: Array<{
            web?: {
              uri?: string;
              title?: string;
            };
          }>;
          webSearchQueries?: string[];
        }
      | undefined;

    const sources: Array<{ title: string; uri: string }> = [];
    const seen = new Set<string>();
    for (const chunk of groundingMetadata?.groundingChunks || []) {
      const uri = chunk.web?.uri;
      if (!uri || seen.has(uri)) continue;
      seen.add(uri);
      sources.push({
        title: chunk.web?.title || uri,
        uri,
      });
    }

    res.json({
      answer: response.text || 'Hasil riset desain berhasil dimuat.',
      sources: sources.slice(0, 8),
      queries: groundingMetadata?.webSearchQueries || [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
      res.status(429).json({
        error: 'Batas permintaan pencarian Google Search sementara tercapai. Coba lagi sebentar.',
      });
      return;
    }
    console.error('Search grounding error:', err);
    res.status(500).json({ error: 'Gagal melakukan riset desain via Google Search.' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(__dirname, 'dist');

  if (isProd && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Farid Studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});
