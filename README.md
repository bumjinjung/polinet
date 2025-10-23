# Polinet - 전문 화학 소재 에이전트 웹사이트

순수 HTML, CSS, JavaScript로 만든 전문적인 웹사이트입니다.

## 🚀 빠른 시작

### 방법 1: 파일 직접 열기 (가장 간단!)

1. `index.html` 파일을 더블클릭
2. 또는 브라우저에서 `index.html` 드래그 앤 드롭
3. 끝! 🎉

### 방법 2: 로컬 서버 실행 (권장)

더 나은 성능을 위해 로컬 서버 사용을 권장합니다:

#### Python 사용:
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

그 다음 브라우저에서 `http://localhost:8000` 접속

#### Node.js 사용:
```bash
# http-server 설치 (처음 한 번만)
npm install -g http-server

# 서버 실행
http-server
```

#### PHP 사용:
```bash
php -S localhost:8000
```

## 📁 파일 구조

```
polinet/
├── index.html          # 메인 HTML 파일
├── styles.css          # 모든 스타일
├── script.js           # 모든 JavaScript 기능
├── README.md           # 이 파일
├── Dockerfile          # Docker 배포용
└── docker-compose.yml  # Docker Compose 설정
```

## ✨ 주요 기능

### 🎯 완전한 기능
- ✅ **반응형 디자인**: 모바일, 태블릿, 데스크톱 완벽 지원
- ✅ **부드러운 스크롤**: 네비게이션 클릭 시 부드러운 이동
- ✅ **제품 필터링**: POM, PBT, PPS, LCP, COC, PEK 카테고리별 필터링
- ✅ **제품 Grade 표시**: 각 제품별 주요 Grade 3개씩 표시
- ✅ **스크롤 애니메이션**: 섹션별 페이드 인 효과
- ✅ **모바일 메뉴**: 햄버거 메뉴로 모바일 네비게이션
- ✅ **스크롤 프로그레스 바**: 상단 진행 표시줄
- ✅ **간소화된 연락처**: 이메일 링크와 연락처 정보

### 🎨 섹션 구성
1. **Hero**: 메인 비주얼 및 소개
2. **About**: 회사 소개 및 가치
3. **Business Areas**: 4가지 사업 분야
4. **Products**: 6개 제품군 (POM, PBT, PPS, LCP, COC, PEK) - 각 Grade 표시
5. **Contact**: 연락처 정보 (전화, 이메일, 주소)
6. **Footer**: 푸터 정보

## 🎨 커스터마이징

### 색상 변경
`styles.css` 파일 상단의 CSS 변수를 수정하세요:

```css
:root {
    --primary-600: #0054cc;  /* 메인 색상 */
    --secondary-600: #0284c7; /* 보조 색상 */
    /* ... */
}
```

### 제품 추가/수정
`script.js` 파일의 `products` 배열을 수정하세요:

```javascript
const products = [
    {
        category: 'pom',
        name: 'POM (Polyacetal)',
        brand: 'DURACON®',
        description: '제품 설명',
        grades: ['Grade1', 'Grade2', 'Grade3'],
        emoji: '🔷'
    },
    // 더 추가...
];
```

### 연락처 정보 변경
`index.html` 파일에서 다음 섹션들을 수정하세요:
- Footer 섹션의 연락처
- Contact 섹션의 정보

## 🐳 Docker 배포

### Nginx로 배포

```bash
# Docker 이미지 빌드
docker-compose up -d

# 또는 직접 빌드
docker build -t polinet:latest .
docker run -d -p 80:80 polinet:latest
```

## 📱 브라우저 지원

- ✅ Chrome (권장)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ 모바일 브라우저 모두 지원

## 🔧 문제 해결

### 스타일이 적용되지 않아요
- `index.html`, `styles.css`, `script.js`가 같은 폴더에 있는지 확인
- 브라우저 캐시 삭제 후 새로고침 (`Ctrl + Shift + R`)

### 애니메이션이 작동하지 않아요
- JavaScript가 활성화되어 있는지 확인
- 브라우저 콘솔(F12)에서 에러 확인

### 모바일에서 메뉴가 안 열려요
- JavaScript 에러 확인
- 최신 브라우저 사용

## 📝 라이센스

© 2025 Polinet. All rights reserved.

## 📞 문의

- 이메일: info@polinet.co.kr
- 전화: 02-XXXX-XXXX
- 웹사이트: https://polinet.co.kr

---

## 🚀 추가 개선 사항 (선택)

### 백엔드 연동
문의 폼을 실제로 작동시키려면:
1. PHP 메일 서버
2. Node.js Express 서버
3. 또는 FormSpree, Netlify Forms 같은 서비스 사용

### SEO 최적화
- Open Graph 메타 태그 추가
- 구조화된 데이터 (Schema.org) 추가
- sitemap.xml 생성

### 성능 최적화
- 이미지 최적화 (WebP 포맷)
- CSS/JS 압축 (minify)
- CDN 사용

---

**즐거운 코딩 되세요! 🎉**
