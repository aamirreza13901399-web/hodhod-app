/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Algorithms for converting Gregorian calendar to Jalali (Shamsi) dates
export function gregorianToJalali(gy: number, gm: number, gd: number): { jy: number, jm: number, jd: number } {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 335];
  let jy: number, jm: number, jd: number;
  let gy2 = (gm > 2) ? (gy + 1) : gy;
  let g_day_no = 365 * (gy - 1600) + Math.floor((gy2 - 1600) / 4) - Math.floor((gy2 - 1600) / 100) + Math.floor((gy2 - 1600) / 400) + gd + g_d_m[gm - 1] - 1;
  let j_day_no = g_day_no - 79;
  let j_np = Math.floor(j_day_no / 12053);
  j_day_no %= 12053;
  jy = 979 + 33 * j_np + 4 * Math.floor(j_day_no / 1461);
  j_day_no %= 1461;
  if (j_day_no >= 366) {
    jy += Math.floor((j_day_no - 1) / 365);
    j_day_no = (j_day_no - 1) % 365;
  }
  for (let i = 0; i < 11 && j_day_no >= [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29][i]; i++) {
    j_day_no -= [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29][i];
  }
  jm = 1;
  while (j_day_no >= (jm <= 6 ? 31 : 30)) {
    j_day_no -= jm <= 6 ? 31 : 30;
    jm++;
  }
  jd = j_day_no + 1;
  return { jy, jm, jd };
}

// Convert Date object to Persian Jalali String (YYYY/MM/DD)
export function getPersianDateString(date: Date = new Date()): string {
  const gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();
  const { jy, jm, jd } = gregorianToJalali(gy, gm, gd);
  return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
}

// Format Date object to dynamic Iran Tehran Time (IRST)
export function getPersianDateTimeString(dateInput: Date | string = new Date()): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  
  // Convert UTC to IRST (+3:30)
  // Let's adjust manually to ensure accurate rendering in any container environment
  const localTime = d.getTime();
  const localOffset = d.getTimezoneOffset() * 60000;
  const utc = localTime + localOffset;
  const tehranOffsetMs = 3.5 * 3600000;
  const tehranDate = new Date(utc + tehranOffsetMs);

  const gy = tehranDate.getFullYear();
  const gm = tehranDate.getMonth() + 1;
  const gd = tehranDate.getDate();
  const { jy, jm, jd } = gregorianToJalali(gy, gm, gd);

  const hours = String(tehranDate.getHours()).padStart(2, "0");
  const minutes = String(tehranDate.getMinutes()).padStart(2, "0");
  const seconds = String(tehranDate.getSeconds()).padStart(2, "0");

  return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")} ساعت ${hours}:${minutes}:${seconds}`;
}

// Short relative time in Persian
export function getRelativeTimeFarsi(dateString: string): string {
  const past = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - past.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "هم‌اکنون";
  if (diffMin < 60) return `${diffMin} دقیقه قبل`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} ساعت قبل`;
  return getPersianDateString(past);
}

// Persian month names list
export const PERSIAN_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد",
  "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر",
  "دی", "بهمن", "اسفند"
];

// Weekday names
export function getPersianWeekdayName(date: Date): string {
  const weekdays = [
    "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"
  ];
  return weekdays[date.getDay()];
}

// Complete real-time Shamsi clock string with weekday and seconds
export function getShamsiClockString(date: Date = new Date()): string {
  const gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();
  const { jy, jm, jd } = gregorianToJalali(gy, gm, gd);

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  const weekday = getPersianWeekdayName(date);
  const monthName = PERSIAN_MONTHS[jm - 1];

  return `${weekday}، ${jd} ${monthName} ${jy} - ${hours}:${minutes}:${seconds}`;
}
