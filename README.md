# Our Little Adventure — 모바일 청첩장

아이보리 편지와 오리지널 픽셀 SD 커플을 결합한 반응형 청첩장입니다.
예식은 **2027년 6월 12일 토요일 오전 11시 (Asia/Seoul)**로 설정되어 있습니다.

## 내용 수정

`wedding-config.js`에서 신랑·신부 이름, 날짜, 예식장, 홀, 주소, 지도 URL, 교통 안내를 수정하세요. 현재 신랑 노지성, 신부 이지연, 예식장 엘리에나 호텔 서울 강남으로 설정되어 있습니다. 홀과 층수는 확인 후 추가할 수 있습니다. 메인 사진은 사용자가 제공한 `assets/wedding-portrait.jpg`이며, 원본 비율로 표시합니다. 개인 연락처는 포함하지 않았습니다.

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

- 신랑·신부가 벽돌, 돌, 웅덩이, 화분이 등장하는 길을 계속 달립니다. 일부 장애물은 자동으로 넘고, 부딪히면 1.6초 동안 감속했다가 회복합니다.
- 달리는 화면을 터치하거나 해당 화면에 키보드 초점을 둔 상태에서 스페이스·엔터 키를 누르면 차례로 점프합니다.
- 위쪽 미니맵은 예식 1년 전부터 예식 시간까지 실제 시간의 흐름을 표시합니다. 충돌이나 일시정지는 디데이에 영향을 주지 않습니다. 실제 예식 시간이 되면 식장 도착 장면으로 바뀝니다.
- 일시정지 버튼을 제공하고, 화면 밖이나 비활성 탭에서는 루프를 멈춥니다.
- 동작 줄이기 설정이 켜진 기기에서는 정지 화면으로 시작하며, 사용자가 재생할 수 있습니다.
- 캐릭터와 배경은 직접 만든 픽셀 그래픽이며 외부 게임 자산을 사용하지 않습니다.

## 사진·영상 앨범

`assets/album/`에 파일을 추가하고 `album-config.js`의 배열에 아래처럼 항목을 추가한 뒤 배포하세요. 현재는 제공받은 사진 한 장이 등록되어 있습니다. 웹사이트에서 직접 업로드하는 기능은 없습니다.

```js
{ type: 'image', src: './assets/album/photo-02.jpg', alt: '사진 설명', caption: '함께한 날' },
{ type: 'video', src: './assets/album/film.mp4', poster: './assets/album/film-cover.jpg', caption: '우리의 영상' },
```

사진·영상을 누르면 크게 열립니다. 사진 확대, 이전·다음 버튼, 좌우 방향키, 모바일 좌우 스와이프를 지원합니다. 사진이 한 장일 때 이동 버튼은 비활성화됩니다. 영상은 자동 재생하지 않으며 이동하거나 닫으면 정지합니다. 모바일 호환성을 위해 MP4(H.264/AAC)를 권장하며 필요하면 `captions`에 한국어 WebVTT 자막 경로를 지정할 수 있습니다.

## 기타 기능

한국 시간 기준 카운트다운, 달력, ICS 일정 다운로드, 네이티브 공유 또는 링크 복사, 주소 복사 및 지도 링크를 제공합니다. 외부 요청은 Google Fonts 글꼴 로딩뿐이며, 실패해도 시스템 글꼴로 표시됩니다. 백엔드·방명록·계좌번호는 포함하지 않습니다.
