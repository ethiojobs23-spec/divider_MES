/**
 * dateUtils.js — ISO 8601 Week Calculation and Management Utilities
 * Developer: Mintesnot Abebe | Brand: dev MinteIO
 */

/**
 * Returns the standard ISO 8601 week label in "W{WW}-{YYYY}" format (e.g. "W35-2026").
 * In ISO 8601, weeks start on Monday, and Week 1 is the week with the year's first Thursday.
 *
 * @param {Date} [d=new Date()] 
 * @returns {string}
 */
export function getISOWeekLabel(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7 // Monday = 1, Sunday = 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum) // Nearest Thursday
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
  return `W${String(weekNo).padStart(2, '0')}-${date.getUTCFullYear()}`
}

/**
 * Parses a week label string like "W35-2026" into an object { week: 35, year: 2026 }.
 *
 * @param {string} weekLabel 
 * @returns {{ week: number, year: number }}
 */
export function parseWeekLabel(weekLabel) {
  if (!weekLabel || typeof weekLabel !== 'string') {
    const now = new Date()
    return { week: 1, year: now.getFullYear() }
  }
  const match = weekLabel.match(/W(\d+)-(\d+)/i)
  if (!match) {
    const now = new Date()
    return { week: 1, year: now.getFullYear() }
  }
  return {
    week: parseInt(match[1], 10),
    year: parseInt(match[2], 10)
  }
}

/**
 * Formats week number and year into "W{WW}-{YYYY}".
 *
 * @param {number} week 
 * @param {number} year 
 * @returns {string}
 */
export function formatWeekLabel(week, year) {
  return `W${String(week).padStart(2, '0')}-${year}`
}

/**
 * Shifts a week label by delta (+1 or -1 or more weeks), correctly wrapping across years.
 *
 * @param {string} weekLabel 
 * @param {number} delta 
 * @returns {string}
 */
export function getShiftedWeekLabel(weekLabel, delta) {
  const { week, year } = parseWeekLabel(weekLabel)
  
  // Calculate Monday of the target week via UTC timestamp math
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const monWeek1 = new Date(jan4.getTime() - (jan4Day - 1) * 86400000)
  const targetDate = new Date(monWeek1.getTime() + ((week - 1) + delta) * 7 * 86400000)
  
  return getISOWeekLabel(targetDate)
}

/**
 * Compares two week labels.
 * Returns:
 *  - negative number if weekA is before weekB (weekA is older)
 *  - 0 if weekA is identical to weekB
 *  - positive number if weekA is after weekB (weekA is newer/upcoming)
 *
 * @param {string} weekA 
 * @param {string} weekB 
 * @returns {number}
 */
export function compareWeekLabels(weekA, weekB) {
  const pA = parseWeekLabel(weekA)
  const pB = parseWeekLabel(weekB)
  if (pA.year !== pB.year) {
    return pA.year - pB.year
  }
  return pA.week - pB.week
}

/**
 * Returns the human-readable date range for a given week (e.g. "Aug 24 – Aug 30, 2026").
 *
 * @param {string} weekLabel 
 * @returns {string}
 */
export function getWeekDateRange(weekLabel) {
  const { week, year } = parseWeekLabel(weekLabel)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const monWeek1 = new Date(jan4.getTime() - (jan4Day - 1) * 86400000)
  const monday = new Date(monWeek1.getTime() + (week - 1) * 7 * 86400000)
  const sunday = new Date(monday.getTime() + 6 * 86400000)

  const mFmt = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  const sFmt = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  return `${mFmt} – ${sFmt}`
}

/**
 * Evaluates the status of a week relative to the real-world current calendar week.
 *
 * @param {string} weekLabel 
 * @param {Date} [referenceDate=new Date()] 
 * @returns {{
 *   status: 'current' | 'past' | 'upcoming',
 *   label: string,
 *   tag: string,
 *   description: string,
 *   isCurrent: boolean,
 *   isPast: boolean,
 *   isUpcoming: boolean,
 *   actualWeek: string,
 *   dateRange: string
 * }}
 */
export function getWeekStatus(weekLabel, referenceDate = new Date()) {
  const actualWeek = getISOWeekLabel(referenceDate)
  const cmp = compareWeekLabels(weekLabel, actualWeek)

  const dateRange = getWeekDateRange(weekLabel)

  if (cmp === 0) {
    return {
      status: 'current',
      label: 'CURRENT WEEK',
      tag: 'Current Active Week',
      description: 'Live Factory Operations',
      isCurrent: true,
      isPast: false,
      isUpcoming: false,
      actualWeek,
      dateRange
    }
  } else if (cmp < 0) {
    return {
      status: 'past',
      label: 'OLD WEEK',
      tag: 'Historical / Past Week',
      description: 'Viewing Past Production Archive',
      isCurrent: false,
      isPast: true,
      isUpcoming: false,
      actualWeek,
      dateRange
    }
  } else {
    return {
      status: 'upcoming',
      label: 'UPCOMING WEEK',
      tag: 'Future / Upcoming Week',
      description: 'Planning & Advance Schedules',
      isCurrent: false,
      isPast: false,
      isUpcoming: true,
      actualWeek,
      dateRange
    }
  }
}
