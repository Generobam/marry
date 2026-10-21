# Our Little Adventure — 모바일 청첩장

아이보리 편지와 오리지널 픽셀 SD 커플을 결합한 반응형 청첩장입니다.
예식은 **2027년 6월 12일 토요일 오전 11시 (Asia/Seoul)**로 설정되어 있습니다.

## 내용 수정

`wedding-config.js`에서 신랑·신부 이름, 날짜, 예식장, 홀, 주소, 지도 URL, 교통 안내를 수정하세요. 현재 신랑 노지성, 신부 이지연, 예식장 엘리에나 호텔 서울 강남으로 설정되어 있습니다. 홀과 층수는 확인 후 추가할 수 있습니다. 사진이나 개인 연락처는 포함하지 않았습니다.

예식장 주소: 서울특별시 강남구 논현로 645. 주소 확인 출처: [강남구 관광안내 책자](https://visitgangnam.net/images/guidebooks/gangnam-guide-2025.pdf).

- 날짜를 바꾸면 달력·디데이·일정 저장이 함께 갱신됩니다.
- 링크 미리보기는 JavaScript를 실행하지 않는 서비스가 많으므로 `index.html`의 title, description, Open Graph 문구와 기본 날짜도 함께 수정하세요.
- 디자인 색상과 글꼴은 `tokens.css`에 모았습니다.
- 이름·주소 등 소스 내용은 공개 GitHub 저장소 및 Pages에서 누구나 볼 수 있습니다.

## 로컬 실행

```sh
npm run dev
```

http://127.0.0.1:4173 에서 확인합니다. Node.js 22와 Python 3가 있으면 되며 npm 설치 과정은 필요 없습니다.

```sh
npm test
npm run build
```

빌드 결과는 `dist/`입니다. 상대 경로를 사용하여 GitHub Pages 저장소 하위 경로에서도 동작합니다.

## GitHub Pages

GitHub 저장소 Settings → Pages → Source를 **GitHub Actions**로 설정합니다. `main` 브랜치에 push하면 `.github/workflows/pages.yml`이 테스트와 빌드를 거쳐 배포합니다. 사이트 파일만 배포하며 테스트 및 개발 파일은 배포하지 않습니다.

공식 안내: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## 애니메이션

- 신랑·신부가 돌, 웅덩이, 화분을 자동으로 뛰어넘고 식장에 도착합니다.
- 화면 터치, 점프 버튼 또는 게임이 보이는 동안 스페이스 키로 함께 점프합니다.
- 약 29초 동안 달린 뒤 5초간 도착을 축하하고 다시 시작합니다.
- 일시정지 버튼을 제공하고, 화면 밖이나 비활성 탭에서는 루프를 멈춥니다.
- 동작 줄이기 설정이 켜진 기기에서는 정지 화면으로 시작하며, 사용자가 재생할 수 있습니다.
- 캐릭터와 배경은 직접 만든 픽셀 그래픽이며 외부 게임 자산을 사용하지 않습니다.

## 기타 기능

한국 시간 기준 카운트다운, 달력, ICS 일정 다운로드, 네이티브 공유 또는 링크 복사, 주소 복사 및 지도 링크를 제공합니다. 외부 요청은 Google Fonts 글꼴 로딩뿐이며, 실패해도 시스템 글꼴로 표시됩니다. 백엔드·방명록·계좌번호는 포함하지 않습니다.
