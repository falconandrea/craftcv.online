"use client";

/**
 * Month/Year Select Component
 *
 * A cascading select component for selecting year and month.
 * Used as an alternative to the calendar picker for better UX.
 *
 * Design Decision:
 * - Uses separate selects for year and month instead of a calendar
 * - This allows users to quickly select dates without clicking through months
 * - Range: 1950 to current year + 1 (for future dates)
 * - Format output: "yyyy-MM" (e.g., "2024-01") to match existing data schema
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MonthYearSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

// Month names for display
const MONTHS = [
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

/**
 * Generate year options from 1950 to current year + 1
 *
 * Design Decision:
 * - Start at 1950: reasonable lower bound for professional experience
 * - End at current year + 1: allows for future dates (e.g., start date)
 * - Descending order: most recent years appear first
 */
const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear + 1; year >= 1950; year--) {
    years.push(year);
  }
  return years;
};

export function MonthYearSelect({
  value,
  onChange,
  disabled,
}: MonthYearSelectProps) {
  const yearOptions = generateYearOptions();

  // Parse current value into year and month components
  // Expected format: "yyyy-MM" (e.g., "2024-01")
  let currentYear = "";
  let currentMonth = "";

  if (value) {
    const parts = value.split("-");
    if (parts.length === 2) {
      currentYear = parts[0];
      currentMonth = parts[1];
    }
  }

  /**
   * Handle year selection
   *
   * Design Decision:
   * - If month is already selected, combine with new year
   * - Otherwise, default to January (01) to ensure valid date
   */
  const handleYearChange = (year: string) => {
    if (currentMonth) {
      onChange(`${year}-${currentMonth}`);
    } else {
      onChange(`${year}-01`);
    }
  };

  /**
   * Handle month selection
   *
   * Design Decision:
   * - If year is already selected, combine with new month
   * - Otherwise, default to current year for convenience
   */
  const handleMonthChange = (month: string) => {
    if (currentYear) {
      onChange(`${currentYear}-${month}`);
    } else {
      const currentYear = new Date().getFullYear();
      onChange(`${currentYear}-${month}`);
    }
  };

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <Select
          value={currentYear}
          onValueChange={handleYearChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <Select
          value={currentMonth}
          onValueChange={handleMonthChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((month, index) => (
              <SelectItem
                key={month}
                value={(index + 1).toString().padStart(2, "0")}
              >
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
