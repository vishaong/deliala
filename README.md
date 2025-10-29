# 택배 배송 상태 조회 서비스

스마트택배 API를 사용하여 실시간 배송 정보를 조회할 수 있는 웹 애플리케이션입니다.

## 주요 기능

- 🔑 API 키 설정 및 관리
- 🚚 택배사 목록 조회
- 📦 송장번호를 통한 배송 상태 조회
- 📊 배송 진행 상황 시각화
- 📱 반응형 디자인

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 개발 서버 실행
```bash
npm run dev
```

### 3. 빌드
```bash
npm run build
```

## API 키 발급

1. [스마트택배 API 문서](https://info.sweettracker.co.kr/apidoc)에 접속
2. 회원가입 후 API 키 발급
3. 애플리케이션에서 API 키 입력

## 사용법

1. **API 키 설정**: 첫 실행 시 스마트택배 API 키를 입력합니다.
2. **택배사 선택**: 드롭다운에서 택배사를 선택합니다.
3. **송장번호 입력**: 조회할 송장번호를 입력합니다.
4. **조회**: "배송 상태 조회" 버튼을 클릭하여 배송 정보를 확인합니다.

## 지원 택배사

- CJ대한통운
- 한진택배
- 롯데택배
- 로젠택배
- 우체국택배
- 기타 스마트택배 API에서 지원하는 모든 택배사

## 기술 스택

- React 18
- Vite
- Axios
- CSS3

## 참고 자료

- [스마트택배 API 문서](https://info.sweettracker.co.kr/apidoc)
- [스마트택배 API 사용 경험 공유](https://weezip.treefeely.com/post/use-sweettracker-api-for-delivery-information)
