"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DoctorCard from "@/components/home/doctorCard/doctorCard";
import { useEffect, useState } from "react";
import { t } from "@/i18n";
import { motion } from "framer-motion";

const BEST_DOCTORS_API_URL =
  "http://127.0.0.1:3001/api/doctors/best?limit=3";

type BestDoctorApiItem = {
  provider_type?: "doctor" | "staff" | string;
  target_id?: number;
  doctor_id?: number;
  staff_id?: number | null;
  clinic_id?: number | null;
  full_name?: string;
  specialist?: string;
  consultation_price?: number;
  photo?: string | null;
  total_patients?: number;
  average_rating?: number;
};

type BestDoctor = {
  id: number;
  clinicId?: number;
  providerType: "doctor" | "staff";
  name: string;
  specialty: string;
  rating: number;
  price: number;
  experience: number;
  imageSrc?: string;
};

function mapBestDoctor(doctor: BestDoctorApiItem): BestDoctor {
  const providerType = doctor.provider_type === "staff" ? "staff" : "doctor";
  const id = Number(
    providerType === "staff"
      ? (doctor.staff_id ?? doctor.target_id)
      : (doctor.doctor_id ?? doctor.target_id),
  );
  const rating = Number(doctor.average_rating ?? 0);

  return {
    id,
    clinicId: doctor.clinic_id ?? undefined,
    providerType,
    name: doctor.full_name || "",
    specialty: doctor.specialist || "",
    rating: Number.isFinite(rating) ? rating : 0,
    price: Number(doctor.consultation_price ?? 0),
    experience: Number(doctor.total_patients ?? 0),
    imageSrc: doctor.photo?.trim() || undefined,
  };
}

function getBestDoctorProfileHref(doctor: BestDoctor) {
  if (doctor.providerType === "doctor") {
    return `/doctors/${doctor.id}`;
  }

  if (doctor.clinicId) {
    return `/clinics/${doctor.clinicId}/book/${doctor.id}?from=home`;
  }

  return "";
}

export default function BestDoctors() {
  const [locale, setLocale] = useState("ar");
  const [bestDoctorsData, setBestDoctorsData] = useState<BestDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onLocale(event: Event) {
      setLocale((event as CustomEvent<string>).detail || "ar");
    }
    window.addEventListener("localeChange", onLocale as EventListener);
    return () =>
      window.removeEventListener("localeChange", onLocale as EventListener);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchBestDoctors() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(BEST_DOCTORS_API_URL, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch best doctors");
        }

        const data = (await response.json()) as {
          doctors?: BestDoctorApiItem[];
        };

        setBestDoctorsData((data.doctors || []).map(mapBestDoctor));
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        console.error("Best doctors fetch error:", error);
        setError("Failed to load best doctors");
      } finally {
        setLoading(false);
      }
    }

    fetchBestDoctors();

    return () => controller.abort();
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
      className="rounded-[30px] border border-[#d8e3ff] bg-white px-4 py-10 sm:px-6 lg:px-8"
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8 }}
        className="mb-10 text-center"
      >
        <h2 className="text-2xl font-extrabold text-[#001a6e] sm:text-3xl">
          {t("bestDoctors.title", locale)}
        </h2>

        <p className="mt-2 text-sm text-[#6d7da7]">
          {t("bestDoctors.subtitle", locale)}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className={`mb-8 flex ${
          locale === "ar" ? "justify-start" : "justify-end"
        }`}
      >
        <Link
          href="/specialties"
          className="inline-flex items-center gap-2 rounded-full border border-[#d1ddff] px-4 py-2 text-sm font-semibold text-[#001a6e] transition hover:bg-[#f4f7ff]"
        >
          {t("bestDoctors.viewAll", locale)}
          {locale === "ar" ? (
            <ChevronLeft size={18} />
          ) : (
            <ChevronRight size={18} />
          )}
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[420px] animate-pulse rounded-3xl border border-[#d9e3ff] bg-[#f5f8ff]"
            />
          ))}

        {!loading && error && (
          <p className="col-span-full text-center text-sm font-semibold text-red-600">
            {error}
          </p>
        )}

        {!loading &&
          !error &&
          bestDoctorsData.map((doc, i) => (
            <motion.div
              key={`${doc.providerType}-${doc.clinicId}-${doc.id}`}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.7,
                delay: i * 0.12,
                ease: "easeOut",
              }}
            >
              <DoctorCard
                id={doc.id}
                clinicId={doc.clinicId}
                name={doc.name}
                specialty={doc.specialty}
                rating={doc.rating}
                price={doc.price}
                experience={doc.experience}
                imageSrc={doc.imageSrc}
                isFromHome={true}
                profileHref={getBestDoctorProfileHref(doc)}
              />
            </motion.div>
          ))}
      </div>
    </motion.section>
  );
}
