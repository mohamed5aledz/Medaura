"use client";

import Image from "next/image";
import Link from "next/link";
import { Search, ShieldCheck, Stethoscope, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { t } from "@/i18n";
import { motion } from "framer-motion";

const stats = (locale: string) => [
  {
    value: "+10k",
    label: t("hero.stats.happyPatients", locale),
    icon: <Users className="h-5 w-5" />,
  },
  {
    value: "+500",
    label: t("hero.stats.licensedDoctors", locale),
    icon: <Stethoscope className="h-5 w-5" />,
  },
  {
    value: "24/7",
    label: t("hero.stats.alwaysAvailable", locale),
    icon: <ShieldCheck className="h-5 w-5" />,
  },
];

export default function Hero() {
  const [locale, setLocale] = useState("ar");

  useEffect(() => {
    function onLocale(e: any) {
      setLocale(e?.detail || "ar");
    }
    window.addEventListener("localeChange", onLocale as EventListener);
    return () =>
      window.removeEventListener("localeChange", onLocale as EventListener);
  }, []);

  return (
    <motion.section
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: 0.12 },
        },
      }}
      className="relative overflow-hidden rounded-4xl bg-[#f4f7ff] px-4 pb-8 pt-20 sm:px-8 sm:pt-24"
    >
      {/* Animated Background Glow */}
      <motion.div
        animate={{
          opacity: [0.4, 0.7, 0.4],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute -top-40 left-1/2 w-125 h-125 -translate-x-1/2 rounded-full bg-[#1c3faa]/10 blur-3xl"
      />

      <div className="absolute inset-0 z-0">
        <Image
          src="/images/landingbackground.png"
          alt=""
          fill
          priority
          className="object-cover object-center opacity-20"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">

          {/* LEFT */}
          <div className="space-y-6 text-[#0f1a4f]">

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center rounded-full border border-[#c8d4ff] bg-white px-4 py-2 text-sm font-semibold text-[#2a4fcf]"
            >
              {t("hero.trusted", locale)}
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl"
            >
              {t("hero.title", locale)}
              <span className="block text-[#1c4fe0]">
                {t("hero.subtitle", locale)}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="max-w-xl text-sm leading-7 text-[#4a5b88] sm:text-base"
            >
              {t("hero.description", locale)}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap gap-3"
            >
              <Link
                href="/doctors"
                className="rounded-full bg-[#1c3faa] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#162f80]"
              >
                {t("hero.bookNow", locale)}
              </Link>

              <Link
                href="/specialties"
                className="rounded-full border border-[#1c3faa] bg-white px-6 py-3 text-sm font-bold text-[#1c3faa] transition hover:bg-[#edf2ff]"
              >
                {t("hero.exploreSpecialties", locale)}
              </Link>
            </motion.div>
          </div>

          {/* IMAGE */}
          <motion.div
            initial={{ opacity: 0, x: 80, scale: 1.05 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="mx-auto w-full max-w-md"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="rounded-[28px] border border-white/70 bg-white/90 p-3 shadow-[0_20px_45px_rgba(28,63,170,0.2)] backdrop-blur"
            >
              <div className="relative overflow-hidden rounded-3xl">
                <Image
                  src="/images/landing.png"
                  alt="Doctor"
                  width={640}
                  height={780}
                  className="h-105 w-full object-cover"
                />
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* STATS */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            show: { transition: { staggerChildren: 0.12 } },
          }}
          className="mt-8 grid gap-4 rounded-3xl border border-[#d6e0ff] bg-white/95 p-4 sm:grid-cols-3 sm:p-5"
        >
          {stats(locale).map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-3 rounded-2xl bg-[#f7f9ff] px-4 py-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecff] text-[#1f44bf]">
                {stat.icon}
              </span>
              <div>
                <p className="text-lg font-bold text-[#0f1a4f]">{stat.value}</p>
                <p className="text-xs text-[#5c6f9f]">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* SEARCH */}
        <div className="mt-6 rounded-3xl border border-[#d7e1ff] bg-white p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center">

            <select className="h-12 rounded-2xl border border-[#d6e0ff] px-4 text-sm text-[#0f1a4f] outline-none focus:border-[#1c4fe0]">
              <option>{t("hero.select.specialty", locale)}</option>
              <option>Cardiology</option>
              <option>Pediatrics</option>
              <option>Dermatology</option>
            </select>

            <select className="h-12 rounded-2xl border border-[#d6e0ff] px-4 text-sm text-[#0f1a4f] outline-none focus:border-[#1c4fe0]">
              <option>{t("hero.select.city", locale)}</option>
              <option>{t("hero.options.cairo", locale)}</option>
              <option>{t("hero.options.alexandria", locale)}</option>
              <option>{t("hero.options.giza", locale)}</option>
            </select>

            <select className="h-12 rounded-2xl border border-[#d6e0ff] px-4 text-sm text-[#0f1a4f] outline-none focus:border-[#1c4fe0]">
              <option>{t("hero.select.visitType", locale)}</option>
              <option>{t("hero.options.inClinic", locale)}</option>
              <option>{t("hero.options.online", locale)}</option>
            </select>

            <button className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#1c3faa] px-6 text-sm font-bold text-white transition hover:bg-[#162f80]">
              <Search className="h-4 w-4" />
              {t("hero.search", locale)}
            </button>

          </div>
        </div>

      </div>
    </motion.section>
  );
}