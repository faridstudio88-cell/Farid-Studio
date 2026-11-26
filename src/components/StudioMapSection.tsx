import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
} from '@vis.gl/react-google-maps';
import {
  Check,
  Compass,
  Edit3,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { StudioBranchLocation } from '../types/studio';

interface GroundedPlace {
  title: string;
  uri: string;
  placeId?: string;
  reviewSnippets?: Array<{ text: string; uri?: string }>;
}

interface BranchMarkerProps {
  branch: StudioBranchLocation;
  isSelected: boolean;
  draggable: boolean;
  onSelect: (id: StudioBranchLocation['id']) => void;
  onCloseInfo: () => void;
  onDragEndPosition: (id: StudioBranchLocation['id'], lat: number, lng: number) => void;
}

function BranchMarker({
  branch,
  isSelected,
  draggable,
  onSelect,
  onCloseInfo,
  onDragEndPosition,
}: BranchMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const isMain = branch.id === 'utama';

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={branch.position}
        title={branch.title}
        draggable={draggable}
        onClick={() => onSelect(branch.id)}
        onDragEnd={(ev) => {
          const latLng = ev?.latLng;
          if (!latLng) return;
          const lat = typeof latLng.lat === 'function' ? latLng.lat() : Number(latLng.lat);
          const lng = typeof latLng.lng === 'function' ? latLng.lng() : Number(latLng.lng);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            onDragEndPosition(branch.id, lat, lng);
          }
        }}
      >
        <Pin
          background={isMain ? '#0e7490' : '#4338ca'}
          borderColor={isMain ? '#164e63' : '#312e81'}
          glyphColor="#ffffff"
          scale={isSelected ? 1.25 : 1.05}
        />
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow anchor={marker} maxWidth={270} onCloseClick={onCloseInfo}>
          <div className="space-y-1.5 p-1 text-slate-900">
            <p className="text-xs font-extrabold text-cyan-800">{branch.title}</p>
            <p className="text-[11px] font-medium text-slate-600">{branch.address}</p>
            <p className="font-mono text-[10px] text-slate-500">
              {branch.position.lat.toFixed(6)}, {branch.position.lng.toFixed(6)}
            </p>
            <p className="text-[11px] text-slate-500">{branch.hours}</p>
            <a
              href={branch.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 pt-0.5 text-[11px] font-bold text-cyan-700 underline"
            >
              <span>Buka Rute di Google Maps</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

interface StudioMapSectionProps {
  quotaExceeded: boolean;
  branches: StudioBranchLocation[];
  adminUnlocked?: boolean;
  onUpdateBranch?: (
    branchId: StudioBranchLocation['id'],
    patch: {
      title?: string;
      subtitle?: string;
      address?: string;
      hours?: string;
      lat?: number;
      lng?: number;
    }
  ) => void;
  onResetBranches?: () => void;
}

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

const QUICK_PROMPTS = [
  'Rute & patokan menuju Jl. Perintis Kemerdekaan Km.16 No.49 Sudiang Makassar',
  'Rute menuju Jl. Poros Taman Sudiang Indah Makassar & area parkir sekitar',
  'Fasilitas ATM, minimarket, dan kuliner dekat Sudiang Makassar',
];

export function StudioMapSection({
  quotaExceeded,
  branches,
  adminUnlocked = false,
  onUpdateBranch,
  onResetBranches,
}: StudioMapSectionProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<StudioBranchLocation['id'] | null>(
    'utama'
  );
  const activeBranch =
    branches.find((b) => b.id === (selectedBranchId || 'utama')) || branches[0];

  const [cameraCenter, setCameraCenter] = useState(
    branches[0]?.position || { lat: -5.0846, lng: 119.5126 }
  );
  const [cameraZoom, setCameraZoom] = useState(14);
  const [editMode, setEditMode] = useState(false);

  const [draftTitle, setDraftTitle] = useState(activeBranch?.title || '');
  const [draftAddress, setDraftAddress] = useState(activeBranch?.address || '');
  const [draftHours, setDraftHours] = useState(activeBranch?.hours || '');
  const [draftLat, setDraftLat] = useState(String(activeBranch?.position.lat ?? -5.0846));
  const [draftLng, setDraftLng] = useState(String(activeBranch?.position.lng ?? 119.5126));

  useEffect(() => {
    if (!activeBranch) return;
    setDraftTitle(activeBranch.title);
    setDraftAddress(activeBranch.address);
    setDraftHours(activeBranch.hours);
    setDraftLat(String(activeBranch.position.lat));
    setDraftLng(String(activeBranch.position.lng));
  }, [activeBranch]);

  const [query, setQuery] = useState(QUICK_PROMPTS[0]);
  const [useUserLocation, setUseUserLocation] = useState(false);
  const [loadingGrounding, setLoadingGrounding] = useState(false);
  const [groundingAnswer, setGroundingAnswer] = useState('');
  const [groundingPlaces, setGroundingPlaces] = useState<GroundedPlace[]>([]);
  const [groundingError, setGroundingError] = useState('');

  const handleFocusBranch = useCallback((branch: StudioBranchLocation) => {
    setSelectedBranchId(branch.id);
    setCameraCenter(branch.position);
    setCameraZoom(15);
  }, []);

  const handleMapClickToMovePin = useCallback(
    (lat: number, lng: number) => {
      if (!adminUnlocked || !editMode || !onUpdateBranch) return;
      const targetId = selectedBranchId || 'utama';
      onUpdateBranch(targetId, { lat, lng });
      setDraftLat(lat.toFixed(6));
      setDraftLng(lng.toFixed(6));
    },
    [adminUnlocked, editMode, onUpdateBranch, selectedBranchId]
  );

  function handleSaveBranchEdit(e: FormEvent) {
    e.preventDefault();
    if (!onUpdateBranch || !activeBranch) return;
    const lat = parseFloat(draftLat);
    const lng = parseFloat(draftLng);
    onUpdateBranch(activeBranch.id, {
      title: draftTitle,
      address: draftAddress,
      hours: draftHours,
      ...(Number.isFinite(lat) ? { lat } : {}),
      ...(Number.isFinite(lng) ? { lng } : {}),
    });
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setCameraCenter({ lat, lng });
    }
  }

  const runMapsGrounding = useCallback(
    async (customQuery?: string) => {
      const q = (customQuery ?? query).trim();
      if (!q) return;
      setLoadingGrounding(true);
      setGroundingError('');

      let coords: { lat: number; lng: number } | undefined;
      if (useUserLocation && navigator.geolocation) {
        coords = await new Promise<{ lat: number; lng: number } | undefined>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(undefined),
            { timeout: 4000, maximumAge: 60000 }
          );
        });
      }

      try {
        const res = await fetch('/api/maps-grounding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: q,
            ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
          }),
        });
        const data = (await res.json()) as {
          answer?: string;
          places?: GroundedPlace[];
          error?: string;
        };
        if (!res.ok) {
          setGroundingError(data.error || 'Gagal memuat info Google Maps.');
          return;
        }
        setGroundingAnswer(data.answer || '');
        setGroundingPlaces(Array.isArray(data.places) ? data.places : []);
      } catch {
        setGroundingError('Tidak dapat menghubungi layanan peta saat ini.');
      } finally {
        setLoadingGrounding(false);
      }
    },
    [query, useUserLocation]
  );

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    runMapsGrounding();
  }

  const canRenderLiveMap = Boolean(MAPS_API_KEY) && !quotaExceeded;

  return (
    <div
      id="studio-map-section"
      data-testid="studio-map-section"
      className="mx-auto max-w-4xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
    >
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold text-cyan-800 uppercase">
            Lokasi Cabang Resmi &amp; Navigasi Studio
          </p>
          <h2 className="font-display mt-0.5 text-lg font-extrabold text-slate-900 sm:text-xl">
            Peta Lokasi Farid Studio Multimedia (Makassar)
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Pilih cabang di bawah atau klik pin pada peta interaktif Google Maps untuk melihat alamat &amp; membuka rute langsung.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {branches.map((branch) => {
            const active = selectedBranchId === branch.id;
            return (
              <button
                key={branch.id}
                type="button"
                onClick={() => handleFocusBranch(branch)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                  active
                    ? 'bg-cyan-700 text-white'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{branch.id === 'utama' ? 'Studio Utama' : 'Cabang Taman Sudiang'}</span>
              </button>
            );
          })}
          {adminUnlocked && onUpdateBranch && (
            <button
              type="button"
              data-testid="toggle-map-pin-edit"
              aria-pressed={editMode}
              onClick={() => setEditMode((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                editMode
                  ? 'bg-amber-600 text-white'
                  : 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{editMode ? 'Selesai Edit Titik' : 'Edit Titik Lokasi'}</span>
            </button>
          )}
        </div>
      </div>

      {adminUnlocked && editMode && onUpdateBranch && activeBranch && (
        <form
          onSubmit={handleSaveBranchEdit}
          data-testid="map-pin-editor-form"
          className="space-y-3 rounded-xl border border-amber-300 bg-amber-50/70 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-extrabold text-amber-950">
              Mode Edit Titik Lokasi Admin ({activeBranch.id === 'utama' ? 'Studio Utama' : 'Cabang'}) — Klik peta atau seret pin, lalu simpan
            </p>
            {onResetBranches && (
              <button
                type="button"
                onClick={onResetBranches}
                className="inline-flex items-center gap-1 rounded-md border border-amber-400 bg-white px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                <span>Reset Default</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label htmlFor="map-edit-title" className="mb-1 block text-[11px] font-bold text-slate-700">
                Nama Cabang
              </label>
              <input
                id="map-edit-title"
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold"
              />
            </div>
            <div>
              <label htmlFor="map-edit-hours" className="mb-1 block text-[11px] font-bold text-slate-700">
                Jam Operasional
              </label>
              <input
                id="map-edit-hours"
                type="text"
                value={draftHours}
                onChange={(e) => setDraftHours(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
            <div className="sm:col-span-6">
              <label htmlFor="map-edit-addr" className="mb-1 block text-[11px] font-bold text-slate-700">
                Alamat Lengkap
              </label>
              <input
                id="map-edit-addr"
                type="text"
                value={draftAddress}
                onChange={(e) => setDraftAddress(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="map-edit-lat" className="mb-1 block text-[11px] font-bold text-slate-700">
                Latitude
              </label>
              <input
                id="map-edit-lat"
                type="number"
                step="0.000001"
                value={draftLat}
                onChange={(e) => setDraftLat(e.target.value)}
                className="font-mono w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="map-edit-lng" className="mb-1 block text-[11px] font-bold text-slate-700">
                Longitude
              </label>
              <input
                id="map-edit-lng"
                type="number"
                step="0.000001"
                value={draftLng}
                onChange={(e) => setDraftLng(e.target.value)}
                className="font-mono w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold"
              />
            </div>
            <div className="flex items-end sm:col-span-2">
              <button
                type="submit"
                data-testid="save-map-pin-btn"
                className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Simpan</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Interactive Google Map */}
      {canRenderLiveMap ? (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <APIProvider apiKey={MAPS_API_KEY!} libraries={['marker']} language="id" region="ID">
            <GoogleMap
              mapId="DEMO_MAP_ID"
              center={cameraCenter}
              zoom={cameraZoom}
              onCameraChanged={(ev) => {
                setCameraCenter(ev.detail.center);
                setCameraZoom(ev.detail.zoom);
              }}
              onClick={(ev) => {
                const ll = ev.detail?.latLng;
                if (ll) handleMapClickToMovePin(ll.lat, ll.lng);
              }}
              gestureHandling="cooperative"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '340px' }}
            >
              {branches.map((branch) => (
                <BranchMarker
                  key={branch.id}
                  branch={branch}
                  isSelected={selectedBranchId === branch.id}
                  draggable={adminUnlocked && editMode}
                  onSelect={(id) => setSelectedBranchId(id)}
                  onCloseInfo={() => setSelectedBranchId(null)}
                  onDragEndPosition={(id, lat, lng) => {
                    if (onUpdateBranch) {
                      onUpdateBranch(id, { lat, lng });
                    }
                  }}
                />
              ))}
            </GoogleMap>
          </APIProvider>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950">
          <p className="font-bold">
            {quotaExceeded
              ? 'Peta interaktif sementara dialihkan ke tampilan ringkas karena kuota harian Maps tercapai.'
              : 'Peta interaktif membutuhkan kunci Google Maps browser; gunakan tautan rute langsung di bawah.'}
          </p>
        </div>
      )}

      {/* Branch Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {branches.map((branch) => (
          <div
            key={branch.id}
            className={`flex flex-col justify-between gap-3 rounded-xl border p-4 transition-colors ${
              selectedBranchId === branch.id
                ? 'border-cyan-600 bg-cyan-50/50'
                : 'border-slate-200 bg-slate-50/60'
            }`}
          >
            <div className="space-y-1">
              <p className="text-xs font-extrabold text-slate-900">{branch.title}</p>
              <p className="text-[11px] font-semibold text-cyan-800">{branch.subtitle}</p>
              <p className="text-xs text-slate-600">{branch.address}</p>
              <p className="font-mono text-[11px] text-slate-500">
                Koordinat: {branch.position.lat.toFixed(6)}, {branch.position.lng.toFixed(6)}
              </p>
              <p className="text-[11px] text-slate-500">{branch.hours}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleFocusBranch(branch)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
              >
                <Compass className="h-3.5 w-3.5 text-cyan-700" aria-hidden="true" />
                <span>Fokus Peta</span>
              </button>
              <a
                href={branch.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800"
              >
                <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Arahkan ke Lokasi</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Google Maps Grounding Search */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-5">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-extrabold text-cyan-900">
              <Sparkles className="h-3.5 w-3.5 text-cyan-700" aria-hidden="true" />
              <span>Asisten Lokasi &amp; Rute Sekitar Studio (Google Maps Grounding)</span>
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Tanyakan patokan jalan, rute menuju studio, atau tempat terdekat sekitar Sudiang Makassar dengan tautan Google Maps resmi.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={useUserLocation}
              onChange={(e) => setUseUserLocation(e.target.checked)}
              className="rounded border-slate-300 text-cyan-700"
            />
            <span>Sertakan lokasi saya</span>
          </label>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="maps-grounding-query" className="sr-only">
            Pertanyaan rute atau area sekitar studio
          </label>
          <input
            id="maps-grounding-query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Contoh: Patokan menuju Farid Studio Jl. Perintis Kemerdekaan Km.16 Sudiang"
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-cyan-700 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loadingGrounding || !query.trim()}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-cyan-700 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-cyan-800 disabled:bg-slate-300 disabled:text-slate-600"
          >
            {loadingGrounding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{loadingGrounding ? 'Mencari...' : 'Cari Info Maps'}</span>
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setQuery(preset);
                runMapsGrounding(preset);
              }}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
            >
              {preset.length > 52 ? `${preset.slice(0, 52)}...` : preset}
            </button>
          ))}
        </div>

        {groundingError && (
          <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {groundingError}
          </p>
        )}

        {(groundingAnswer || groundingPlaces.length > 0) && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            {groundingAnswer && (
              <p className="whitespace-pre-line text-xs leading-relaxed text-slate-700">
                {groundingAnswer}
              </p>
            )}

            {groundingPlaces.length > 0 && (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                  Tautan Lokasi Terverifikasi Google Maps
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {groundingPlaces.map((place) => (
                    <div
                      key={place.uri}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs"
                    >
                      <a
                        href={place.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-bold text-cyan-800 hover:underline"
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-cyan-700" aria-hidden="true" />
                        <span>{place.title}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                      </a>
                      {place.reviewSnippets && place.reviewSnippets.length > 0 && (
                        <ul className="mt-1.5 space-y-1">
                          {place.reviewSnippets.map((rev, idx) => (
                            <li key={idx} className="text-[11px] text-slate-600">
                              {rev.uri ? (
                                <a
                                  href={rev.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline hover:text-cyan-700"
                                >
                                  {rev.text}
                                </a>
                              ) : (
                                rev.text
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
