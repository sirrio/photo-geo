import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { dashboard, login, register } from '@/routes';
import { destroy, store, update } from '@/routes/photo';
import { type SharedData } from '@/types';

type PhotoData = {
    url: string;
    original_name: string;
    size: number;
    mime_type: string;
    captured_at: string | null;
    camera_make: string | null;
    camera_model: string | null;
    latitude: number | null;
    longitude: number | null;
    has_location: boolean;
};

type PhotoLocation = {
    id: number;
    original_name: string;
    mime_type: string;
    size: number;
    url: string;
    captured_at: string | null;
    camera_make: string | null;
    camera_model: string | null;
    latitude: number;
    longitude: number;
    updated_at: string;
};

type PageProps = SharedData & {
    photo: PhotoData | null;
    canRegister?: boolean;
    umapGeoJsonUrl: string;
    locations: PhotoLocation[];
};

export default function PhotoIndex() {
    const { auth, name, photo, canRegister = true, umapGeoJsonUrl, locations } =
        usePage<PageProps>().props;
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const form = useForm<{ photo: File | null }>({
        photo: null,
    });

    useEffect(() => {
        if (! form.data.photo) {
            return;
        }

        const objectUrl = URL.createObjectURL(form.data.photo);
        setPreviewUrl(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [form.data.photo]);

    const mapUrl = useMemo(() => {
        if (! photo?.has_location || photo.latitude === null || photo.longitude === null) {
            return null;
        }

        const lat = photo.latitude;
        const lon = photo.longitude;
        const latDelta = 0.01;
        const lonDelta = 0.01;
        const bbox = `${lon - lonDelta},${lat - latDelta},${lon + lonDelta},${lat + latDelta}`;

        return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
            bbox
        )}&marker=${lat},${lon}&layer=mapnik`;
    }, [photo]);

    const mapLink = useMemo(() => {
        if (! photo?.has_location || photo.latitude === null || photo.longitude === null) {
            return null;
        }

        return `https://www.openstreetmap.org/?mlat=${photo.latitude}&mlon=${photo.longitude}#map=15/${photo.latitude}/${photo.longitude}`;
    }, [photo]);

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        form.post(store().url, {
            forceFormData: true,
            onSuccess: () => {
                form.reset('photo');
                if (inputRef.current) {
                    inputRef.current.value = '';
                }
                setPreviewUrl(null);
            },
        });
    };

    const formattedSize = photo ? formatBytes(photo.size) : null;

    const copyGeoJsonUrl = async () => {
        if (! navigator.clipboard) {
            return;
        }

        await navigator.clipboard.writeText(umapGeoJsonUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f9f4e1_0,_#f1efe8_38%,_#e9f2f0_76%,_#dbe7f0_100%)] text-[#14140f]">
            <Head title="Photo Geo Inspector">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=space-grotesk:400,500,600,700"
                    rel="stylesheet"
                />
            </Head>

            <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-10 font-['Space_Grotesk']">
                <header className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-[#5b5f4e]">
                            {name}
                        </p>
                        <h1 className="text-4xl font-semibold text-[#15160c]">
                            Photo Geo Inspector
                        </h1>
                    </div>
                    <nav className="flex items-center gap-4 text-sm font-medium">
                        {auth.user ? (
                            <Link
                                href={dashboard()}
                                className="rounded-full border border-[#1d2f2a]/20 bg-white/70 px-4 py-2 text-[#1d2f2a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#1d2f2a]/40"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    className="rounded-full border border-transparent px-4 py-2 text-[#1d2f2a] transition hover:bg-white/60"
                                >
                                    Log in
                                </Link>
                                {canRegister && (
                                    <Link
                                        href={register()}
                                        className="rounded-full border border-[#1d2f2a]/20 bg-white/70 px-4 py-2 text-[#1d2f2a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#1d2f2a]/40"
                                    >
                                        Register
                                    </Link>
                                )}
                            </>
                        )}
                    </nav>
                </header>

                <main className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                    <section className="rounded-3xl bg-white/80 p-6 shadow-[0_32px_80px_rgba(20,20,15,0.15)] backdrop-blur">
                        <div className="flex flex-col gap-6">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#9a8560]">
                                    Upload
                                </p>
                                <h2 className="mt-3 text-2xl font-semibold">
                                    Drop in a photo to reveal its geo trail
                                </h2>
                                <p className="mt-2 text-sm text-[#58594d]">
                                    We read the embedded metadata and highlight the exact GPS
                                    coordinates in OpenStreetMap.
                                </p>
                            </div>

                            <form onSubmit={submit} className="grid gap-4">
                                <div className="rounded-2xl border border-dashed border-[#b5b2a4] bg-[#f7f3ea] p-6">
                                    <input
                                        ref={inputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={(event) =>
                                            form.setData(
                                                'photo',
                                                event.target.files?.[0] ?? null
                                            )
                                        }
                                        className="block w-full text-sm text-[#3c3b31] file:mr-4 file:rounded-full file:border-0 file:bg-[#1d2f2a] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#2b4b41]"
                                    />
                                    {form.errors.photo && (
                                        <p className="mt-2 text-sm text-[#b83f2b]">
                                            {form.errors.photo}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        type="submit"
                                        disabled={form.processing || ! form.data.photo}
                                        className="rounded-full bg-[#1d2f2a] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#2b4b41] disabled:cursor-not-allowed disabled:bg-[#7b8a86]"
                                    >
                                        {form.processing
                                            ? 'Uploading...'
                                            : 'Analyze photo'}
                                    </button>
                                    <span className="text-xs uppercase tracking-[0.3em] text-[#5b5f4e]">
                                        {form.progress
                                            ? `${form.progress.percentage}% complete`
                                            : 'Metadata only'}
                                    </span>
                                </div>
                            </form>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-2xl bg-[#111d1a] p-4 text-white">
                                    <p className="text-xs uppercase tracking-[0.3em] text-[#a5b6b0]">
                                        Preview
                                    </p>
                                    <div className="mt-3 aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#1e2d28]">
                                        {previewUrl || photo?.url ? (
                                            <img
                                                src={previewUrl ?? photo?.url}
                                                alt="Selected photo preview"
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-sm text-[#a5b6b0]">
                                                No photo selected yet.
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-[#d6d3c8] bg-white p-4">
                                    <p className="text-xs uppercase tracking-[0.3em] text-[#9a8560]">
                                        Metadata
                                    </p>
                                    <div className="mt-3 space-y-3 text-sm text-[#3c3b31]">
                                        {photo ? (
                                            <>
                                                <div>
                                                    <p className="text-xs uppercase text-[#9a8560]">
                                                        File
                                                    </p>
                                                    <p className="font-medium">
                                                        {photo.original_name}
                                                    </p>
                                                    <p className="text-xs text-[#6b6a60]">
                                                        {photo.mime_type} · {formattedSize}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs uppercase text-[#9a8560]">
                                                        Camera
                                                    </p>
                                                    <p>
                                                        {photo.camera_make || photo.camera_model
                                                            ? `${photo.camera_make ?? ''} ${photo.camera_model ?? ''}`.trim()
                                                            : 'Unknown camera'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs uppercase text-[#9a8560]">
                                                        Captured
                                                    </p>
                                                    <p>
                                                        {photo.captured_at ??
                                                            'No capture timestamp'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs uppercase text-[#9a8560]">
                                                        Coordinates
                                                    </p>
                                                    {photo.has_location ? (
                                                        <p>
                                                            {photo.latitude?.toFixed(6)},
                                                            {photo.longitude?.toFixed(6)}
                                                        </p>
                                                    ) : (
                                                        <p>No GPS data found.</p>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="rounded-xl border border-dashed border-[#d6d3c8] p-4 text-sm text-[#6b6a60]">
                                                Upload a photo to see EXIF metadata here.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-[#d6d3c8] bg-white/70 p-4">
                                <p className="text-xs uppercase tracking-[0.3em] text-[#9a8560]">
                                    uMap Remote Data
                                </p>
                                <p className="mt-2 text-sm text-[#58594d]">
                                    Paste this GeoJSON URL into your uMap layer
                                    remote data panel. The map will refresh to
                                    show every uploaded photo with GPS data.
                                </p>
                                <div className="mt-4 flex flex-wrap items-center gap-3">
                                    <input
                                        readOnly
                                        value={umapGeoJsonUrl}
                                        className="min-w-[240px] flex-1 rounded-full border border-[#d6d3c8] bg-white px-4 py-2 text-xs text-[#3c3b31]"
                                    />
                                    <button
                                        type="button"
                                        onClick={copyGeoJsonUrl}
                                        className="rounded-full border border-[#1d2f2a]/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1d2f2a] transition hover:bg-[#1d2f2a] hover:text-white"
                                    >
                                        {copied ? 'Copied' : 'Copy URL'}
                                    </button>
                                </div>
                                <div className="mt-3 text-xs text-[#6b6a60]">
                                    Format: GeoJSON · Dynamic: ON
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-3xl border border-[#f0e5d1] bg-[#fdfaf4] p-6 shadow-[0_24px_60px_rgba(22,22,18,0.12)]">
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#9a8560]">
                            OpenStreetMap
                        </p>
                        <h2 className="mt-3 text-2xl font-semibold text-[#191a14]">
                            Exact location map
                        </h2>
                        <p className="mt-2 text-sm text-[#58594d]">
                            The marker below is driven directly by the photo GPS
                            coordinates.
                        </p>

                        <div className="mt-6 overflow-hidden rounded-2xl border border-[#e3d8c7]">
                            {mapUrl ? (
                                <iframe
                                    title="Photo location map"
                                    src={mapUrl}
                                    className="h-[360px] w-full"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="flex h-[360px] items-center justify-center bg-[#efe6d8] text-sm text-[#6b6a60]">
                                    Upload a photo with GPS data to load the map.
                                </div>
                            )}
                        </div>
                        {mapLink && (
                            <div className="mt-4">
                                <a
                                    href={mapLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#1d2f2a]"
                                >
                                    Open in OpenStreetMap
                                    <span aria-hidden>→</span>
                                </a>
                            </div>
                        )}
                    </section>
                </main>

                <section className="rounded-3xl bg-white/80 p-6 shadow-[0_32px_80px_rgba(20,20,15,0.12)] backdrop-blur">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-[#9a8560]">
                                Manage
                            </p>
                            <h2 className="mt-2 text-2xl font-semibold text-[#191a14]">
                                Edit saved photo locations
                            </h2>
                            <p className="mt-2 text-sm text-[#58594d]">
                                Changes here update the GeoJSON feed used by
                                uMap.
                            </p>
                        </div>
                        <span className="text-xs uppercase tracking-[0.3em] text-[#5b5f4e]">
                            Showing {locations.length} latest
                        </span>
                    </div>

                    <div className="mt-6 grid gap-4">
                        {locations.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-[#d6d3c8] p-6 text-sm text-[#6b6a60]">
                                No saved locations yet. Upload a photo with GPS
                                metadata to populate this list.
                            </div>
                        ) : (
                            locations.map((location) => (
                                <PhotoLocationRow
                                    key={`${location.id}-${location.updated_at}`}
                                    location={location}
                                />
                            ))
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

function formatBytes(size: number): string {
    if (size === 0) {
        return '0 B';
    }

    const base = 1024;
    const units = ['B', 'KB', 'MB', 'GB'];
    const unitIndex = Math.min(
        Math.floor(Math.log(size) / Math.log(base)),
        units.length - 1
    );
    const value = size / Math.pow(base, unitIndex);

    return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

function PhotoLocationRow({ location }: { location: PhotoLocation }) {
    const form = useForm({
        original_name: location.original_name,
        captured_at: location.captured_at ?? '',
        camera_make: location.camera_make ?? '',
        camera_model: location.camera_model ?? '',
        latitude: location.latitude,
        longitude: location.longitude,
    });

    useEffect(() => {
        form.setData({
            original_name: location.original_name,
            captured_at: location.captured_at ?? '',
            camera_make: location.camera_make ?? '',
            camera_model: location.camera_model ?? '',
            latitude: location.latitude,
            longitude: location.longitude,
        });
    }, [location]);

    return (
        <div className="grid gap-4 rounded-2xl border border-[#e3d8c7] bg-white p-4 md:grid-cols-[160px_1fr]">
            <div className="overflow-hidden rounded-xl border border-[#e3d8c7] bg-[#f7f3ea]">
                <img
                    src={location.url}
                    alt={location.original_name}
                    className="h-full w-full object-cover"
                />
            </div>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    form.patch(update({ photoLocation: location.id }).url, {
                        preserveState: false,
                        preserveScroll: true,
                    });
                }}
                className="grid gap-4"
            >
                <div className="grid gap-3 md:grid-cols-2">
                    <div>
                        <label className="text-xs uppercase tracking-[0.3em] text-[#9a8560]">
                            Name
                        </label>
                        <input
                            value={form.data.original_name}
                            onChange={(event) =>
                                form.setData(
                                    'original_name',
                                    event.target.value
                                )
                            }
                            className="mt-2 w-full rounded-lg border border-[#d6d3c8] px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs uppercase tracking-[0.3em] text-[#9a8560]">
                            Captured
                        </label>
                        <input
                            value={form.data.captured_at}
                            onChange={(event) =>
                                form.setData(
                                    'captured_at',
                                    event.target.value
                                )
                            }
                            className="mt-2 w-full rounded-lg border border-[#d6d3c8] px-3 py-2 text-sm"
                        />
                    </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <div>
                        <label className="text-xs uppercase tracking-[0.3em] text-[#9a8560]">
                            Camera make
                        </label>
                        <input
                            value={form.data.camera_make}
                            onChange={(event) =>
                                form.setData(
                                    'camera_make',
                                    event.target.value
                                )
                            }
                            className="mt-2 w-full rounded-lg border border-[#d6d3c8] px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs uppercase tracking-[0.3em] text-[#9a8560]">
                            Camera model
                        </label>
                        <input
                            value={form.data.camera_model}
                            onChange={(event) =>
                                form.setData(
                                    'camera_model',
                                    event.target.value
                                )
                            }
                            className="mt-2 w-full rounded-lg border border-[#d6d3c8] px-3 py-2 text-sm"
                        />
                    </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <div>
                        <label className="text-xs uppercase tracking-[0.3em] text-[#9a8560]">
                            Latitude
                        </label>
                        <input
                            type="number"
                            step="0.000001"
                            value={form.data.latitude}
                            onChange={(event) =>
                                form.setData(
                                    'latitude',
                                    Number(event.target.value)
                                )
                            }
                            className="mt-2 w-full rounded-lg border border-[#d6d3c8] px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs uppercase tracking-[0.3em] text-[#9a8560]">
                            Longitude
                        </label>
                        <input
                            type="number"
                            step="0.000001"
                            value={form.data.longitude}
                            onChange={(event) =>
                                form.setData(
                                    'longitude',
                                    Number(event.target.value)
                                )
                            }
                            className="mt-2 w-full rounded-lg border border-[#d6d3c8] px-3 py-2 text-sm"
                        />
                    </div>
                </div>

                {Object.values(form.errors).length > 0 && (
                    <div className="text-sm text-[#b83f2b]">
                        {Object.values(form.errors)[0]}
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="rounded-full bg-[#1d2f2a] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#2b4b41] disabled:cursor-not-allowed disabled:bg-[#7b8a86]"
                    >
                        {form.processing ? 'Saving...' : 'Save changes'}
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            form.delete(destroy({ photoLocation: location.id }).url, {
                                preserveState: false,
                                preserveScroll: true,
                            })
                        }
                        className="rounded-full border border-[#b83f2b]/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#b83f2b] transition hover:bg-[#b83f2b] hover:text-white"
                    >
                        Delete
                    </button>
                </div>
            </form>
        </div>
    );
}
