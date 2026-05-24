import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { firebaseConfig } from "../firebase/config";

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const requestAndGetFCMToken = async () => {
    try {

        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
            console.warn("i-route 알림 권한이 거부되었습니다.");
            return null;
        }

        const token = await getToken(messaging, {
            vapidKey: "BEnpZP_q-dRMSb9ovs35-EX_tiDrxyr8p-XeeX0btVZoWgsLqU0krBg4opuWgtzdArXMO7UoFl2bDGJlpjQPkZc"
        });

        if (token) {
            console.log("[FCM 토큰 발급 성공] 이 토큰을 복사해서 Firebase에서 테스트해보세요:\n", token);
            return token;
        } else {
            console.log("사용 가능한 FCM 토큰이 없습니다. 권한을 다시 확인하세요.");
            return null;
        }
    } catch (error) {
        console.error("FCM 토큰을 취득하는 중 에러가 발생했습니다:", error);
    }
};

export const initForegroundMessageListener = () => {
    onMessage(messaging, (payload) => {
        console.log("웹 화면이 켜진 상태(포그라운드)에서 실시간 FCM 수신 완료:", payload);

        alert(`[${payload.notification.title}] ${payload.notification.body}`);
    });
};