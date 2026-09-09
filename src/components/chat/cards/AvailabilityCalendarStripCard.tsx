import React, { useState, useEffect, useMemo } from "react";
import { AvailabilityCalendarData, BlockedDateRange } from "../../../lib/types";
import { PropertyClient } from "@/lib/propertyClient";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

// Approximate lunar cycle calculator for celestial starlight motifs
const getMoonCycleDay = (year: number, month: number, day: number): number => {
  const knownNewMoon = new Date(Date.UTC(2024, 0, 11, 11, 57)).getTime();
  const targetDate = new Date(Date.UTC(year, month, day, 12, 0)).getTime();
  const diffDays = (targetDate - knownNewMoon) / (1000 * 60 * 60 * 24);
  const cycleDay = ((diffDays % 29.53058867) + 29.53058867) % 29.53058867;
  return Math.min(30, Math.max(1, Math.round(cycleDay) + 1));
};

interface AvailabilityCalendarStripCardProps {
  data: AvailabilityCalendarData;
  onSelectDateRange?: (start: string, end: string, total: number, dateSummary?: string) => void;
  onClose?: () => void;
  initialCheckIn?: string;
  initialCheckOut?: string;
  className?: string;
  refreshKey?: number;
  isHostMode?: boolean;
}

export const AvailabilityCalendarStripCard: React.FC<AvailabilityCalendarStripCardProps> = ({
  data,
  onSelectDateRange,
  onClose,
  initialCheckIn,
  initialCheckOut,
  className,
  refreshKey,
  isHostMode = false,
}) => {
  // Reference for today
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();
  const todayDateStr = `${todayYear}-${String(todayMonth + 1).padStart(2, "0")}-${String(todayDate).padStart(2, "0")}`;

  // Determine initial month index from initialCheckIn, data.monthName, or current date
  const getInitialMonthIndex = (): number => {
    if (initialCheckIn) {
      const d = new Date(initialCheckIn);
      if (!isNaN(d.getTime())) return d.getMonth();
    }
    if (data.monthName) {
      const idx = MONTH_NAMES.findIndex(
        (m) => m.toLowerCase() === data.monthName?.toLowerCase()
      );
      if (idx !== -1) return idx;
    }
    if (data.blockedDates && data.blockedDates.length > 0 && data.blockedDates[0].start) {
      const d = new Date(data.blockedDates[0].start);
      if (!isNaN(d.getTime())) return d.getMonth();
    }
    return todayMonth;
  };

  const getInitialYear = (): number => {
    if (initialCheckIn) {
      const d = new Date(initialCheckIn);
      if (!isNaN(d.getTime())) return d.getFullYear();
    }
    if (data.year) return data.year;
    if (data.blockedDates && data.blockedDates.length > 0 && data.blockedDates[0].start) {
      const d = new Date(data.blockedDates[0].start);
      if (!isNaN(d.getTime())) return d.getFullYear();
    }
    return todayYear;
  };

  const [currentYear, setCurrentYear] = useState<number>(getInitialYear());
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(getInitialMonthIndex());
  const [blockedRanges, setBlockedRanges] = useState<BlockedDateRange[]>([]);
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(initialCheckIn || null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(initialCheckOut || null);
  const [earliest,setEarliest] = useState<string | null>(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState<boolean>(false);

  // Calculate days in the current selected month
  const totalDaysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();

  useEffect(() => {
    (async () => {
      const pad = (n: number) => String(n).padStart(2, "0");
      const startStr = `${currentYear}-${pad(currentMonthIndex + 1)}-01`;
      const endStr = `${currentYear}-${pad(currentMonthIndex + 1)}-${pad(totalDaysInMonth)}`;
      const blocked = await PropertyClient.getPropertyBlockedDates(
        data.propertyId,
        startStr,
        endStr
      );
      setBlockedRanges(blocked);
    })();
  }, [currentMonthIndex, currentYear, data.propertyId, totalDaysInMonth, refreshKey]);

  // Prevent navigating to months before current month
  const isPrevMonthDisabled =
    currentYear < todayYear ||
    (currentYear === todayYear && currentMonthIndex <= todayMonth);

  // Calculate first day of month weekday offset (0: Monday, 6: Sunday)
  const firstDayWeekday = (new Date(currentYear, currentMonthIndex, 1).getDay() + 6) % 7;

  // Direct check whether an ISO date "YYYY-MM-DD" falls within any blocked range
  const isDateBooked = (dateStr: string): boolean => {
    return blockedRanges.some((range) => {
      const s = range.start;
      const e = range.end || range.start;
      return s && e && dateStr >= s && dateStr <= e;
    });
  };

  // Find the earliest blocked date strictly after selectedStartDate across all blocked ranges
  const earliestNextBlockedDateStr = useMemo((): string | null => {
    if (!selectedStartDate) {
      setEarliest(null)
      return null;
    }
    let early: string | null = earliest;
    blockedRanges.forEach((range) => {
      const s = range.start;
      if (s && s > selectedStartDate) {
        if (!early || s < early) {
          early = s;
        }
      }
    });
    setEarliest(early)
    return early;
  }, [selectedStartDate, blockedRanges]);

  const handlePrevMonth = () => {
    if (isPrevMonthDisabled) return;
    let newMonth = currentMonthIndex - 1;
    let newYear = currentYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    }
    setCurrentMonthIndex(newMonth);
    setCurrentYear(newYear);
  };

  const handleNextMonth = () => {
    let newMonth = currentMonthIndex + 1;
    let newYear = currentYear;
    if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    setCurrentMonthIndex(newMonth);
    setCurrentYear(newYear);
  };

  const handleDateClick = (day: number) => {
    const clickedDateStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isPast = clickedDateStr < todayDateStr;
    const isBooked = isDateBooked(clickedDateStr);

    if (isPast) return;

    const canClickBooked = isHostMode;

    // If no start date or both start and end dates are already chosen:
    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      if (isBooked && !canClickBooked) return;
      setSelectedStartDate(clickedDateStr);
      setSelectedEndDate(null);
      // Do not prematurely fire onSelectDateRange with start === end; wait for check-out click!
    } else if (selectedStartDate && !selectedEndDate) {
      // User is picking checkout date
      if (clickedDateStr <= selectedStartDate) {
        // If clicking earlier date or same date, reset start date to this date
        if (!isBooked || canClickBooked) {
          setSelectedStartDate(clickedDateStr);
          setSelectedEndDate(null);
        }
        return;
      }

      // Check if there is an overlap with a blocked date between selectedStartDate and clickedDateStr
      const hasOverlap = !canClickBooked && blockedRanges.some((r) => {
        return r.start && r.start > selectedStartDate && r.start < clickedDateStr;
      });

      const nextBlocked: string | null = earliestNextBlockedDateStr;
      if (!canClickBooked && (hasOverlap || (nextBlocked !== null && typeof nextBlocked === "string" && clickedDateStr > nextBlocked))) {
        // Overlap: restart check-in if valid
        if (!isBooked) {
          setSelectedStartDate(clickedDateStr);
          setSelectedEndDate(null);
        }
      } else {
        // Valid end date selected!
        setSelectedEndDate(clickedDateStr);

        // Trigger selection callback now that both check-in and check-out are chosen
        const sD = new Date(selectedStartDate + "T12:00:00");
        const eD = new Date(clickedDateStr + "T12:00:00");
        const nights = Math.max(1, Math.round((eD.getTime() - sD.getTime()) / (1000 * 60 * 60 * 24)));
        const total = nights * (data.nightlyRate || 100);
        const summary = `${formatFriendlyDate(selectedStartDate)} – ${formatFriendlyDate(clickedDateStr)}`;
        if (onSelectDateRange) {
          onSelectDateRange(selectedStartDate, clickedDateStr, total, summary);
        }
      }
    }
  };

  const handleResetSelection = () => {
    setSelectedStartDate(null);
    setSelectedEndDate(null);
  };

  const formatFriendlyDate = (dateStr: string): string => {
    const parts = dateStr.split("-").map(Number);
    const mName = MONTH_NAMES[parts[1] - 1]?.slice(0, 3);
    return `${mName} ${parts[2]}, ${parts[0]}`;
  };

  const currentMonthName = MONTH_NAMES[currentMonthIndex];

  let calculatedNights = 0;
  if (selectedStartDate && selectedEndDate) {
    const sD = new Date(selectedStartDate + "T12:00:00");
    const eD = new Date(selectedEndDate + "T12:00:00");
    calculatedNights = Math.max(1, Math.round((eD.getTime() - sD.getTime()) / (1000 * 60 * 60 * 24)));
  } else if (selectedStartDate) {
    calculatedNights = data.minimumStayNights || 1;
  }

  const totalEstimate = calculatedNights * (data.nightlyRate || 100);

  let formattedDateSummary = `Select dates in ${currentMonthName} ${currentYear}`;
  if (selectedStartDate && selectedEndDate) {
    formattedDateSummary = `${formatFriendlyDate(selectedStartDate)} – ${formatFriendlyDate(selectedEndDate)}`;
  } else if (selectedStartDate) {
    formattedDateSummary = `Check-in: ${formatFriendlyDate(selectedStartDate)} (Select departure)`;
  }

  const handleLockInSelection = () => {
    if (!selectedStartDate) return;
    const finalEnd = selectedEndDate || selectedStartDate;
    const summary = selectedEndDate
      ? `${formatFriendlyDate(selectedStartDate)} – ${formatFriendlyDate(selectedEndDate)}`
      : `${formatFriendlyDate(selectedStartDate)}`;

    if (onSelectDateRange) {
      onSelectDateRange(selectedStartDate, finalEnd, totalEstimate, summary);
    }
  };

  return (
    <div className={`relative w-full rounded-2xl bg-[#121215] border border-[#2A2A2E] p-4 sm:p-5 shadow-[0_24px_50px_rgba(0,0,0,0.6)] text-[#F5F4F1] font-sans antialiased overflow-hidden select-none ${className || "max-w-xl"}`}>
      {/* Subtle top starlight gold accent beam */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#dfb15b]/60 to-transparent pointer-events-none" />

      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-[#2A2A2E]">
        <div className="flex items-center gap-2.5">
          {/* Luminous Lunar Icon Badge */}
          <div className="w-8 h-8 rounded-full bg-[#1b1b1f] border border-[#dfb15b]/40 flex items-center justify-center shadow-[0_0_12px_rgba(223,177,91,0.25)] flex-shrink-0">
            <span className="material-symbols-outlined text-[18px] text-[#dfb15b]">
              nightlight
            </span>
          </div>
          <div>
            <h4 className="font-serif text-[16px] sm:text-[18px] text-[#F5F4F1] tracking-wider uppercase font-normal leading-tight">
              {currentMonthName} {currentYear}
            </h4>
            <span className="text-[10px] font-mono tracking-widest text-[#9A9A9F] uppercase flex items-center gap-1 mt-0.5">
              <span className="w-1 h-1 rounded-full bg-[#dfb15b] animate-pulse" />
              {selectedStartDate && !selectedEndDate
                ? "Select Checkout Night"
                : "Nocturnal Sanctuary Calendar"}
            </span>
          </div>
        </div>

        {/* Month Navigation Arrows */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={isPrevMonthDisabled}
            className="w-7 h-7 rounded-full bg-[#1c1c20] hover:bg-[#28282e] border border-[#2A2A2E] hover:border-[#dfb15b]/60 text-[#c3c7cc] hover:text-[#dfb15b] flex items-center justify-center transition-all disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
            title="Previous Month"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-7 h-7 rounded-full bg-[#1c1c20] hover:bg-[#28282e] border border-[#2A2A2E] hover:border-[#dfb15b]/60 text-[#c3c7cc] hover:text-[#dfb15b] flex items-center justify-center transition-all cursor-pointer"
            title="Next Month"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Property & Rate Subline */}
      <div className="flex items-center justify-between py-2 text-[11px] text-[#9A9A9F] font-data-tabular border-b border-[#2A2A2E]/50">
        <span className="truncate max-w-[200px] sm:max-w-xs">
          {data.propertyTitle || "Sanctuary"} • Min {data.minimumStayNights || 1} Night
        </span>
        {data.nightlyRate ? (
          <span className="text-[#dfb15b] font-medium tracking-wide">
            €{data.nightlyRate} <span className="text-[10px] text-[#9A9A9F]">/ night</span>
          </span>
        ) : null}
      </div>

      {/* Weekday Row Header */}
      <div className="grid grid-cols-7 gap-1 text-center mt-2.5 mb-1.5">
        {WEEKDAY_NAMES.map((wd) => (
          <div
            key={wd}
            className="font-mono text-[10px] font-semibold text-[#8A8884] uppercase tracking-wider py-1"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {/* Leading empty cells */}
        {Array.from({ length: firstDayWeekday }, (_, i) => (
          <div key={`empty-${i}`} className="aspect-square invisible" />
        ))}

        {/* Days of Month */}
        {Array.from({ length: totalDaysInMonth }, (_, i) => i + 1).map((day) => {
          const currentCellDateStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

          const isPast = currentCellDateStr < todayDateStr;
          const isBooked = isDateBooked(currentCellDateStr);

          const isBlockedByOverlap = Boolean(
            selectedStartDate !== null &&
              selectedEndDate === null &&
              earliestNextBlockedDateStr &&
              currentCellDateStr > (earliestNextBlockedDateStr as string)
          );

          const isStart = selectedStartDate === currentCellDateStr;
          const isEnd = selectedEndDate === currentCellDateStr;
          const isInRange =
            selectedStartDate !== null &&
            selectedEndDate !== null &&
            currentCellDateStr > selectedStartDate &&
            currentCellDateStr < selectedEndDate;

          const isDisabled = isPast || isBooked || isBlockedByOverlap;

          // Lunar cycle calculation for celestial motif
          const moonDay = getMoonCycleDay(currentYear, currentMonthIndex, day);
          const isFullMoonNight = moonDay === 15;
          const isNewMoonNight = moonDay === 1 || moonDay === 30;

          // Style classes
          let dayClasses = "aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-data-tabular relative transition-all duration-150 select-none ";

          if (isStart || isEnd) {
            dayClasses += "bg-gradient-to-b from-[#f3cf7a] to-[#dfb15b] text-[#0A0A0C] font-bold shadow-[0_0_16px_rgba(223,177,91,0.55)] scale-105 z-10 border border-[#dfb15b] cursor-pointer";
          } else if (isInRange) {
            dayClasses += "bg-[#dfb15b]/20 text-[#f3cf7a] font-semibold border-y border-[#dfb15b]/30 rounded-none cursor-pointer hover:bg-[#dfb15b]/30";
          } else if (isPast) {
            dayClasses += "text-[#404044] cursor-not-allowed opacity-30 bg-transparent";
          } else if (isBooked) {
            dayClasses += "text-[#55555c] line-through cursor-not-allowed opacity-35 bg-[#17171a]/50";
          } else if (isBlockedByOverlap) {
            dayClasses += "text-[#55555c] cursor-not-allowed opacity-35 bg-[#17171a]/50";
          } else {
            // Available
            dayClasses += "text-[#F5F4F1] bg-[#1a1a1e] hover:bg-[#25252a] hover:border-[#dfb15b]/50 hover:text-white border border-[#2A2A2E]/60 cursor-pointer";
          }

          let cellTitle = `${currentMonthName} ${day} is available`;
          if (isPast) cellTitle = `${currentMonthName} ${day} has elapsed`;
          else if (isBooked) cellTitle = `${currentMonthName} ${day} is already reserved`;
          else if (isBlockedByOverlap) cellTitle = `Cannot span past existing reservation`;

          return (
            <button
              key={day}
              type="button"
              onClick={() => handleDateClick(day)}
              disabled={isDisabled}
              className={dayClasses}
              title={cellTitle}
            >
              <span className="leading-none">{day}</span>
              {/* Subtle Celestial Moon Indicator on Full / New Moon */}
              {!isDisabled && !isStart && !isEnd && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full flex items-center justify-center">
                  {isFullMoonNight ? (
                    <span className="w-1 h-1 rounded-full bg-[#dfb15b] shadow-[0_0_4px_#dfb15b]" title="Full Moon" />
                  ) : isNewMoonNight ? (
                    <span className="w-1 h-1 rounded-full bg-[#dae4ed]/40" title="New Moon" />
                  ) : null}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer: Selection Summary, Reset & Apply */}
      <div className="mt-3.5 pt-3 border-t border-[#2A2A2E] flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <div className="text-[12px] font-medium text-[#F5F4F1]">
            {formattedDateSummary}
            {calculatedNights > 0 && selectedEndDate && (
              <span className="text-[#9A9A9F] font-normal"> ({calculatedNights} {calculatedNights === 1 ? "night" : "nights"})</span>
            )}
          </div>
          <div className="text-[11px] text-[#9A9A9F]">
            {totalEstimate > 0 && selectedEndDate ? (
              <span>
                Estimate: <strong className="text-[#dfb15b] font-data-tabular">€{Number(totalEstimate).toLocaleString()}</strong>
              </span>
            ) : (
              <span className="text-[10px] text-[#8A8884]">Click check-in &amp; check-out dates</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedStartDate && (
            <button
              type="button"
              onClick={handleResetSelection}
              className="px-2.5 py-1 rounded-full text-[10px] font-label-caps-sm uppercase tracking-wider text-[#9A9A9F] hover:text-[#F5F4F1] border border-[#2A2A2E] hover:border-[#444] transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}

          {selectedStartDate && (
            <button
              type="button"
              onClick={handleLockInSelection}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#dfb15b] to-[#c59b27] hover:from-[#f3cf7a] hover:to-[#dfb15b] text-[#0A0A0C] font-semibold text-[11px] uppercase tracking-wider shadow-[0_2px_12px_rgba(223,177,91,0.35)] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">check</span>
              <span>{isHostMode ? "Confirm Dates" : "Apply Dates"}</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-2 py-1 text-xs text-[#9A9A9F] hover:text-white cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
