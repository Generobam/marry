# 실제 저장 서비스 연결

프런트엔드는 기존 GitHub Pages를 유지합니다. 방명록·참석 응답·비공개 하객 사진은 Supabase 프로젝트의 데이터베이스, Storage, Edge Function에 저장합니다.

## 현재 배포

- 2026-10-24: `Jiseong & Jiyeon Wedding` 무료 조직의 `marry` 프로젝트, 서울 리전.
- 프로젝트: `nzzgpsznazmarrzjhslr`, 함수: `wedding-api`.
- 초기 SQL은 대시보드 SQL Editor에서 적용했습니다. 기존 프로젝트에 초기 SQL을 다시 실행하지 마세요. CLI로 전환할 경우 원격 스키마와 마이그레이션 이력을 먼저 정합화해야 합니다.
- `wedding-guest-photos`는 비공개이며 최대 8MB입니다. 애플리케이션 테이블 4개 모두 RLS 적용 및 anon/authenticated 직접 접근 차단을 확인했습니다.
- `WEDDING_RATE_SALT`, `WEDDING_ADMIN_IDS`는 서버 Secrets에만 저장합니다. 관리자 계정은 사용자가 직접 생성했으며 공개 회원가입은 비활성화했습니다.
- 하객 접수를 위해 함수의 레거시 JWT 검증은 사용자 승인 후 껐습니다. 관리자 경로는 함수 내부에서 Auth 사용자와 UUID 허용 목록을 모두 확인합니다.
- 공개 URL과 publishable 키만 `participation-config.js`에 설정했습니다. 관리자 로그인: https://generobam.github.io/marry/admin.html

## 새 프로젝트 연결 순서

1. Supabase 계정을 만들고 본인 소유의 새 프로젝트를 생성합니다. 프로젝트 비용/플랜은 계정에서 확인하여 선택하세요.
2. `supabase/migrations/202610240001_participation.sql`을 프로젝트에 적용합니다. CLI를 쓰는 경우 프로젝트 연결 후 `supabase db push`를 실행합니다. SQL Editor에서 한 번 실행해도 됩니다. 기존 테이블이 없는 새 프로젝트용입니다.
3. Supabase Authentication에 두 사람의 관리자 사용자를 생성합니다. 비밀번호는 본인만 관리하세요. **공개 회원가입은 끕니다.** 사용자 UUID를 `WEDDING_ADMIN_IDS`에 쉼표로 나열합니다. 이메일 주소가 아닌 UUID입니다.
4. Edge Function secret을 설정합니다.
   - `WEDDING_ADMIN_IDS`: 허용할 관리자 사용자 UUID
   - `WEDDING_ORIGINS`: `https://generobam.github.io` (origin이므로 `/marry/` 경로는 제외)
   - `WEDDING_RATE_SALT`: 무작위 비밀 문자열 (최소 32바이트 권장)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: Supabase가 함수에 제공하는 서버 전용 값
5. `supabase functions deploy wedding-api`로 함수를 배포합니다. `supabase/config.toml`의 `verify_jwt=false`는 하객이 로그인 없이 작성할 수 있게 하는 설정입니다. 관리자 경로에서는 함수가 Supabase Auth 토큰을 검증하고 UUID 허용 목록까지 검사합니다.
6. `participation-config.js`에 공개 설정만 넣습니다.

```js
export const participation = {
  apiUrl: 'https://PROJECT.supabase.co/functions/v1/wedding-api',
  supabaseUrl: 'https://PROJECT.supabase.co',
  publishableKey: '프로젝트의 publishable 또는 anon 키',
};
```

**service_role/secret 키, 관리자 비밀번호는 프런트엔드나 Git에 넣지 마세요.** 입력할 키가 공개 publishable/anon 키인지 대시보드에서 확인하세요.

7. `npm test && npm run build` 확인 후 main에 push합니다. `/admin.html`에서 로그인하여 실제 방명록 작성·삭제, 참석 응답 수정, 사진 업로드·관리자 열람을 확인합니다. 테스트 기록은 관리자 화면에서 삭제하세요.

## 데이터 접근

- 모든 애플리케이션 테이블은 RLS를 켜고 anon/authenticated의 직접 접근 권한을 제거했습니다. Edge Function만 service role로 접근합니다.
- 공개 조회는 `visible` 방명록의 이름·받는 사람·메시지·작성 시각만 반환합니다. 비밀번호 해시는 반환하지 않습니다.
- 참석 응답은 공개 조회 API가 없습니다. 수정은 응답번호+비밀번호가 필요합니다. 비밀번호는 PBKDF2-SHA256 100,000회와 개별 salt로 해시합니다.
- 사진 버킷은 비공개입니다. 파일 크기, 파일 시그니처, MIME을 확인하고 서버에서 UUID 파일명을 생성합니다. 관리자에게만 5분짜리 서명 URL을 발급합니다. 원본 사진을 보관하므로 촬영 정보가 파일에 포함될 수 있습니다.
- API에서 시간당 IP 기준 30회/전체 500회 쓰기 요청 제한, 숨은 봇 입력 필드, 요청 크기 제한을 적용합니다. IP는 salt를 넣은 해시로만 저장하며 한 시간 뒤 정리합니다. 호스팅 환경이 `x-forwarded-for`를 신뢰할 수 있게 설정하는지 배포 후 확인하세요. 높은 수준의 자동화 공격 대응이 필요하면 CAPTCHA를 추가하세요.
- 계좌·전화 예시는 `wedding-config.js`에서 관리합니다. 예시 전화 버튼은 비활성화되며, 예시 계좌 복사 시 실제 송금 금지 안내가 나옵니다.

## 운영

관리자 계정은 두 사람만 사용하고, 예식 후 참석 명단·사진을 내려받아 필요 없는 기록을 관리자 화면에서 삭제하세요. 관리자 화면의 사진 링크가 만료되면 새로고침하면 됩니다. 백엔드 장애 시 입력 내용은 그대로 남고 오류가 표시됩니다. 전송 응답이 끊긴 경우에는 중복 등록 전에 방명록을 다시 확인하세요. 참석 응답은 발급받은 응답번호로 수정하면 기존 기록을 갱신합니다.

## 검증 범위

Node 테스트는 실제 Edge handler에 데이터베이스/Storage/Auth 테스트 대역을 연결해 공개/비공개 경계, 비밀번호 삭제, 응답 수정, 업로드 형식, 관리자 권한, 제한 및 페이지 처리를 확인합니다. 이 검사는 실제 Supabase 프로젝트의 배포 확인을 대신하지 않습니다.

2026-10-24 실제 서버에서 방명록 생성·조회·삭제(틀린 비밀번호 거부 포함), 참석 응답 생성·동일 응답 수정, PNG 업로드 및 공개 URL 접근 차단을 확인했습니다. 익명 테이블 직접 조회와 관리자 API 접근은 거부됐고, 청첩장 origin 허용/외부 origin 거부도 확인했습니다.
