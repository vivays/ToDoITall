# 합격 시상대 (Admission Podium)

수험생이 목표 대학을 3~5개 등록하고, 공부 완료 항목을 점수화해 대학 시상대/랭킹으로 보여주는 정적 웹앱입니다.

## 포함 기능
- 목표 대학 3~5개 최초 입력
- 목표 대학 잠금
- 관리자 PIN 모드로만 대학 수정 가능
- 공부 항목 추가 / 수정 / 완료 / 삭제
- 중요도별 점수 반영
- 목표 대학 랭킹 / 시상대 갱신
- 오늘 통계 / 주간 통계 / 최근 성취 로그
- localStorage 저장
- 반응형 UI

## 관리자 PIN
기본 PIN: `1234`

## 실행 방법
정적 웹앱이라 별도 빌드 없이 바로 열 수 있습니다.

### 로컬에서 보기
- `index.html`을 브라우저에서 직접 열기
- 또는 간단한 정적 서버로 실행

예시:
```bash
python -m http.server 8000
```

## Vercel 배포
이 프로젝트는 정적 파일 구조라 Vercel에 바로 배포할 수 있습니다.

### 가장 쉬운 방법
1. GitHub 저장소에 업로드
2. Vercel에서 저장소 연결
3. Deploy

### CLI 배포
```bash
npm i -g vercel
vercel
```

## 파일 구성
- `index.html`
- `styles.css`
- `app.js`
- `README.md`
