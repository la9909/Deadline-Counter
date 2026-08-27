# Vercel CLI 배포 및 Gemini AI 연동 가이드

Vercel 계정과 CLI를 연결하여 본 과제 마감 카운터 서비스를 1분 만에 클라우드에 배포하고 인공지능 기능을 활성화하는 방법입니다.

---

## 1단계: Vercel 계정 로그인 (CLI 인증)

터미널(또는 CMD/PowerShell)에서 아래 명령어를 실행하여 기존에 가입된 Vercel 계정으로 로그인합니다:

```bash
npx vercel login
```

- 화면에 `GitHub`, `GitLab`, `Bitbucket`, `Email` 선택지가 나타납니다.
- 가입하신 방식을 선택하시면 브라우저가 열리며 원클릭으로 인증이 완료됩니다.

---

## 2단계: 프로젝트 연결 및 첫 배포

로그인이 완료되면 아래 명령어로 프로젝트를 Vercel에 연결 및 빌드 배포합니다:

```bash
npx vercel
```

- **Set up and deploy?** -> `Y` 입력 (Enter)
- **Which scope do you want to deploy to?** -> 본인 계정 선택 (Enter)
- **Link to existing project?** -> `N` 입력 (새 프로젝트 생성)
- **What’s your project’s name?** -> `deadline-counter` (또는 원하는 이름 입력 후 Enter)
- **In which directory is your code located?** -> `./` (Enter)
- **Want to modify these settings?** -> `N` (Next.js 자동 인식)

👉 몇 초 뒤 임시 프리뷰 배포 URL이 생성됩니다.

---

## 3단계: Gemini AI 환경 변수(`GEMINI_API_KEY`) 등록 (중요 🔑)

배포된 서비스에서 AI 기능(자연어 파싱, AI 학습 코치 가이드)이 동작하려면 Vercel 클라우드에 API 키를 등록해야 합니다.

### 방법 A) CLI로 간편 등록 (추천)
```bash
npx vercel env add GEMINI_API_KEY
```
1. 프롬프트에 실제 Gemini API Key 값을 붙여넣기합니다.
2. 적용할 환경 선택: `Production`, `Preview`, `Development` 모두 선택 (스페이스바로 체크 후 Enter).

### 방법 B) Vercel 대시보드 웹에서 등록
1. [Vercel Dashboard](https://vercel.com/dashboard)에 접속.
2. 생성된 `deadline-counter` 프로젝트 클릭 -> **Settings** -> **Environment Variables** 탭 이동.
3. Key에 `GEMINI_API_KEY`, Value에 API Key를 넣고 **Save**.

---

## 4단계: 프로덕션(운영) 최종 배포

환경 변수 등록 후, 프로덕션 도메인으로 최종 배포를 완료합니다:

```bash
npx vercel --prod
```

배포가 완료되면 `https://deadline-counter-xxx.vercel.app` 과 같은 고유 URL이 생성되며, 전 세계 어디서나 접속하여 Gemini AI 과제 카운터를 사용할 수 있습니다!
