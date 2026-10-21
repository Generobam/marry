export function countdownTo(target, now = Date.now()) {
  const remaining = Math.max(0, new Date(target).getTime() - now);
  const total = Math.floor(remaining / 1000);
  return { days: Math.floor(total / 86400), hours: Math.floor(total / 3600) % 24, minutes: Math.floor(total / 60) % 60, seconds: total % 60, arrived: remaining === 0 };
}

export function koreaDateParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(date));
  return Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
}

export function weddingJourney(target, now = Date.now()) {
  const end = new Date(target).getTime();
  const start = new Date(end);
  start.setUTCFullYear(start.getUTCFullYear() - 1);
  const ratio = Math.max(0, Math.min(1, (now - start.getTime()) / (end - start.getTime())));
  const localDay = value => {
    const { year, month, day } = koreaDateParts(value);
    return Date.UTC(year, month - 1, day);
  };
  const days = Math.max(0, Math.round((localDay(end) - localDay(now)) / 86400000));
  return { ratio, days, arrived: now >= end, start: start.getTime() };
}

export function calendarCells(year, month) {
  const offset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= length; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function escapeICS(value) {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

export function createCalendarEvent(config, now = new Date()) {
  const stamp = date => new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const start = new Date(config.date);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const title = `${config.groom || '신랑'} ♥ ${config.bride || '신부'} 결혼식`;
  const location = [config.venue, config.hall, config.address].filter(Boolean).join(' ');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Our Little Adventure//Wedding//KO', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:wedding-${start.getTime()}@our-little-adventure`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${escapeICS(title)}`, `LOCATION:${escapeICS(location)}`, 'DESCRIPTION:함께하는 첫 번째 모험에 초대합니다.', 'END:VEVENT', 'END:VCALENDAR'];
  // RFC 5545: fold at 75 UTF-8 octets, never in the middle of a Korean character.
  return lines.map(line => {
    let folded = ''; let bytes = 0;
    for (const char of line) {
      const size = new TextEncoder().encode(char).length;
      if (bytes + size > 75) { folded += '\r\n '; bytes = 1; }
      folded += char; bytes += size;
    }
    return folded;
  }).join('\r\n') + '\r\n';
}
