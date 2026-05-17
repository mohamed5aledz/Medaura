"use client";

import Image from "next/image";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { t } from "@/i18n";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type DoctorCardProps = {
  id: number;
  clinicId?: number;
  name: string;
  specialty: string;
  rating: number;
  price: number;
  experience: number;
  imageSrc?: string;
  isFromHome?: boolean;
  profileHref?: string;
};

const DOCTOR_FALLBACK_IMAGE = "/images/blank-profile-picture.png";

export default function DoctorCard({
  id,
  clinicId,
  name,
  specialty,
  rating,
  price,
  experience,
  imageSrc = DOCTOR_FALLBACK_IMAGE,
  isFromHome = false,
  profileHref,
}: DoctorCardProps) {
  const router = useRouter();
  const [locale, setLocale] = useState("ar");

  useEffect(() => {
    function onLocale(event: Event) {
      setLocale((event as CustomEvent<string>).detail || "ar");
    }
    window.addEventListener("localeChange", onLocale as EventListener);
    return () =>
      window.removeEventListener("localeChange", onLocale as EventListener);
  }, []);

  const handleBookNow = () => {
    if (profileHref) {
      router.push(profileHref);
      return;
    }

    if (clinicId) {
      const url = `/clinics/${clinicId}/book/${id}`;
      if (isFromHome) {
        router.push(`${url}?from=home`);
      } else {
        router.push(url);
      }
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{
        duration: 0.9,
        ease: "easeOut",
      }}
      whileHover={{ y: -6 }}
      className="rounded-3xl border border-[#d9e3ff] bg-white p-4 shadow-[0_10px_25px_rgba(20,61,180,0.08)] transition hover:shadow-[0_16px_32px_rgba(20,61,180,0.14)]"
    >
      <div className="mb-4 overflow-hidden rounded-2xl">
        <motion.div
          whileHover={{ scale: 1.04 }}
          transition={{ duration: 0.5 }}
        >
          <Image
            src={imageSrc?.trim() || DOCTOR_FALLBACK_IMAGE}
            alt={name}
            width={640}
            height={420}
            className="h-52 w-full object-cover"
          />
        </motion.div>
      </div>

      <h4 className="text-base font-extrabold text-[#001a6e]">{name}</h4>

      <p className="mt-1 text-sm text-[#53679f]">
        {t("doctorCard.consultant", locale)} {specialty}
      </p>

      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.3 }}
        className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#fff4d9] px-3 py-1 text-sm font-semibold text-[#8d5a00]"
      >
        <Star className="h-4 w-4 fill-current" />
        {rating}
      </motion.div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-[#f5f8ff] p-3 text-sm text-[#2a3f78]">
        <div>
          <p className="text-xs text-[#6c7ba4]">
            {t("doctorCard.sessionFee", locale)}
          </p>
          <p className="font-bold">
            {price} {locale === "ar" ? "ج.م" : "EGP"}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#6c7ba4]">
            {t("doctorCard.experience", locale)}
          </p>
          <p className="font-bold">
            {experience} {t("doctorCard.years", locale)}
          </p>
        </div>
      </div>

      <motion.button
        onClick={handleBookNow}
        whileTap={{ scale: 0.97 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.25 }}
        className="mt-4 w-full rounded-xl bg-[#1c3faa] py-2.5 text-sm font-bold text-white transition hover:bg-[#162f80]"
      >
        {t("doctorCard.bookNow", locale)}
      </motion.button>
    </motion.article>
  );
}
