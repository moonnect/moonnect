/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getDatabase, ref, get as rtdbGet, set as rtdbSet } from "firebase/database";
import { PortfolioData } from "../types";
import { INITIAL_DATA } from "../constants.final_portfolio";

export type DbProvider = "local" | "firebase" | "supabase";
export interface DbConfig {
  provider: DbProvider;
  firebase?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    databaseId?: string;
  };
}

const CONFIG_STORAGE_KEY = "db_config_v1";
const DATA_STORAGE_KEY = "portfolio_data_v1";
const FIRESTORE_DOC_PATH = "portfolio/current_data";

export function getDbConfig(): DbConfig {
  // 환경변수가 있든 없든, 강제로 firebase 모드로 작동하게 만듭니다.
  return {
    provider: "firebase",
    firebase: {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
      appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
      databaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || "",
    }
  };
}

export function saveDbConfig(config: DbConfig) {}

let firebaseAppInstance: any = null;
let firestoreInstance: any = null;
let rtdbInstance: any = null;

function getFirebaseApp(config: DbConfig) {
  if (!firebaseAppInstance) {
    const apps = getApps();
    if (apps.length > 0) {
      firebaseAppInstance = getApp();
    } else {
      firebaseAppInstance = initializeApp(config.firebase!);
    }
  }
  return firebaseAppInstance;
}

function getFirestoreDB(config: DbConfig) {
  const app = getFirebaseApp(config);
  if (!firestoreInstance) firestoreInstance = getFirestore(app);
  return firestoreInstance;
}

function getRealtimeDB(config: DbConfig) {
  const app = getFirebaseApp(config);
  if (!rtdbInstance) rtdbInstance = getDatabase(app);
  return rtdbInstance;
}

// 핵심 기능: Firebase 서버에 데이터가 없거나 깡통이면, 파일에 있는 진짜 데이터를 서버에 강제로 쑤셔 넣습니다!
export async function loadPortfolioData(): Promise<{ data: PortfolioData; provider: DbProvider }> {
  const config = getDbConfig();
  let loadedData: PortfolioData | null = null;

  try {
    const rtdb = getDatabase(getFirebaseApp(config));
    const snapshot = await rtdbGet(ref(rtdb, "portfolio/current_data"));
    if (snapshot.exists()) {
      const dbData = snapshot.val() as PortfolioData;
      // 데이터가 존재하고 전승문 이름이 정상적으로 들어있는지 확인
      if (dbData && dbData.name && dbData.name.includes("전승문")) {
        loadedData = dbData;
      }
    }
  } catch (err) {
    console.warn("서버 로드 실패, 백업 절차 진행");
  }

  // 서버에 진짜 데이터가 없다면? 승문님의 진짜 파일 데이터를 서버에 즉시 저장(시딩)합니다.
  if (!loadedData) {
    console.log("Firebase 서버에 승문님의 진짜 데이터를 전송합니다...");
    const realData = INITIAL_DATA; // constants.final_portfolio에서 가져온 진짜 데이터

    try {
      const rtdb = getRealtimeDB(config);
      await rtdbSet(ref(rtdb, "portfolio/current_data"), realData);
      
      const db = getFirestoreDB(config);
      await setDoc(doc(db, FIRESTORE_DOC_PATH), realData);
      console.log("Firebase 서버 전송 완료!");
    } catch (e) {
      console.error("서버 전송 중 에러 발생:", e);
    }
    return { data: realData, provider: "firebase" };
  }

  return { data: loadedData, provider: "firebase" };
}

export async function savePortfolioData(data: PortfolioData): Promise<{ success: boolean; provider: DbProvider; error?: string }> {
  const config = getDbConfig();
  try {
    const rtdb = getRealtimeDB(config);
    await rtdbSet(ref(rtdb, "portfolio/current_data"), data);
    const db = getFirestoreDB(config);
    await setDoc(doc(db, FIRESTORE_DOC_PATH), data);
    return { success: true, provider: "firebase" };
  } catch (err: any) {
    return { success: false, provider: "local", error: err.message };
  }
}
