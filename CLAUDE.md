# Polinet 웹사이트

Polinet(Daicel 그룹 엔지니어링 플라스틱 공급사)의 회사 소개 사이트. 빌드 단계 없는 정적 HTML/CSS/JS이고, 실제 사이트 파일은 모두 `site/` 아래에 있다. 운영 주소는 https://www.polinet.co.kr/ 이다.

## 소통

- 사용자에게는 항상 한국어로 답한다. 요약, 질문, 버튼 라벨도 한국어로 쓴다.
- 사이트 문구도 한국어다. 브랜드명(DURAFIDE®, DURACON®, LAPEROS®, DURANEX®, TOPAS®)과 수지 약어(PPS, POM, LCP, PBT, COC)는 원문 그대로 쓰고 `translate="no"`를 붙인다.

## 구조

- `site/index.html`: 한 페이지 사이트. 화면 순서는 hero → about → business → products → story → applications → contact이고, 내비게이션 메뉴(hero와 story는 빠짐)도 같은 순서를 따른다. 화면 순서를 바꾸면 메뉴 순서와 화면 배경 교차(인접한 화면끼리 색이 겹치지 않게)도 함께 맞춘다.
- `site/styles.css`: 메인 페이지 스타일. 디자인 토큰은 맨 위 `:root`에 있다(`--resin`, `--graphite`, `--red` 등). 글꼴은 Gothic A1(한글)과 Archivo(라틴)를 Google Fonts에서 불러온다.
- `site/script.js`: 메뉴, 탭 키보드 조작, products와 applications 탭, 화면 스냅, 현재 화면 표시. `// ---------- 이름 ----------` 구분선으로 기능별로 나뉜다.
- `site/molding-lab/`: products 다음에 나오는 스크롤 스토리(펠릿 → 사출 → 버스바 → 전기차). 캔버스 하나에 그린다. `molding.js`는 메인 페이지에 `#story`로 임베드되고(`story-embed.css`), `molding-lab/index.html`은 noindex인 단독 테스트 페이지다. 이미지는 `molding-lab/assets/`에서 섹션이 가까워질 때만 불러온다.
- `site/privacy.html`(개인정보처리방침), `site/terms.html`(법적 고지): `styles.css`를 같이 쓴다.
- `site/images/`: 사진은 `.webp`. 아이콘, OG 이미지, 로고도 여기 있다.
- `site/tailwind.config.js`는 쓰이지 않는다(Tailwind를 불러오는 곳이 없음). Tailwind 클래스를 쓰지 않는다.
- `README.md`는 2025년 10월 초기 상태를 설명하고 있어서 현재 구조와 맞지 않는다. 구조는 이 파일과 코드를 기준으로 본다.

## 캐시 무효화 (꼭 지킬 것)

CSS, JS, 아이콘, 공유 이미지는 `?v=` 쿼리로 버전을 붙여 불러온다. nginx 설정이 정적 파일을 1년 동안 캐시하므로 파일을 고치면 그 파일을 참조하는 모든 곳의 `?v=`를 올린다.

- `styles.css`: `index.html`, `privacy.html`, `terms.html` 세 곳에서 참조한다. 값 형식은 `?v=YYYYMMDD` 뒤에 a, b…
- `script.js`: `index.html`. 형식은 같다.
- `molding-lab/molding.js`, `molding.css`, `story-embed.css`: 정수 버전(`?v=5`). `molding.js`는 `index.html`과 `molding-lab/index.html` 두 곳에서 참조한다.
- 파비콘과 아이콘(`?v=5`): `index.html`, `privacy.html`, `terms.html` 세 곳. OG 이미지와 schema 로고(`?v=2`): `index.html`. 바꾸면 버전을 올린다.
- 버전을 올린 뒤 `grep -rn "파일명?v=" site/`로 참조하는 곳이 모두 같은 값인지 확인한다.

## 배포

- `main`에 push하면 `.github/workflows/deploy.yml`이 FTP로 Synology NAS의 `/web/polinet/`에 바로 올린다. 스테이징은 없다. `main`에 push하는 것이 곧 운영 배포다.
- 저장소 루트 전체가 올라간다(`.git`, `.github`, `README.md` 등만 제외). 그래서 `site/` 폴더째로 올라간다.
- 작업은 브랜치에서 하고, push와 merge는 사용자가 요청할 때만 한다.

## 로컬 확인

빌드는 없다. `site/`를 루트로 정적 서버를 띄워 확인한다.

```
python -m http.server 8000 --directory site
```

변경은 데스크톱과 모바일 양쪽에서 확인한다. 반응형 기준점은 `48rem`(768px, 휴대폰)과 `64rem`(1024px, 데스크톱)이다. 데스크톱에서 창 높이가 낮을 때의 기준(`max-height: 820px`, `680px`)도 있다. `prefers-reduced-motion`도 지킨다.

## 접근성 규칙

- 탭은 `role="tab"`, `aria-selected`, `aria-controls`, 선택되지 않은 탭에 `tabindex="-1"`, 화살표와 Home/End 키로 이동한다. 새 탭 목록도 같은 패턴을 따른다.
- 장식용 이미지는 `alt=""`, 장식 요소는 `aria-hidden="true"`.

## 커밋 메시지

- 영어로 쓴다. 제목은 무엇이 바뀌는지 평이하게 한 문장으로 쓴다(예: "Move the products screen up, right after the business screen"). 접두사(feat:, fix:)는 붙이지 않는다.
- 본문에는 왜 바꿨는지와 사용자가 보게 될 변화를 쓴다. 캐시 버전을 올렸으면 그 사실도 적는다.
