# 백그라운드 알림 설정 — 처음부터 끝까지 따라하기

Git이나 서버 코드가 익숙하지 않으셔도 되도록, GitHub 웹사이트 화면에서 클릭만으로
할 수 있는 방법으로 설명합니다. 순서대로만 따라오시면 됩니다.

---

## 0단계. 지금 서버가 어느 GitHub 저장소에 있는지 찾기

1. https://render.com 에 로그인
2. 대시보드에서 `kkm-mwrc` (또는 비슷한 이름의) 서비스를 클릭
3. 서비스 상세 화면 위쪽, 서비스 이름 옆이나 **Settings** 탭에 **"Repository"** 라는 항목이
   있습니다. 여기 적힌 `github.com/사용자명/저장소명` 링크가 이 서버의 실제 코드가 있는 곳입니다.
4. 그 링크를 눌러 GitHub 저장소로 이동하세요. 이제부터는 이 저장소 화면에서 작업합니다.

> 만약 이 화면에서 저장소를 못 찾겠으면, Render 대시보드 서비스 목록 캡처를 보내주시면
> 어디를 봐야 하는지 짚어드릴게요.

---

## 1단계. `push-addon.js` 파일을 저장소에 추가하기

1. 방금 연 GitHub 저장소 화면에서 **Add file → Upload files** 버튼을 클릭
   (초록색 **Code** 버튼 근처, 파일 목록 위쪽에 있습니다)
2. 제가 드린 `push-addon.js` 파일을 화면에 끌어다 놓기(드래그 앤 드롭)
3. 반드시 **저장소의 가장 바깥(루트) 폴더**에 올라가야 합니다. `package.json`이라는
   파일이 보이는 바로 그 위치와 같은 곳이어야 합니다.
4. 아래 **Commit changes** 초록 버튼 클릭 → 그대로 다시 **Commit changes** 확정

이제 저장소에 `push-addon.js`가 생겼습니다.

---

## 2단계. `package.json`에 필요한 패키지 2개 추가하기

1. 저장소 파일 목록에서 `package.json` 클릭
2. 오른쪽 위 연필 아이콘(✏️ Edit this file) 클릭
3. `"dependencies": {` 로 시작하는 부분을 찾으세요. 예를 들어 이렇게 생겼을 겁니다:
   ```json
   "dependencies": {
     "express": "^4.18.2",
     "cheerio": "^1.0.0",
     "axios": "^1.6.0"
   }
   ```
4. 그 안에 아래 두 줄을 추가합니다 (기존 마지막 줄 끝에 콤마 `,`를 꼭 붙이세요):
   ```json
   "dependencies": {
     "express": "^4.18.2",
     "cheerio": "^1.0.0",
     "axios": "^1.6.0",
     "web-push": "^3.6.7",
     "cors": "^2.8.5"
   }
   ```
   (실제 파일의 다른 패키지 이름/버전은 그대로 두고, `web-push`와 `cors` 두 줄만 추가하시면 됩니다)
5. 오른쪽 위 **Commit changes** 클릭 → 확정

---

## 3단계. 서버 진입 파일에 두 줄 추가하기

1. 저장소에서 실제 서버가 시작되는 파일을 찾습니다. 보통 `server.js` 또는 `index.js`
   입니다. `package.json`을 다시 열어서 `"main": "server.js"` 처럼 적힌 줄을 보면
   정확한 파일명을 알 수 있습니다. (또는 `"scripts": { "start": "node server.js" }` 부분)
2. 그 파일을 클릭 → 연필 아이콘(✏️)으로 편집 모드 진입
3. 파일 맨 위쪽, 다른 `require(...)` 줄들이 모여 있는 곳에 아래 줄을 추가:
   ```js
   const pushAddon = require('./push-addon');
   ```
4. 파일 안에서 `app.listen(` 이라고 적힌 줄(서버를 실제로 실행시키는 부분)을 찾고,
   **그 줄 바로 위**에 아래 한 줄을 추가:
   ```js
   app.use(pushAddon);
   ```
5. **Commit changes** 클릭 → 확정

---

## 4단계. Render에 인증키(환경변수) 등록하기

1. 다시 https://render.com 대시보드로 이동, `kkm-mwrc` 서비스 클릭
2. 왼쪽 메뉴에서 **Environment** 클릭
3. **Add Environment Variable** 버튼을 두 번 눌러 아래 두 개를 추가:

   | Key | Value |
   |---|---|
   | `VAPID_PUBLIC_KEY` | `BNDelf6uZbmyWC9a9Oi4QFajYjKPRVdmxl0-BZqvwdl1MdKzO1Hg1Ed0ce1wCKJNdwRAmZObLtlQdntp-WbcC4A` |
   | `VAPID_PRIVATE_KEY` | `MdKzO1Hg1Ed0ce1wCKJNdwRAmZObLtlQdntp-WbcC4A` |

4. **Save Changes** 클릭

---

## 5단계. 배포되기를 기다리기

- 3단계에서 GitHub에 커밋을 하면, Render가 자동으로 이를 감지하고 새로 빌드 후
  재배포합니다. (Auto-Deploy가 켜져 있는 경우 — 대부분 기본값이 켜짐)
- Render 서비스 화면의 **Events** 또는 **Logs** 탭에서 진행 상황을 볼 수 있습니다.
- "Deploy live" 같은 문구가 뜨면 완료된 것입니다. 보통 1~3분 걸립니다.
- 만약 자동으로 안 되면, 서비스 화면 오른쪽 위 **Manual Deploy → Deploy latest commit**
  버튼을 눌러주세요.

---

## 6단계. 서버가 잘 붙었는지 확인하기

배포가 끝나면, 휴대폰이나 컴퓨터 브라우저 주소창에 아래처럼 입력해보세요
(끝에 아무 값이나 붙여서 실제 존재하지 않는 요청을 보내는 테스트입니다):

```
https://kkm-mwrc.onrender.com/api/alerts
```

- **"Cannot GET /api/alerts"** 같은 문구가 뜨면 → 정상입니다. (이 주소는 POST 전용이라
  이렇게 뜨는 게 맞습니다. 즉 라우터가 서버에 붙어서 이 경로를 인식하고 있다는 뜻)
- **"Cannot GET /"** 페이지만 뜨고 위 경로 관련 언급이 전혀 없거나, 서버 자체가 안 뜨면
  → 3단계 코드 삽입이나 2단계 package.json 수정에 오타가 없는지, Render 로그에
  에러가 없는지 확인이 필요합니다. 이 경우 Render **Logs** 탭 화면을 캡처해서
  보내주시면 원인을 봐드릴게요.

---

## 7단계. 실제로 앱에서 테스트하기

1. 휴대폰에서 GitHub Pages 앱(`index.html`)을 엽니다.
2. "감시 목록" 탭 → **백그라운드 알림 켜기** 버튼 클릭
3. 알림 권한을 묻는 팝업이 뜨면 **허용**
4. "알림 등록" 탭에서 아무 종목이나 골라, 현재가 근처의 매수/매도 목표가를 넣어
   금방 알림이 오도록 등록 (예: 현재가가 68,230원이면 매도가를 68,300원 정도로)
5. 앱을 완전히 닫거나 홈 화면으로 나가서 화면을 끕니다.
6. 최대 1분 정도 기다리면 알림이 옵니다. (서버가 30초마다 체크)
7. 알림을 탭하면 앱이 열리며 그 종목을 음성으로 다시 읽어줍니다.

---

## 막히면 이렇게 알려주세요

다음 중 뭐든 캡처해서 보내주시면 바로 짚어드릴 수 있습니다:
- Render의 **Repository** 항목 화면 (0단계에서 저장소를 못 찾을 때)
- GitHub 저장소의 파일 목록 화면 (실제 파일 구조가 예상과 다를 때)
- Render **Logs** 탭 화면 (배포 후 에러가 날 때)
- 앱에서 "백그라운드 알림 켜기" 눌렀을 때 뜨는 에러 메시지
