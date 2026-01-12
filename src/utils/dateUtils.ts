// Utility functions for PST (Pakistan Standard Time) date handling

/**
 * Get current date/time in PKT (Pakistan Time = UTC+5)
 */
export const getPSTDate = () => {
  const now = new Date();
  // Get UTC time
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  // Convert to PKT (UTC+5)
  const pktTime = utcTime + (5 * 60 * 60 * 1000); // Add 5 hours
  const pkt = new Date(pktTime);
  return pkt;
};

/**
 * Get current PST date as ISO string (YYYY-MM-DD format)
 * This represents "today" in PST timezone
 */
export const getPSTDateString = (): string => {
  const pst = getPSTDate();
  const year = pst.getFullYear();
  const month = String(pst.getMonth() + 1).padStart(2, '0');
  const day = String(pst.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get PST date at midnight (00:00:00) for a given date
 * Useful for date comparisons and creating date ranges
 */
export const getPSTDateAtMidnight = (date?: Date): Date => {
  const pst = date ? getPSTDateFromDate(date) : getPSTDate();
  pst.setHours(0, 0, 0, 0);
  return pst;
};

/**
 * Convert a Date object to PST
 */
export const getPSTDateFromDate = (date: Date): Date => {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const pst = new Date(utc + (5 * 3600000)); // UTC+5
  return pst;
};

/**
 * Get current week dates in PKT (Pakistan Time, Monday to Sunday)
 */
export const getCurrentWeekDates = () => {
  // Get current time and convert to PKT
  const now = new Date();
  // Get true UTC timestamp (milliseconds since epoch)
  const utcTimestamp = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
    now.getUTCMilliseconds()
  );
  // Add 5 hours for PKT (UTC+5)
  const pktTimestamp = utcTimestamp + (5 * 60 * 60 * 1000);
  const pktNow = new Date(pktTimestamp);
  
  // Get day of week in PKT (0 = Sunday, 1 = Monday, etc.)
  // Since we've adjusted the timestamp, use UTC methods to get PKT day
  const dayOfWeek = pktNow.getUTCDay();
  
  // Calculate Monday of current week in PKT (00:00:00 PKT)
  let mondayPKTTimestamp = pktTimestamp;
  // Set to midnight of current day in PKT
  const pktMidnight = new Date(pktTimestamp);
  pktMidnight.setUTCHours(0, 0, 0, 0);
  mondayPKTTimestamp = pktMidnight.getTime();
  
  // Go back to Monday
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  mondayPKTTimestamp = mondayPKTTimestamp - (daysToMonday * 24 * 60 * 60 * 1000);
  
  const weekDates = [];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  for (let i = 0; i < 7; i++) {
    // Create date for this day (add i days to Monday in PKT)
    const dayPKTTimestamp = mondayPKTTimestamp + (i * 24 * 60 * 60 * 1000);
    const dayPKT = new Date(dayPKTTimestamp);
    
    // Extract PKT date components using UTC methods (since timestamp is adjusted)
    const year = dayPKT.getUTCFullYear();
    const month = dayPKT.getUTCMonth();
    const day = dayPKT.getUTCDate();
    
    const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateStr = `${monthNames[month]} ${day}`;
    
    weekDates.push({
      date: dayPKT,
      dateStr: dateStr,
      dayName: dayNames[i],
      dayLabel: `${dayNames[i]} ${dateStr}`, // e.g., "Tue Dec 2"
      isoDate: isoDate, // YYYY-MM-DD format in PKT
      dayIndex: i
    });
  }
  
  return weekDates;
};
