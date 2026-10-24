import { participation } from './participation-config.js';
export const configured = Boolean(participation.apiUrl);
export async function request(path, {method='GET',data,token,timeoutMs=45000} = {}) {
  if(!configured) throw new Error('아직 접수를 준비하고 있어요. 조금만 기다려 주세요.');
  const controller = new AbortController(); const timer = setTimeout(()=>controller.abort(),timeoutMs);
  const multipart = data instanceof FormData;
  try {
    const response = await fetch(`${participation.apiUrl.replace(/\/$/,'')}${path}`,{method,headers:{...(!multipart && data ? {'Content-Type':'application/json'} : {}),...(token ? {Authorization:`Bearer ${token}`} : {})},body:multipart ? data : data ? JSON.stringify(data) : undefined,signal:controller.signal});
    const body = await response.json().catch(()=>({}));
    if(!response.ok) {const error=new Error(body.error || '전송하지 못했어요. 잠시 후 다시 시도해 주세요.');error.status=response.status;throw error;}
    return body;
  } catch(error) {
    if(error.name==='AbortError') throw new Error('응답이 지연되고 있어요. 방명록은 새로 확인하고, 참석 응답은 응답번호로 수정해 주세요.');
    if(error instanceof TypeError) throw new Error('연결을 확인한 뒤 다시 시도해 주세요.');
    throw error;
  } finally {clearTimeout(timer);}
}
export async function copyValue(value, success) {
  try {await navigator.clipboard.writeText(value);return success;}
  catch {const input=document.createElement('textarea');input.value=value;input.setAttribute('aria-label','복사할 내용');input.style.position='fixed';input.style.top='0';document.body.append(input);input.select();const copied=document.execCommand('copy');input.remove();if(!copied)throw new Error('자동 복사가 안 돼요. 표시된 번호를 직접 복사해 주세요.');return success;}
}
