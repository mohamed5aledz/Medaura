"use client";

import { useParams, useRouter } from "next/navigation";
import {
  MapPin,
  Phone,
  Star,
  Mail,
  ArrowRight,
  Calendar,
  Clock,
} from "lucide-react";
import { allClinics } from "@/constants/clinics";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import DatePicker from "@/components/booking/DatePicker";
import TimePicker from "@/components/booking/TimePicker";
import ValidationModal from "@/components/booking/ValidationModal";
import { t } from "@/i18n";

type ApiStaffProfile = {
  id?: number;
  staff_id?: number;
  full_name?: string;
  name?: string;
  clinic_id?: number;
  role_title?: string;
  specialist?: string;
  work_days?: string;
  work_from?: string;
  work_to?: string;
  consultation_price?: number;
  rating?: number;
  average_rating?: number;
  total_ratings?: number;
  photo?: string | null;
  about?: string;
  verified?: boolean;
  clinic_name?: string;
  clinic_location?: string;
  clinic_phone?: string;
  clinic_average_rating?: number;
  clinic_total_ratings?: number;
  total_patients?: number;
  total_bookings?: number;
  can_be_booked?: number | boolean;
};

type ApiClinicProfile = {
  id?: number;
  name?: string;
  address?: string;
  location?: string;
  phone?: string;
  opening_hours?: string;
  image?: string;
  photo?: string;
  average_rating?: number;
  total_ratings?: number;
};

type BookingSlot = {
  from: string;
  to: string;
  available: boolean;
};

type ApiRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null;
}

function unwrapData(data: unknown): unknown {
  if (isRecord(data) && data.data !== undefined) return unwrapData(data.data);
  return data;
}

function normalizeStaff(data: unknown): ApiStaffProfile | null {
  const unwrapped = unwrapData(data);
  if (!isRecord(unwrapped)) return null;
  return (unwrapped.staff || unwrapped.profile || unwrapped) as ApiStaffProfile;
}

function normalizeClinic(data: unknown): ApiClinicProfile | null {
  const unwrapped = unwrapData(data);
  if (!isRecord(unwrapped)) return null;
  return (unwrapped.clinic ||
    unwrapped.profile ||
    unwrapped) as ApiClinicProfile;
}

function normalizeSlots(data: unknown): BookingSlot[] {
  const unwrapped = unwrapData(data);
  const slots = Array.isArray(unwrapped)
    ? unwrapped
    : isRecord(unwrapped) && Array.isArray(unwrapped.slots)
      ? unwrapped.slots
      : [];

  return slots
    .map((slot): BookingSlot => {
      const record = isRecord(slot) ? slot : {};
      const from = String(
        record.from || record.time || record.booking_from || "",
      );
      return {
        from,
        to: String(record.to || ""),
        available: Boolean(record.available ?? record.is_available ?? true),
      };
    })
    .filter((slot: BookingSlot) => slot.from);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
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

function formatDisplayDate(date: string, locale: string) {
  if (!date) return "";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function formatWorkingDays(value: string, locale: string) {
  if (!value) return "";
  const dayMap =
    locale === "ar"
      ? {
          sun: "الاحد",
          mon: "الاثنين",
          tue: "الثلاثاء",
          tues: "الثلاثاء",
          wed: "الاربعاء",
          thu: "الخميس",
          thur: "الخميس",
          fri: "الجمعة",
          sat: "السبت",
        }
      : {
          sun: "Sunday",
          mon: "Monday",
          tue: "Tuesday",
          tues: "Tuesday",
          wed: "Wednesday",
          thu: "Thursday",
          thur: "Thursday",
          fri: "Friday",
          sat: "Saturday",
        };

  const formatToken = (token: string) => {
    const trimmed = token.trim();
    if (!trimmed) return "";

    const normalized = trimmed.toLowerCase().replace(/\.$/, "");
    const mapped = dayMap[normalized as keyof typeof dayMap];
    if (mapped) return mapped;

    if (trimmed.length < 2) return trimmed;
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  const parts = value
    .split(/[,/|]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (part.includes("-")) {
        const [start, end] = part.split("-");
        return `${formatToken(start)} - ${formatToken(end)}`.trim();
      }
      return formatToken(part);
    })
    .filter(Boolean);

  const separator = locale === "ar" ? "، " : ", ";
  return parts.join(separator);
}

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();

  const clinicId = Number(params.id);
  const staffId = Number(params.doctorId);
  const fallbackClinic = allClinics.find((c) => c.id === clinicId);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [locale, setLocale] = useState(() =>
    typeof window === "undefined"
      ? "en"
      : localStorage.getItem("locale") || "en",
  );
  const [staff, setStaff] = useState<ApiStaffProfile | null>(null);
  const [clinicProfile, setClinicProfile] = useState<ApiClinicProfile | null>(
    null,
  );
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [validationModalData, setValidationModalData] = useState<{
    type: "success" | "warning";
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    const handleLocaleChange: EventListener = (event) => {
      setLocale((event as CustomEvent<string>).detail);
    };
    window.addEventListener("localeChange", handleLocaleChange);
    return () => window.removeEventListener("localeChange", handleLocaleChange);
  }, []);

  useEffect(() => {
    async function loadProfile() {
      if (!staffId) {
        setProfileError(t("clinics.notFound", locale));
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      setProfileError("");

      try {
        const [staffResponse, clinicResponse] = await Promise.all([
          fetch(`/api/staff/${staffId}/profile`, { credentials: "include" }),
          clinicId
            ? fetch(`/api/clinic/profile?id=${clinicId}`, {
                credentials: "include",
              })
            : Promise.resolve(null),
        ]);

        const staffPayload = await staffResponse.json();
        if (!staffResponse.ok || staffPayload.success === false) {
          throw new Error(
            staffPayload.error ||
              staffPayload.message ||
              "Failed to load staff",
          );
        }

        setStaff(normalizeStaff(staffPayload));

        if (clinicResponse) {
          const clinicPayload = await clinicResponse.json();
          if (clinicResponse.ok && clinicPayload.success !== false) {
            setClinicProfile(normalizeClinic(clinicPayload));
          }
        }
      } catch (error: unknown) {
        console.error("Staff profile fetch error:", error);
        setProfileError(
          getErrorMessage(
            error,
            locale === "ar"
              ? "تعذر تحميل بيانات الطبيب."
              : "Failed to load staff profile.",
          ),
        );
      } finally {
        setProfileLoading(false);
      }
    }

    loadProfile();
  }, [clinicId, locale, staffId]);

  useEffect(() => {
    async function loadSlots() {
      if (!staffId || !selectedDate) {
        setSlots([]);
        return;
      }

      setSlotsLoading(true);
      setSlotsError("");

      try {
        const params = new URLSearchParams({
          staff_id: String(staffId),
          booking_date: selectedDate,
        });
        const response = await fetch(`/api/book/slots?${params.toString()}`, {
          credentials: "include",
        });
        const payload = await response.json();

        if (!response.ok || payload.success === false) {
          throw new Error(
            payload.error ||
              payload.message ||
              "Failed to load available slots",
          );
        }

        setSlots(normalizeSlots(payload));
      } catch (error: unknown) {
        console.error("Booking slots fetch error:", error);
        setSlots([]);
        setSlotsError(
          getErrorMessage(
            error,
            locale === "ar"
              ? "تعذر تحميل المواعيد المتاحة."
              : "Failed to load available times.",
          ),
        );
      } finally {
        setSlotsLoading(false);
      }
    }

    loadSlots();
  }, [locale, selectedDate, staffId]);

  const doctorName = staff?.full_name || staff?.name || "";
  const doctorSpecialty = staff?.specialist || staff?.role_title || "";
  const clinicRating = getSafeRating(
    clinicProfile?.average_rating ?? staff?.clinic_average_rating ?? 0,
  );

  const clinicRatingCount = Number(
    clinicProfile?.total_ratings ?? staff?.clinic_total_ratings ?? 0,
  );

  // doctor(staff) rating
  const doctorRating = getSafeRating(
    staff?.average_rating ?? staff?.rating ?? 0,
  );

  const doctorRatingCount = Number(staff?.total_ratings ?? 0);
  const canBeBooked =
    staff?.can_be_booked !== false && staff?.can_be_booked !== 0;
  const clinicName =
    staff?.clinic_name || clinicProfile?.name || fallbackClinic?.name || "";
  const clinicAddress =
    staff?.clinic_location ||
    clinicProfile?.address ||
    clinicProfile?.location ||
    fallbackClinic?.address ||
    "";
  const clinicCity =
    staff?.clinic_location ||
    clinicProfile?.location ||
    fallbackClinic?.city ||
    "";
  const clinicPhone =
    staff?.clinic_phone || clinicProfile?.phone || fallbackClinic?.phone || "";
  const clinicHours =
    clinicProfile?.opening_hours || fallbackClinic?.hours || "";
  const workingDays = staff?.work_days || "";
  const formattedWorkingDays = formatWorkingDays(workingDays, locale);
  const clinicImage =
    clinicProfile?.photo ||
    clinicProfile?.image ||
    fallbackClinic?.image ||
    "/images/clinic1.png";
  const staffImage =
    staff?.photo ||
    fallbackClinic?.doctors?.[0]?.imageSrc ||
    "/images/blank-profile-picture.png";

  const displayedDate = useMemo(
    () => formatDisplayDate(selectedDate, locale),
    [locale, selectedDate],
  );

  const openTimePicker = () => {
    if (!selectedDate) {
      setValidationModalData({
        type: "warning",
        title: t("booking.validation.selectDateOnly.title", locale),
        message: t("booking.validation.selectDateOnly.message", locale),
      });
      setShowValidationModal(true);
      return;
    }

    setShowTimePicker(true);
  };

  const handleBookingClick = async () => {
    if (!canBeBooked) {
      setValidationModalData({
        type: "warning",
        title: t("booking.validation.alreadyBooked.title", locale),
        message:
          locale === "ar"
            ? "هذا الطبيب غير متاح للحجز حاليا."
            : "This staff member is not available for booking right now.",
      });
      setShowValidationModal(true);
      return;
    }

    if (!selectedDate && !selectedTime) {
      setValidationModalData({
        type: "warning",
        title: t("booking.validation.selectDateTime.title", locale),
        message: t("booking.validation.selectDateTime.message", locale),
      });
      setShowValidationModal(true);
      return;
    }

    if (selectedDate && !selectedTime) {
      setValidationModalData({
        type: "warning",
        title: t("booking.validation.selectTimeOnly.title", locale),
        message: t("booking.validation.selectTimeOnly.message", locale),
      });
      setShowValidationModal(true);
      return;
    }

    if (!selectedDate && selectedTime) {
      setValidationModalData({
        type: "warning",
        title: t("booking.validation.selectDateOnly.title", locale),
        message: t("booking.validation.selectDateOnly.message", locale),
      });
      setShowValidationModal(true);
      return;
    }

    setIsBooking(true);

    try {
      const response = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_id: staffId,
          booking_date: selectedDate,
          booking_from: selectedTime,
        }),
        credentials: "include",
      });
      const payload = await response.json();

      if (!response.ok || payload.success === false) {
        throw new Error(
          payload.error || payload.message || "Failed to create booking",
        );
      }

      setValidationModalData({
        type: "success",
        title: t("booking.validation.success.title", locale),
        message: t("booking.validation.success.message", locale)
          .replace("{doctorName}", doctorName)
          .replace("{date}", displayedDate || selectedDate)
          .replace("{time}", selectedTime),
      });
      setShowValidationModal(true);
      setSlots((current) =>
        current.map((slot) =>
          slot.from === selectedTime ? { ...slot, available: false } : slot,
        ),
      );
    } catch (error: unknown) {
      setValidationModalData({
        type: "warning",
        title:
          locale === "ar" ? "تعذر إتمام الحجز" : "Could not complete booking",
        message: getErrorMessage(
          error,
          locale === "ar"
            ? "حدث خطأ أثناء إنشاء الحجز."
            : "Something went wrong while creating the booking.",
        ),
      });
      setShowValidationModal(true);
    } finally {
      setIsBooking(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-semibold text-[#001A6E]">
          {locale === "ar" ? "جاري تحميل الملف..." : "Loading profile..."}
        </p>
      </div>
    );
  }

  if (profileError || !staff) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-semibold text-red-600">
          {profileError || t("clinics.notFound", locale)}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <button
          onClick={() => router.back()}
          className="mb-8 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#001A6E] shadow-sm transition hover:bg-[#eef3ff]"
        >
          <ArrowRight
            className={`w-5 h-5 ${locale === "ar" ? "" : "rotate-180"}`}
          />
          {t("booking.back", locale)}
        </button>

        <div className="flex flex-col gap-8 lg:flex-row">
          <div
            className={`flex-1 space-y-8 ${locale === "ar" ? "order-1 lg:order-1" : "order-1"}`}
          >
            <div className="rounded-[28px] border border-[#dce5f6] bg-white p-5 shadow-[0_18px_55px_rgba(20,45,100,0.08)] sm:p-7">
              <div className="flex flex-col items-start gap-8 md:flex-row">
                <div className="relative h-56 w-full shrink-0 overflow-hidden rounded-3xl bg-[#eaf0fb] shadow-md md:h-52 md:w-52">
                  <Image
                    src={staffImage}
                    alt={doctorName}
                    width={420}
                    height={420}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-sm font-bold text-[#001A6E] shadow">
                    <Star className="h-4 w-4 fill-[#f7b731] text-[#f7b731]" />
                    {doctorRating.toFixed(1)}
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-3xl font-extrabold text-[#001A6E]">
                        {doctorName}
                      </h1>
                      {formattedWorkingDays && (
                        <span className="text-xs font-semibold text-[#001A6E] bg-blue-50 px-3 py-1 rounded-full">
                          {locale === "ar"
                            ? `ايام العمل: ${formattedWorkingDays}`
                            : `Working days: ${formattedWorkingDays}`}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 font-medium">
                      {t("specialties.doctors", locale)} {doctorSpecialty}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#fff7e3] px-4 py-2">
                      <RatingStars rating={doctorRating} />
                      <span className="text-sm font-bold text-[#7a4f00]">
                        {doctorRating.toFixed(1)}
                      </span>
                      {doctorRatingCount > 0 && (
                        <span className="text-xs font-semibold text-[#8a7856]">
                          ({doctorRatingCount})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-[#f4f7ff] p-4">
                      <p className="text-xs text-gray-400 mb-1">
                        {t("booking.sessionFee", locale)}
                      </p>
                      <p className="font-bold text-[#001A6E]">
                        {staff.consultation_price ?? "-"}{" "}
                        {locale === "ar" ? "ج.م" : "EGP"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#f4f7ff] p-4">
                      <p className="text-xs text-gray-400 mb-1">
                        {t("booking.city", locale)}
                      </p>
                      <p className="font-bold text-[#001A6E]">{clinicCity}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setShowDatePicker(true)}
                      className="flex items-center gap-2 rounded-xl border border-[#dce5f6] px-4 py-2 text-sm font-semibold text-gray-500 transition-colors hover:bg-[#f4f7ff]"
                    >
                      <Calendar className="w-4 h-4 text-[#001A6E]" />
                      {displayedDate || t("booking.datePlaceholder", locale)}
                    </button>
                    <button
                      onClick={openTimePicker}
                      className="flex items-center gap-2 rounded-xl border border-[#dce5f6] px-4 py-2 text-sm font-semibold text-gray-500 transition-colors hover:bg-[#f4f7ff]"
                    >
                      <Clock className="w-4 h-4 text-[#001A6E]" />
                      {selectedTime || t("booking.timePlaceholder", locale)}
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-2">
                    <button
                      onClick={handleBookingClick}
                      disabled={isBooking}
                      className="flex-1 rounded-2xl bg-[#001A6E] py-4 font-bold text-white shadow-lg shadow-blue-900/10 transition-colors hover:bg-[#162f80] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isBooking
                        ? locale === "ar"
                          ? "جاري الحجز..."
                          : "Booking..."
                        : t("booking.bookNow", locale)}
                    </button>
                    <button className="flex items-center justify-center gap-2 rounded-2xl border border-[#dce5f6] px-8 py-4 font-bold text-gray-600 transition-colors hover:bg-[#f4f7ff]">
                      <Mail className="w-5 h-5" />
                      {t("booking.sendMessage", locale)}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <section className="rounded-[28px] border border-[#dce5f6] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-[#001A6E] mb-4">
                {t("booking.aboutDoctor", locale)}
              </h2>
              <p className="text-gray-500 leading-relaxed text-sm">
                {staff.about ||
                  (locale === "ar"
                    ? "استشاري متخصص بخبرة واسعة في مجاله، يحرص على تقديم أفضل رعاية طبية للمرضى."
                    : "Specialized consultant with extensive experience, focused on providing high quality medical care.")}
              </p>
            </section>
          </div>

          <div
            className={`lg:w-80 shrink-0 ${locale === "ar" ? "order-2 lg:order-2" : "order-2"}`}
          >
            <div className="sticky top-28 rounded-[28px] border border-[#dce5f6] bg-white p-6 shadow-[0_18px_55px_rgba(20,45,100,0.08)]">
              <h2 className="text-xl font-bold text-[#001A6E] mb-6">
                {t("booking.clinicInfo", locale)}
              </h2>

              <div className="aspect-square relative rounded-2xl overflow-hidden mb-6 shadow-inner bg-gray-50">
                <Image
                  src={clinicImage}
                  alt={clinicName}
                  width={420}
                  height={420}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">{clinicName}</h3>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#fff7e3] px-3 py-1.5 text-sm font-bold text-[#7a4f00]">
                    <RatingStars rating={clinicRating} />
                    <span>{clinicRating.toFixed(1)}</span>
                    {clinicRatingCount > 0 && (
                      <span className="text-xs text-[#8a7856]">
                        ({clinicRatingCount})
                      </span>
                    )}
                  </div>
                  <div className="flex items-start gap-2 text-gray-400 text-sm">
                    <MapPin className="w-4 h-4 mt-1 shrink-0" />
                    <span>{clinicAddress}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span dir="ltr">{clinicPhone}</span>
                </div>

                <div>
                  <h3 className="font-bold text-gray-800 mb-3">
                    {t("booking.workingHours", locale)}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {clinicHours ||
                      `${staff.work_from || ""} - ${staff.work_to || ""}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 rounded-[28px] border border-[#dce5f6] bg-white p-6 shadow-sm sm:p-10">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-[#001A6E] mb-4">
              {t("booking.patientReviews", locale)}
            </h2>
            <div className="flex flex-col items-center">
              <div className="mb-3">
                <RatingStars rating={doctorRating} className="h-7 w-7" />
              </div>
              <p className="text-4xl font-extrabold text-[#001A6E]">
                {doctorRating.toFixed(1)}
              </p>
              <p className="font-bold text-lg text-gray-800">
                {t("booking.overallRating", locale)}
              </p>
              <p className="text-gray-400 text-sm">
                {doctorRatingCount > 0
                  ? t("clinics.fromVisitors", locale).replace(
                      "{count}",
                      String(doctorRatingCount),
                    )
                  : t("booking.fromVisitors", locale)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {(fallbackClinic?.reviews || []).slice(0, 4).map((review) => (
              <div
                key={review.id}
                className="bg-linear-to-br from-blue-50 to-white border border-blue-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 text-yellow-400 fill-yellow-400"
                    />
                  ))}
                </div>
                <p className="font-bold text-sm text-gray-800 mb-2">
                  {t("booking.overallRating", locale)}
                </p>
                <p className="text-gray-600 text-xs font-medium mb-1">
                  {review.name}
                </p>
                <p className="text-gray-400 text-[11px] mb-3">{review.date}</p>
                <p className="text-gray-600 text-sm leading-relaxed">
                  &quot;{review.comment}&quot;
                </p>
              </div>
            ))}
          </div>
        </div>

        {showDatePicker && (
          <DatePicker
            selectedDate={selectedDate}
            onSelect={(date) => {
              setSelectedDate(date);
              setSelectedTime("");
              setShowDatePicker(false);
            }}
            onClose={() => setShowDatePicker(false)}
          />
        )}

        {showTimePicker && (
          <TimePicker
            slots={slots}
            loading={slotsLoading}
            error={slotsError}
            onSelect={(time) => {
              setSelectedTime(time);
              setShowTimePicker(false);
            }}
            onClose={() => setShowTimePicker(false)}
          />
        )}

        {showValidationModal && validationModalData && (
          <ValidationModal
            type={validationModalData.type}
            title={validationModalData.title}
            message={validationModalData.message}
            onClose={() => setShowValidationModal(false)}
          />
        )}
      </div>
    </div>
  );
}
