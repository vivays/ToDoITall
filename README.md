# 평행우주 투두 (Parallel Universe Todo)

하루를 하나의 계획으로만 보지 않고, 컨디션에 따라 **Plan A / Plan B / Plan C** 세 가지 버전으로 준비하는 할 일 관리 웹앱입니다.

## 핵심 킥
- **Plan A**: 집중 잘 되는 날
- **Plan B**: 평범한 날
- **Plan C**: 체력이 낮은 날

사용자는 날짜별로 세 가지 우주를 준비해두고, 현재 상태에 맞는 우주를 선택해서 오늘의 할 일을 볼 수 있습니다.

## 포함 기능
- 날짜 선택
- 할 일 추가
- 할 일 완료 체크
- 할 일 수정
- 할 일 삭제
- 우주 A/B/C 전환
- 우주별 할 일 수 / 완료율 표시
- 로컬스토리지 저장
- 반응형 디자인

## 파일 구조
```text
parallel-universe-todo/
├── index.html
├── styles.css
├── app.js
├── vercel.json
└── README.md
```

## 로컬 실행
가장 간단한 방법은 정적 서버로 실행하는 것입니다.

### 방법 1: VS Code Live Server
- 프로젝트 폴더를 열기
- `index.html` 우클릭
- `Open with Live Server`

### 방법 2: http-server 사용
Node.js가 설치되어 있다면:

```bash
npx http-server .
```

또는 전역 설치가 되어 있다면:

```bash
http-server .
```

## Vercel 배포 방법

### 방법 1: GitHub 연동
1. 이 폴더를 GitHub 저장소에 업로드
2. Vercel에서 `Add New Project` 선택
3. 해당 저장소 연결
4. Framework Preset은 `Other` 또는 자동 감지 사용
5. Deploy 클릭

### 방법 2: Vercel CLI
```bash
npm i -g vercel
vercel
```

질문이 나오면 기본값으로 진행하면 됩니다.

## 제출용 한 줄 설명 예시
**하루를 하나로 계획하지 않고, 컨디션에 따라 세 가지 버전으로 준비하는 평행우주 투두앱입니다.**
# ToDoITall
