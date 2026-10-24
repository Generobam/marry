export class InputError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export function text(value, label, max, min = 1) {
  if (typeof value !== 'string') throw new InputError(`${label}을 확인해 주세요.`);
  const clean = value.trim();
  if (clean.length < min || clean.length > max) throw new InputError(`${label}은 ${min}~${max}자로 입력해 주세요.`);
  return clean;
}
export function password(value) { return text(value, '비밀번호', 80, 8); }
export function id(value) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '')) throw new InputError('응답번호를 확인해 주세요.');
  return value;
}
function choice(value, options) {
  if (!options.includes(value)) throw new InputError('선택 항목을 확인해 주세요.');
  return value;
}
export function guestMessage(body) {
  return { name: text(body.name, '이름', 30), recipient: choice(body.recipient, ['couple', 'groom', 'bride']), message: text(body.message, '축하 메시지', 500) };
}
export function rsvp(body) {
  if (body.consent !== true) throw new InputError('참석 정보 전달에 동의해 주세요.');
  const attendance = choice(body.attendance, ['yes', 'no', 'maybe']);
  let guests = 0; let meals = 0;
  if (attendance === 'yes') {
    guests = Number(body.guests); meals = Number(body.meals);
    if (!Number.isInteger(guests) || guests < 1 || guests > 10 || !Number.isInteger(meals) || meals < 0 || meals > guests) throw new InputError('전체 참석 인원은 1~10명, 식사 인원은 참석 인원 이하로 입력해 주세요.');
  }
  return { name: text(body.name, '이름', 30), side: choice(body.side, ['groom', 'bride']), attendance, guests, meals, note: text(body.note || '', '메모', 300, 0) };
}
export function photoType(bytes) {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return ['image/jpeg', 'jpg'];
  if ([137,80,78,71,13,10,26,10].every((n,i) => bytes[i] === n)) return ['image/png', 'png'];
  const s = new TextDecoder().decode(bytes.slice(0,12));
  if (s.startsWith('RIFF') && s.slice(8) === 'WEBP') return ['image/webp', 'webp'];
  throw new InputError('JPG, PNG, WEBP 사진만 올릴 수 있어요.');
}
export function csvCell(value) {
  let cell = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(cell)) cell = `'${cell}`;
  return `"${cell.replaceAll('"','""')}"`;
}

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export function albumMediaType(bytes, declaredType) {
  const signature = new TextDecoder().decode(bytes.slice(4,8));
  if (declaredType === 'video/mp4' && signature === 'ftyp') return ['video/mp4', 'mp4', 'video'];
  if (declaredType === 'video/webm' && [26,69,223,163].every((value,index) => bytes[index] === value)) return ['video/webm', 'webm', 'video'];
  const [mime, extension] = photoType(bytes);
  return [mime, extension, 'image'];
}
