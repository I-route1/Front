importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyD28xICUnSUiJdVdpgMIPge5s96P9PRBHQ",
    authDomain: "i-route-c5547.firebaseapp.com",
    projectId: "i-route-c5547",
    storageBucket: "i-route-c5547.firebasestorage.app",
    messagingSenderId: "1079919806776",
    appId: "1:1079919806776:web:b86fbfb883446c5aa959cd"
};

// 알림을 누르면 앱을 연다 (이미 열려 있으면 그 창을 앞으로, 없으면 지도 화면을 새로 연다).
// Firebase가 띄운 알림은 Firebase의 클릭 처리가 링크가 없으면 닫기만 하므로,
// Firebase보다 먼저(firebase.messaging() 전에) 등록해서 이 처리가 먼저 받게 한다.
self.addEventListener('notificationclick', (event) => {
    event.stopImmediatePropagation();
    event.notification.close();
    const target = new URL('/map', self.location.origin).href;
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
            const opened = windows.find((w) => w.url.startsWith(self.location.origin));
            return opened ? opened.focus() : clients.openWindow(target);
        })
    );
});

// 백그라운드 환경용 Firebase 앱을 초기화
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 앱이 꺼져 있거나 숨겨진 상태에서 푸시 알림을 받았을 때.
// 백엔드(FirebasePushService)는 notification(제목·본문)을 넣어 보내는데, 이런 메시지는 Firebase가 알아서 알림을 띄운다.
// 여기서 또 띄우면 같은 알림이 두 번 뜨므로, notification 없이 data로만 온 메시지만 직접 띄운다.
messaging.onBackgroundMessage((payload) => {
    if (payload.notification) return;

    const data = payload.data || {};
    self.registration.showNotification(data.title || '아이루트 알림', {
        body: data.body || '차량 상태가 업데이트되었습니다.',
        icon: '/favicon.svg', // 알림창 왼쪽 아이콘 (public 폴더 기준 경로)
        badge: '/favicon.svg', // 모바일 상단 바 작은 아이콘
    });
});
