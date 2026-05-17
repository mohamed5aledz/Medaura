"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Camera, Loader, MapPin, Save, X } from "lucide-react";

type GeoLocation = {
  latitude: number | "";
  longitude: number | "";
};

export type DoctorEditableProfile = {
  photo: string | null;
  full_name: string;
  phone: string;
  gender: string;
  years_of_experience: number | "";
  bio: string;
  consultation_price: number | "";
  work_from: string;
  work_to: string;
  work_days: string;
  location: string;
  geo_location: GeoLocation;
};

type EditProfileFormProps = {
  onClose: () => void;
  initialData: DoctorEditableProfile;
  onSuccess?: (profile: Record<string, unknown>) => void;
};

const GeoLocationPicker = dynamic(() => import("./GeoLocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-80 items-center justify-center rounded-lg border border-(--card-border) bg-(--semi-card-bg) text-sm text-(--text-secondary)">
      Loading map...
    </div>
  ),
});

const WORK_DAYS = [
  { value: "sun", label: "Sunday" },
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
];

const DEFAULT_GEO_LOCATION = {
  latitude: 30.0444,
  longitude: 31.2357,
};

function toSelectedDays(days: string) {
  return days
    .split(",")
    .map((day) => day.trim())
    .filter(Boolean);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getUpdatedProfile(result: unknown) {
  if (!isRecord(result)) return null;

  const data = result.data;
  if (isRecord(data) && isRecord(data.profile)) {
    return {
      ...data.profile,
      ...(typeof data.photo === "string" ? { photo: data.photo } : {}),
    };
  }
  if (isRecord(result.profile)) {
    return {
      ...result.profile,
      ...(typeof result.photo === "string" ? { photo: result.photo } : {}),
    };
  }
  if (isRecord(data)) return data;

  return null;
}

function toRequiredNumber(value: number | "", fieldName: string) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    throw new Error(`${fieldName} is required`);
  }

  return numericValue;
}

function toNullableString(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue === "" ? null : trimmedValue;
}

function buildRequestPayload(formData: DoctorEditableProfile) {
  return {
    full_name: formData.full_name.trim(),
    phone: toNullableString(formData.phone),
    gender: toNullableString(formData.gender),

    years_of_experience:
      formData.years_of_experience === ""
        ? ""
        : String(formData.years_of_experience),

    bio: toNullableString(formData.bio),

    consultation_price:
      formData.consultation_price === ""
        ? ""
        : String(formData.consultation_price),

    work_from: formData.work_from,
    work_to: formData.work_to,
    work_days: formData.work_days,
    location: toNullableString(formData.location),

    latitude: String(formData.geo_location.latitude),
    longitude: String(formData.geo_location.longitude),
  };
}

function appendPayloadToFormData(
  body: FormData,
  payload: ReturnType<typeof buildRequestPayload>,
) {
  Object.entries(payload).forEach(([key, value]) => {
    body.append(key, value === null ? "" : String(value));
  });
}
export default function EditProfileForm({
  onClose,
  initialData,
  onSuccess,
}: EditProfileFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState(initialData.photo || "");
  const [formData, setFormData] = useState<DoctorEditableProfile>({
    photo: initialData.photo,
    full_name: initialData.full_name,
    gender: initialData.gender,
    years_of_experience: initialData.years_of_experience,
    bio: initialData.bio,
    consultation_price: initialData.consultation_price,
    work_from: initialData.work_from,
    work_to: initialData.work_to,
    work_days: initialData.work_days,
    location: initialData.location,
    phone: initialData.phone,
    geo_location: {
      latitude:
        initialData.geo_location.latitude === ""
          ? DEFAULT_GEO_LOCATION.latitude
          : initialData.geo_location.latitude,
      longitude:
        initialData.geo_location.longitude === ""
          ? DEFAULT_GEO_LOCATION.longitude
          : initialData.geo_location.longitude,
    },
  });

  const selectedDays = toSelectedDays(formData.work_days);
  const mapLatitude =
    formData.geo_location.latitude === ""
      ? DEFAULT_GEO_LOCATION.latitude
      : formData.geo_location.latitude;
  const mapLongitude =
    formData.geo_location.longitude === ""
      ? DEFAULT_GEO_LOCATION.longitude
      : formData.geo_location.longitude;

  const handleWorkDayToggle = (day: string) => {
    const nextDays = selectedDays.includes(day)
      ? selectedDays.filter((selectedDay) => selectedDay !== day)
      : [...selectedDays, day];

    setFormData((prev) => ({
      ...prev,
      work_days: nextDays.join(","),
    }));
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = buildRequestPayload(formData);
      const requestInit: RequestInit = {
        method: "PATCH",
        credentials: "include",
      };

      const multipartBody = new FormData();
      appendPayloadToFormData(multipartBody, payload);
      if (photoFile) {
        multipartBody.set("photo", photoFile);
      }
      requestInit.body = multipartBody;

      const response = await fetch("/api/user/me", requestInit);
      const result = await response.json();

      
      if (!response.ok || result.status !== "success") {
        throw new Error(result.message || "Failed to update profile");
      }
      setSuccess(true);
      onSuccess?.(getUpdatedProfile(result) ?? {});

      window.setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-(--card-border) bg-(--card-bg) shadow-lg">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-(--card-border) bg-(--card-bg) p-6">
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 transition hover:text-gray-700"
            aria-label="Close"
          >
            <X size={24} />
          </button>
          <h2 className="text-2xl font-bold text-(--text-primary)">
            Edit doctor profile
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6" dir="rtl">
          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700">
              Profile updated successfully.
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-[180px_1fr]">
            <div className="flex flex-col items-center gap-3 rounded-lg border border-(--card-border) bg-(--semi-card-bg) p-4">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-(--card-border) bg-(--card-bg)">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt={formData.full_name || "Doctor"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Camera className="text-(--text-secondary)" size={32} />
                )}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600">
                <Camera size={16} />
                Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-(--text-primary)">
                  Full name
                </span>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      full_name: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-(--card-border) bg-(--card-bg) px-4 py-2 text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-(--text-primary)">
                  Phone
                </span>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-(--card-border) bg-(--card-bg) px-4 py-2 text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-(--text-primary)">
                  Gender
                </span>
                <select
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, gender: e.target.value }))
                  }
                  className="w-full rounded-lg border border-(--card-border) bg-(--card-bg) px-4 py-2 text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Not specified</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-(--text-primary)">
                  Years of experience
                </span>
                <input
                  type="number"
                  value={formData.years_of_experience}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      years_of_experience:
                        e.target.value === "" ? "" : Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-(--card-border) bg-(--card-bg) px-4 py-2 text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="1"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-(--text-primary)">
                  Consultation price
                </span>
                <input
                  type="number"
                  value={formData.consultation_price}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      consultation_price:
                        e.target.value === "" ? "" : Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-(--card-border) bg-(--card-bg) px-4 py-2 text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  min="0"
                  step="1"
                />
              </label>
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-(--text-primary)">
              Bio
            </span>
            <textarea
              value={formData.bio}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, bio: e.target.value }))
              }
              className="min-h-28 w-full resize-y rounded-lg border border-(--card-border) bg-(--card-bg) px-4 py-3 text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <div>
            <label className="mb-3 block text-sm font-semibold text-(--text-primary)">
              Work days
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {WORK_DAYS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => handleWorkDayToggle(day.value)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    selectedDays.includes(day.value)
                      ? "bg-blue-500 text-white"
                      : "bg-(--semi-card-bg) text-(--text-primary) hover:bg-gray-300"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-(--text-primary)">
                Work from
              </span>
              <input
                type="time"
                value={formData.work_from}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    work_from: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-(--card-border) bg-(--card-bg) px-4 py-2 text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-(--text-primary)">
                Work to
              </span>
              <input
                type="time"
                value={formData.work_to}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    work_to: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-(--card-border) bg-(--card-bg) px-4 py-2 text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </label>
          </div>

          <div className="space-y-4 rounded-xl border border-(--card-border) p-4">
            <div className="flex items-center justify-between gap-3">
              <label className="flex-1">
                <span className="mb-2 block text-sm font-semibold text-(--text-primary)">
                  Location
                </span>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-(--card-border) bg-(--card-bg) px-4 py-2 text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Cairo"
                />
              </label>
              <MapPin className="mt-7 shrink-0 text-blue-500" size={24} />
            </div>

            <div className="overflow-hidden rounded-lg border border-(--card-border)">
              <GeoLocationPicker
                latitude={mapLatitude}
                longitude={mapLongitude}
                onChange={(latitude, longitude) =>
                  setFormData((prev) => ({
                    ...prev,
                    geo_location: {
                      latitude: Number(latitude.toFixed(6)),
                      longitude: Number(longitude.toFixed(6)),
                    },
                  }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-(--text-secondary)">
                  Latitude
                </span>
                <input
                  type="number"
                  value={formData.geo_location.latitude}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      geo_location: {
                        ...prev.geo_location,
                        latitude:
                          e.target.value === "" ? "" : Number(e.target.value),
                      },
                    }))
                  }
                  className="w-full rounded-lg border border-(--card-border) bg-(--card-bg) px-4 py-2 text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  step="0.000001"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-(--text-secondary)">
                  Longitude
                </span>
                <input
                  type="number"
                  value={formData.geo_location.longitude}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      geo_location: {
                        ...prev.geo_location,
                        longitude:
                          e.target.value === "" ? "" : Number(e.target.value),
                      },
                    }))
                  }
                  className="w-full rounded-lg border border-(--card-border) bg-(--card-bg) px-4 py-2 text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  step="0.000001"
                />
              </label>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-(--card-border) px-4 py-3 font-semibold text-(--text-primary) transition hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-3 font-semibold text-white transition hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Save changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
