/* ============================================================
   주식 알람 - 백그라운드 푸시 라우터
   기존 KIS 프록시 Express 서버(kkm-mwrc.onrender.com)에 추가하는 코드입니다.

   설치:
     npm install web-push cors

   기존 server.js(또는 index.js)에 추가:
     const pushAddon = require('./push-addon');
     app.use(pushAddon);

   환경변수 (Render 대시보드 > Environment):
     VAPID_PUBLIC_KEY  = BNDelf6uZbmyWC9a9Oi4QFajYjKPRVdmxl0-BZqvwdl1MdKzO1Hg1Ed0ce1wCKJNdwRAmZObLtlQdntp-WbcC4A
     VAPID_PRIVATE_KEY = MdKzO1Hg1Ed0ce1wCKJNdwRAmZObLtlQdntp-WbcC4A
   (직접 새로 발급하고 싶다면 `npx web-push generate-vapid-keys`로 새 키 쌍을
    만들어서 서버·클라이언트(index.html의 VAPID_PUBLIC_KEY) 양쪽에 동일하게 반영하세요.)

   ⚠️ 중요: 아래 livePrice()는 아직 모의(mock) 시세입니다.
   실제 서비스로 쓰려면 이미 구축하신 KIS Open API 연동 로직으로 교체해야
   실제 목표가 도달 여부를 정확히 판단할 수 있습니다.
   ============================================================ */

const express = require('express');
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const DATA_FILE = path.join(__dirname, 'push-subscriptions.json');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ||
  'BNDelf6uZbmyWC9a9Oi4QFajYjKPRVdmxl0-BZqvwdl1MdKzO1Hg1Ed0ce1wCKJNdwRAmZObLtlQdntp-WbcC4A';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ||
  'MdKzO1Hg1Ed0ce1wCKJNdwRAmZObLtlQdntp-WbcC4A';

webpush.setVapidDetails(
  'mailto:admin@example.com', // 원하시는 연락처 이메일로 바꿔주세요
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

/* ---------------- 파일 기반 저장소 ----------------
   개인 사용 규모라 별도 DB 없이 JSON 파일로 충분합니다.
   subscriptions.json 구조:
   { [endpoint]: { subscription, alerts: [{ticker,name,buyTarget,sellTarget,buyFired,sellFired}] } } */
function loadDB(){
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (e) { return {}; }
}
function saveDB(db){
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

const router = express.Router();
router.use(cors());
router.use(express.json());

router.post('/api/subscribe', (req, res) => {
  const { subscription } = req.body;
  if (!subscription || !subscription.endpoint){
    return res.status(400).json({ error: 'subscription required' });
  }
  const db = loadDB();
  const id = subscription.endpoint; // endpoint가 구독별 고유값
  db[id] = db[id] || { subscription, alerts: [] };
  db[id].subscription = subscription;
  saveDB(db);
  res.json({ id });
});

router.post('/api/alerts', (req, res) => {
  const { id, alerts } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  const db = loadDB();
  if (!db[id]) return res.status(404).json({ error: 'unknown subscription' });
  db[id].alerts = Array.isArray(alerts) ? alerts : [];
  saveDB(db);
  res.json({ ok: true });
});

router.post('/api/unsubscribe', (req, res) => {
  const { id } = req.body;
  const db = loadDB();
  delete db[id];
  saveDB(db);
  res.json({ ok: true });
});

/* ---------------- 모의 시세 엔진 (index.html과 동일 로직) ----------------
   실서비스 전환 시 이 부분을 실제 KIS API 조회 함수로 교체하세요. */
function hashSeed(str){
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
function seededRand(seed){
  let s = seed;
  return function(){ s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}
function basePrice(ticker){
  const r = seededRand(hashSeed(ticker));
  return Math.round((r() * 280000 + 8000) / 10) * 10;
}
const walk = {};
function livePrice(ticker){
  if (!(ticker in walk)) walk[ticker] = basePrice(ticker);
  const r = seededRand(Date.now() + hashSeed(ticker) + Math.floor(Math.random() * 1e6));
  const drift = (r() - 0.5) * 0.006;
  walk[ticker] = Math.max(100, Math.round(walk[ticker] * (1 + drift)));
  return walk[ticker];
}

/* ---------------- 목표가 체크 + 푸시 발송 ---------------- */
async function sendPush(subscription, body){
  try {
    await webpush.sendNotification(subscription, JSON.stringify({
      title: '주식 알람',
      body,
      icon: 'icon-192.png',
      url: './',
    }));
  } catch (err) {
    // 구독이 만료/취소된 경우 410/404가 흔히 발생합니다.
    console.error('push send failed:', err.statusCode, err.body);
    if (err.statusCode === 410 || err.statusCode === 404){
      const db = loadDB();
      for (const id of Object.keys(db)){
        if (db[id].subscription.endpoint === subscription.endpoint){
          delete db[id];
        }
      }
      saveDB(db);
    }
  }
}

async function checkAndNotify(){
  const db = loadDB();
  let changed = false;
  for (const id of Object.keys(db)){
    const entry = db[id];
    for (const item of entry.alerts){
      const p = livePrice(item.ticker);
      if (item.buyTarget && !item.buyFired && p <= item.buyTarget){
        item.buyFired = true;
        changed = true;
        await sendPush(entry.subscription, `${item.name}, 매수 목표가 ${item.buyTarget.toLocaleString('ko-KR')}원에 도달했습니다.`);
      }
      if (item.sellTarget && !item.sellFired && p >= item.sellTarget){
        item.sellFired = true;
        changed = true;
        await sendPush(entry.subscription, `${item.name}, 매도 목표가 ${item.sellTarget.toLocaleString('ko-KR')}원에 도달했습니다.`);
      }
    }
  }
  if (changed) saveDB(db);
}

// 30초마다 체크. Render 무료 플랜은 유휴 시 슬립되므로, 기존에 쓰시는
// UptimeRobot으로 이 서버도 계속 깨어있게 유지해야 백그라운드 감시가 끊기지 않습니다.
setInterval(checkAndNotify, 30000);

module.exports = router;
