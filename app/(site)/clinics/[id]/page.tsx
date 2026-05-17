"use client";

import { useParams } from "next/navigation";
import { MapPin, Phone, Clock, Star, Search, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";
import DoctorCard from "@/components/home/doctorCard/doctorCard";
import { t } from "@/i18n";

const API_BASE_URL = "http://127.0.0.1:3001/api";

type ClinicDoctor = {
  staff_id: number;
  full_name: string;
  role_title: string;
  specialist: string;
  work_days: string;
  work_from: string;
  work_to: string;
  consultation_price: number;
  photo: string | null;
  can_be_booked: number;
};

type GeoLocation = {
  latitude: number;
  longitude: number;
};

type ClinicProfileData = {
  clinic_id: number;
  name: string;
  location: string;
  phone: string;
  photo: string;
  total_ratings: number;
  average_rating: number;
  geo_location: GeoLocation | null;
};

type ApiRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null;
}

function unwrapData(data: unknown): unknown {
  if (isRecord(data) && data.data !== undefined) return unwrapData(data.data);
  return data;
}

function toNumber(value: unknown, fallback: number) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function normalizeClinic(
  value: unknown,
  fallbackId: number,
): ClinicProfileData | null {
  if (!isRecord(value)) return null;

  const clinicId = toNumber(value.clinic_id ?? value.id, fallbackId);
  const name = typeof value.name === "string" ? value.name : "";
  const location = typeof value.location === "string" ? value.location : "";
  const phone = typeof value.phone === "string" ? value.phone : "";
  const photo =
    typeof value.photo === "string" && value.photo.trim()
      ? value.photo
      : "/images/clinic1.png";
  const totalRatings = toNumber(value.total_ratings, 0);
  const averageRating = toNumber(value.average_rating, 0);
  const geoLocation =
    isRecord(value.geo_location) &&
    typeof value.geo_location.latitude === "number" &&
    typeof value.geo_location.longitude === "number"
      ? {
          latitude: value.geo_location.latitude,
          longitude: value.geo_location.longitude,
        }
      : null;

  return {
    clinic_id: clinicId,
    name,
    location,
    phone,
    photo,
    total_ratings: totalRatings,
    average_rating: averageRating,
    geo_location: geoLocation,
  };
}

function normalizeDoctors(value: unknown): ClinicDoctor[] {
  if (!Array.isArray(value)) return [];

  const doctors: ClinicDoctor[] = [];

  for (const [index, entry] of value.entries()) {
    if (!isRecord(entry)) continue;

    doctors.push({
      staff_id: toNumber(entry.staff_id ?? entry.id, index + 1),
      full_name:
        typeof entry.full_name === "string"
          ? entry.full_name
          : typeof entry.name === "string"
            ? entry.name
            : "",
      role_title: typeof entry.role_title === "string" ? entry.role_title : "",
      specialist: typeof entry.specialist === "string" ? entry.specialist : "",
      work_days: typeof entry.work_days === "string" ? entry.work_days : "",
      work_from: typeof entry.work_from === "string" ? entry.work_from : "",
      work_to: typeof entry.work_to === "string" ? entry.work_to : "",
      consultation_price: toNumber(entry.consultation_price, 0),
      photo: typeof entry.photo === "string" ? entry.photo : null,
      can_be_booked:
        typeof entry.can_be_booked === "number"
          ? entry.can_be_booked
          : entry.can_be_booked
            ? 1
            : 0,
    });
  }

  return doctors;
}

function getClinicHours(doctors: ClinicDoctor[]) {
  const withHours = doctors.find(
    (doctor) => doctor.work_from && doctor.work_to,
  );
  if (!withHours) return "";
  return `${withHours.work_from} - ${withHours.work_to}`;
}

function getSafeRating(value: unknown) {
  const rating = Number(value);
  return Number.isFinite(rating) ? rating : 0;
}

function RatingStars({
  rating,
  className = "h-4 w-4",
}: {
  rating: number;
  className?: string;
}) {
  const roundedRating = Math.round(rating);

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, index) => (
        <Star
          key={index}
          className={`${className} ${
            index < roundedRating
              ? "fill-[#f7b731] text-[#f7b731]"
              : "text-[#d7deef]"
          }`}
        />
      ))}
    </div>
  );
}

export default function ClinicDetailsPage() {
  const params = useParams();
  const clinicId = Number(params.id);

  const [visibleDoctors, setVisibleDoctors] = useState(3);
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [locale, setLocale] = useState(() =>
    typeof window === "undefined"
      ? "en"
      : localStorage.getItem("locale") || "en",
  );
  const [clinicProfile, setClinicProfile] = useState<ClinicProfileData | null>(
    null,
  );
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);

  useEffect(() => {
    const handleLocaleChange: EventListener = (event) => {
      setLocale((event as CustomEvent<string>).detail);
    };
    window.addEventListener("localeChange", handleLocaleChange);
    return () => window.removeEventListener("localeChange", handleLocaleChange);
  }, []);

  useEffect(() => {
    async function loadClinicProfile() {
      if (!clinicId) {
        setClinicProfile(null);
        setDoctors([]);
        setProfileError("Clinic not found");
        return;
      }

      setProfileLoading(true);
      setProfileError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/clinic/${clinicId}/profile`,
        );
        const data = await response.json();

        if (!response.ok) {
          const message =
            data.error || data.message || "Failed to load clinic profile";
          throw new Error(message);
        }

        const unwrapped = unwrapData(data);
        const clinicSource = isRecord(unwrapped)
          ? (unwrapped.clinic ?? unwrapped.profile ?? unwrapped)
          : unwrapped;
        const doctorsSource = isRecord(unwrapped)
          ? (unwrapped.doctors ?? unwrapped.staff ?? [])
          : [];

        setClinicProfile(normalizeClinic(clinicSource, clinicId));
        setDoctors(normalizeDoctors(doctorsSource));
      } catch (error: unknown) {
        console.error("Clinic profile fetch error:", error);
        setProfileError(error instanceof Error ? error.message : "Failed to load clinic profile");
        setClinicProfile(null);
        setDoctors([]);
      } finally {
        setProfileLoading(false);
      }
    }

    loadClinicProfile();
  }, [clinicId]);

  const clinic = clinicProfile;
  const clinicSpecialties = Array.from(
    new Set(
      doctors
        .map((doctor) => doctor.specialist)
        .filter((specialty) => specialty),
    ),
  );
  const clinicHours = getClinicHours(doctors);
  const ratingValue = getSafeRating(clinic?.average_rating);
  const ratingCount = clinic?.total_ratings ?? 0;
  const mapSrc = clinic?.geo_location
    ? `https://maps.google.com/maps?q=${clinic.geo_location.latitude},${clinic.geo_location.longitude}&z=15&output=embed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(
        clinic?.location || "Cairo",
      )}&z=12&output=embed`;

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSpecialty =
      selectedSpecialty === "" || doc.specialist?.includes(selectedSpecialty);
    const matchesGender = true;
    const matchesSearch =
      searchQuery === "" ||
      doc.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSpecialty && matchesGender && matchesSearch;
  });

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto pt-32 pb-12 px-4">
          <div className="flex justify-center items-center min-h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#001A6E]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (profileError || !clinic) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto pt-32 pb-12 px-4">
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-lg text-center">
            <p>{profileError || "Clinic not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mb-16 overflow-hidden rounded-[32px] border border-[#dce5f6] bg-white shadow-[0_24px_70px_rgba(20,45,100,0.10)]">
          <div
            className={`grid gap-0 lg:grid-cols-[1.05fr_0.95fr] ${
              locale === "ar" ? "lg:[direction:rtl]" : ""
            }`}
          >
            <div className="relative min-h-[340px] overflow-hidden bg-[#eaf0fb] lg:min-h-[520px]">
              <Image
                src={clinic.photo}
                alt={clinic.name}
                width={900}
                height={640}
                className="h-full min-h-[340px] w-full object-cover lg:min-h-[520px]"
              />
              <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-[#06123d]/80 to-transparent p-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-bold text-[#001A6E] shadow-lg">
                  <Star className="h-4 w-4 fill-[#f7b731] text-[#f7b731]" />
                  <span>{ratingValue.toFixed(1)}</span>
                  <span className="text-[#7a88aa]">({ratingCount})</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-[#6d7da7]">
                {t("clinics.aboutClinic", locale)}
              </p>
              <h1 className="text-3xl font-extrabold leading-tight text-[#001A6E] sm:text-4xl">
                {clinic.name}
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#fff7e3] px-4 py-2 text-sm font-bold text-[#7a4f00]">
                  <RatingStars rating={ratingValue} />
                  <span>{ratingValue.toFixed(1)}</span>
                </div>
                <span className="text-sm font-semibold text-[#7a88aa]">
                  {t("clinics.fromVisitors", locale).replace(
                    "{count}",
                    String(ratingCount),
                  )}
                </span>
              </div>

              <div className="mt-8 grid gap-3 text-sm text-[#40527f] sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-2xl bg-[#f4f7ff] p-4">
                  <MapPin className="h-5 w-5 shrink-0 text-[#1c3faa]" />
                  <span>{clinic.location}</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-[#f4f7ff] p-4">
                  <Phone className="h-5 w-5 shrink-0 text-[#1c3faa]" />
                  <span dir="ltr">{clinic.phone}</span>
                </div>
                {clinicHours ? (
                  <div className="flex items-center gap-3 rounded-2xl bg-[#f4f7ff] p-4 sm:col-span-2">
                    <Clock className="h-5 w-5 shrink-0 text-[#1c3faa]" />
                    <span>{clinicHours}</span>
                  </div>
                ) : null}
              </div>

              <div className="mt-8">
                <h2 className="mb-4 text-lg font-extrabold text-[#001A6E]">
                  {t("clinics.medicalSpecialties", locale)}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {clinicSpecialties.map((tag, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-[#d8e3ff] bg-white px-4 py-2 text-xs font-bold text-[#1c3faa]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-16 rounded-[28px] border border-[#dce5f6] bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#6d7da7]">
                {t("clinics.medicalSpecialties", locale)}
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-[#001A6E]">
                {t("clinics.doctors", locale)}
              </h2>
            </div>
            <div className="rounded-2xl bg-[#f4f7ff] px-4 py-3 text-sm font-bold text-[#001A6E]">
              {filteredDoctors.length} {t("clinics.doctors", locale)}
            </div>
          </div>

          <div className="mb-10 flex flex-wrap gap-4 rounded-3xl bg-[#f6f8fc] p-4">
            <div className="relative min-w-50">
              <select
                className={`w-full appearance-none rounded-2xl border border-[#dce5f6] bg-white py-3 text-sm font-semibold text-[#40527f] focus:border-[#001A6E] focus:outline-none ${locale === "ar" ? "px-6" : "px-10"}`}
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
              >
                <option value="">{t("clinics.selectSpecialty", locale)}</option>
                {clinicSpecialties.map((spec, i) => (
                  <option key={i} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
              <ChevronDown
                className={`w-4 h-4 absolute ${locale === "ar" ? "left-4" : "right-4"} top-1/2 -translate-y-1/2 pointer-events-none text-gray-400`}
              />
            </div>

            <div className="relative min-w-37.5">
              <select
                className={`w-full appearance-none rounded-2xl border border-[#dce5f6] bg-white py-3 text-sm font-semibold text-[#40527f] focus:border-[#001A6E] focus:outline-none ${locale === "ar" ? "px-6" : "px-10"}`}
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
              >
                <option value="">{t("clinics.gender", locale)}</option>
                <option value="male">{t("clinics.male", locale)}</option>
                <option value="female">{t("clinics.female", locale)}</option>
              </select>
              <ChevronDown
                className={`w-4 h-4 absolute ${locale === "ar" ? "left-4" : "right-4"} top-1/2 -translate-y-1/2 pointer-events-none text-gray-400`}
              />
            </div>

            <div className="relative min-w-[220px] flex-1">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t("clinics.search", locale)}
                className="h-full min-h-12 w-full rounded-2xl border border-[#dce5f6] bg-white px-5 text-sm font-semibold text-[#40527f] outline-none placeholder:text-[#94a0bd] focus:border-[#001A6E]"
              />
            </div>

            <button className="flex items-center gap-2 rounded-2xl bg-[#001A6E] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/10 transition hover:bg-[#162f80]">
              <Search className="w-4 h-4" />
              {t("clinics.search", locale)}
            </button>
          </div>

          {profileLoading ? (
            <p className="text-center text-[#001A6E]">جاري تحميل الدكاترة...</p>
          ) : profileError ? (
            <p className="text-center text-red-600">{profileError}</p>
          ) : filteredDoctors.length === 0 ? (
            <p className="text-center text-[#001A6E]">
              لا يوجد دكاترة متاحين في هذه العيادة حالياً
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredDoctors.slice(0, visibleDoctors).map((doc) => (
                  <DoctorCard
                    key={doc.staff_id}
                    id={doc.staff_id}
                    clinicId={clinic.clinic_id}
                    name={doc.full_name}
                    specialty={doc.specialist || ""}
                    rating={ratingValue}
                    price={doc.consultation_price}
                    experience={0}
                    imageSrc={doc.photo || ""}
                  />
                ))}
              </div>

              {visibleDoctors < filteredDoctors.length && (
                <div className="flex justify-center mt-12">
                  <button
                    onClick={() => setVisibleDoctors((prev) => prev + 3)}
                    className="flex items-center gap-2 text-[#001A6E] font-bold hover:opacity-80"
                  >
                    {t("clinics.moreDoctors", locale)}
                    <ChevronDown className="w-5 h-5 animate-bounce" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mb-16">
          <h2 className="mb-8 text-2xl font-extrabold text-[#001A6E]">
            {t("clinics.clinicLocation", locale)}
          </h2>
          <div className="relative h-96 overflow-hidden rounded-[28px] border border-[#dce5f6] bg-white shadow-sm">
            <iframe
              src={mapSrc}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>

        <div className="rounded-[28px] border border-[#dce5f6] bg-white p-6 text-center shadow-sm sm:p-10">
          <h2 className="mb-8 text-2xl font-extrabold text-[#001A6E]">
            {t("clinics.patientReviews", locale)}
          </h2>

          <div className="mx-auto max-w-sm rounded-3xl bg-[#f6f8fc] p-8">
            <div className="mb-4 flex justify-center">
              <RatingStars rating={ratingValue} className="h-7 w-7" />
            </div>
            <p className="text-4xl font-extrabold text-[#001A6E]">
              {ratingValue.toFixed(1)}
            </p>
            <p className="mt-2 text-base font-bold text-gray-800">
              {t("clinics.overallRating", locale)}
            </p>
            <p className="mt-1 text-sm text-gray-400">
              {t("clinics.fromVisitors", locale).replace(
                "{count}",
                String(ratingCount),
              )}
            </p>
          </div>

          {ratingCount === 0 ? (
            <p className="mt-8 text-center text-gray-400">No reviews yet.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
