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

// 백그라운드 환경용 Firebase 앱을 초기화
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 앱이 꺼져있거나 숨겨진 상태에서 푸시 알림을 수신하면 브라우저가 이 함수를 실행
messaging.onBackgroundMessage((payload) => {
    console.log('[Service Worker] 백그라운드 메시지 수신 완료:', payload);

    // 알림창의 제목과 본문 내용을 세팅
    const notificationTitle = payload.notification.title || 'i-route 안심 알림';
    const notificationOptions = {
        body: payload.notification.body || '차량 상태가 업데이트되었습니다.',
        icon: '/favicon.svg', // 알림창 왼쪽에 뜰 아이콘 (public 폴더 기준 경로)
        badge: '/favicon.svg', // 모바일 상단 바에 뜰 작은 뱃지 아이콘
    };

    // 브라우저 시스템에 알림을 띄우라고 명령
    self.registration.showNotification(notificationTitle, notificationOptions);
});