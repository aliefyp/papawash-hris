// A session still open after this long is treated as a forgotten clock-out: it is closed at clock-in + this limit
// and flagged "perlu_koreksi", and the next tap starts a new session instead of becoming a clock-out.
// Long enough for a full day (07:00 to 21:00 and a little late), shorter than the gap to a next-morning tap
// after a forgotten afternoon shift.
export const MAX_OPEN_HOURS = 16;
export const MAX_OPEN_MS = MAX_OPEN_HOURS * 3_600_000;
