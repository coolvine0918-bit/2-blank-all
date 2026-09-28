# 📚 중1 사회 교과 빈칸 채우기 평가 시스템 (EduSocial AI)

> **비상교육 중학교 사회 ①** 교과서 PDF 분석을 기반으로, 4대 대단원 및 12개 소단원 전 범위에 걸쳐 총 180개의 고품질 문맥 이해형 빈칸 채우기 문제를 제공하고 실시간 자동 채점 및 교과서 문맥 피드백을 제공하는 맞춤형 웹 애플리케이션입니다.

---

## 🌟 주요 특징

1. **완벽한 교과서 계층 구조 매핑 (총 12개 소단원 × 15문항 = 180문항 풀 세트 내장)**
   - **Ⅸ. 정치 생활과 민주주의**: 01 정치와 정치 생활, 02 민주주의의 발전과 기본 이념, 03 민주 정치의 정부 형태
   - **Ⅹ. 정치 과정과 시민 참여**: 01 선거와 민주 정치, 02 정치 주체의 역할과 정치 과정, 03 지방 자치와 시민 참여
   - **Ⅺ. 일상생활과 법**: 01 법의 의미와 목적, 02 법의 종류와 사회법, 03 재판의 의미와 공정한 재판
   - **Ⅻ. 인권과 기본권**: 01 인권 보장과 기본권, 02 기본권 제한과 기본권 침해 시 구제, 03 근로자의 권리와 노동권 보장
2. **교사용 학습지기 (Teacher Dashboard)**
   - 대단원-소단원 아코디언 트리 UI 클릭 시 즉시 15문항 학습지 로드
   - 정답 및 교과서 맞춤 해설 미리보기 토글
   - 인쇄용 스타일(Print CSS) 적용: A4 시험지 및 학습지 원클릭 깔끔 출력
   - 문제 텍스트 원클릭 클립보드 복사
3. **학생용 퀴즈 풀이 및 즉시 피드백 (Student View)**
   - 깔끔한 인라인 입력 폼 기반 빈칸 문제 풀이
   - 제출 즉시 자동 채점 (띄어쓰기 및 유사 정답 유연 매칭)
   - 오답 발생 시 교과서 문맥에 기반한 **"왜 이 개념이 정답인지" 설명하는 맞춤형 모달(Modal)** 제공
4. **Google Apps Script Webhook 연동**
   - 학생이 제출하면 별도 백엔드 서버 없이 Google 스프레드시트로 학번, 이름, 득점, 오답 문항이 실시간 누적 기록
   - 프론트엔드 설정창에서 Webhook URL 간편 등록 지원
5. **듀얼 배포 환경 지원**
   - **로컬 실행**: 별도의 Node.js 설치 없이 `index.html` 파일을 브라우저로 더블 클릭하여 즉시 구동 가능
   - **Vercel / GitHub 배포**: Next.js 14 App Router + Tailwind CSS 기반 프로젝트 구조

---

## 🚀 실행 및 배포 방법

### 1. 로컬에서 즉시 실행하기 (Node.js 미설치 환경)
- 프로젝트 폴더의 `index.html`을 Chrome, Edge, Safari 등 웹 브라우저에서 **더블 클릭**하면 즉시 모든 기능을 체험할 수 있습니다.

### 2. GitHub & Vercel 원클릭 배포하기
1. GitHub에서 새 Repository를 생성합니다.
2. 현재 폴더의 모든 소스 코드를 커밋 및 푸시합니다:
   ```bash
   git init
   git add .
   git commit -m "feat: middle school social studies quiz system"
   git branch -M main
   git remote add origin https://github.com/{YOUR_ID}/{REPO_NAME}.git
   git push -u origin main
   ```
3. [Vercel](https://vercel.com)에 로그인 후, 해당 GitHub 리포지토리를 **Import**합니다.
4. Framework Preset으로 `Next.js`가 자동 감지되므로 **[Deploy]** 버튼을 누르면 즉시 글로벌 웹 서비스로 배포됩니다.

---

## 📊 Google 스프레드시트 Webhook 연동 가이드

1. **Google 드라이브**에서 새 Google 스프레드시트를 만듭니다. (예: `중1 사회 평가 응답 결과`)
2. 상단 메뉴에서 **[확장 프로그램] > [Apps Script]**를 클릭합니다.
3. 본 프로젝트의 `google-apps-script/Code.gs` 파일 내용을 복사하여 붙여넣고 저장(Ctrl+S)합니다.
4. 우측 상단 **[배포] > [새 배포]**를 선택합니다.
   - **종류 선택**: `웹 앱`
   - **다음 사용자로 실행**: `나(내 계정)`
   - **액세스 권한이 있는 사용자**: **`모든 사용자(Anyone)`** *(중요)*
5. 생성된 **웹 앱 URL** (`https://script.google.com/macros/s/.../exec`)을 복사합니다.
6. 웹 애플리케이션 우측 상단의 **설정 아이콘(⚙️)**을 누르고 해당 URL을 붙여넣은 뒤 **[설정 저장]**을 누릅니다.
7. 이제 학생들이 답안을 제출할 때마다 구글 스프레드시트에 새 행으로 학생 정보와 채점 결과가 실시간 자동 기록됩니다!

---

## 📁 디렉터리 구조

```
blank/
├── index.html                     # 로컬 즉시 실행 가능한 고품질 스탠드얼론 웹앱
├── package.json                   # Next.js 프로젝트 의존성 설정
├── tsconfig.json                  # TypeScript 설정
├── tailwind.config.js             # Tailwind CSS 설정
├── postcss.config.js              # PostCSS 플러그인 설정
├── next.config.js                 # Next.js 런타임 설정
├── README.md                      # 프로젝트 문서 및 사용 설명서
├── google-apps-script/
│   └── Code.gs                    # 구글 시트 연동용 Apps Script 핸들러
└── src/
    ├── app/
    │   ├── layout.tsx             # 루트 레이아웃
    │   ├── globals.css            # 글로벌 스타일 및 인쇄용 Print CSS
    │   └── page.tsx               # 교사용/학생용 일체형 반응형 대시보드 컴포넌트
    ├── data/
    │   └── curriculumData.ts      # 12개 소단원 180문항 풀 데이터셋
    └── utils/
        ├── geminiPrompt.ts        # LLM 문제 생성 프롬프트 및 API 연동 유틸리티
        └── webhook.ts             # Google Apps Script Webhook 통신 로직
```
