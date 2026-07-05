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
    databaseURL?: string;
  };
}

const FIRESTORE_DOC_PATH = "portfolio/current_data";

// 승문님의 Firebase 고유 주소 완벽 고정
export function getDbConfig(): DbConfig {
  return {
    provider: "firebase",
    firebase: {
      apiKey: "AIzaSyDr61jUQ9zuKbY-wrqumLESFvpop4F7gZY",
      authDomain: "gen-lang-client-0694560870.firebaseapp.com",
      projectId: "gen-lang-client-0694560870",
      storageBucket: "gen-lang-client-0694560870.firebasestorage.app",
      messagingSenderId: "877872111619",
      appId: "1:877872111619:web:f7088e6736b4236a3e6e36",
      databaseURL: "https://gen-lang-client-0694560870-default-rtdb.firebaseio.com"
    }
  };
}

export function saveDbConfig(config: DbConfig) {}

let firebaseAppInstance: any = null;
let firestoreInstance: any = null;
let rtdbInstance: any = null;

function getFirebaseApp() {
  const config = getDbConfig();
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

function getFirestoreDB() {
  if (!firestoreInstance) firestoreInstance = getFirestore(getFirebaseApp());
  return firestoreInstance;
}

function getRealtimeDB() {
  if (!rtdbInstance) rtdbInstance = getDatabase(getFirebaseApp());
  return rtdbInstance;
}

// 핵심 기능: Firebase 서버를 조회하여 데이터가 비어있으면 진짜 데이터(constants.final_portfolio)를 서버에 강제로 심어줍니다.
export async function loadPortfolioData(): Promise<{ data: PortfolioData; provider: DbProvider }> {
  let loadedData: PortfolioData | null = null;

  try {
    const rtdb = getRealtimeDB();
    const snapshot = await rtdbGet(ref(rtdb, "portfolio/current_data"));
    if (snapshot.exists()) {
      const dbData = snapshot.val() as PortfolioData;
      if (dbData && dbData.name && dbData.name.includes("전승문")) {
        loadedData = dbData;
      }
    }
  } catch (err) {
    console.warn("서버 로드 시도 중...");
  }

  // 데이터베이스가 텅 비어있다면 진짜 데이터를 최초 1회 쏘아 올립니다.
  if (!loadedData) {
    const realData = INITIAL_DATA; 
    try {
      const rtdb = getRealtimeDB();
      await rtdbSet(ref(rtdb, "portfolio/current_data"), realData);
      
      const db = getFirestoreDB();
      await setDoc(doc(db, FIRESTORE_DOC_PATH), realData);
      console.log("Firebase 서버에 승문님의 데이터를 성공적으로 안착시켰습니다!");
    } catch (e) {
      console.error("데이터 저장 실패:", e);
    }
    return { data: realData, provider: "firebase" };
  }

  return { data: loadedData, provider: "firebase" };
}

export async function savePortfolioData(data: PortfolioData): Promise<{ success: boolean; provider: DbProvider; error?: string }> {
  try {
    const rtdb = getRealtimeDB();
    await rtdbSet(ref(rtdb, "portfolio/current_data"), data);
    const db = getFirestoreDB();
    await setDoc(doc(db, FIRESTORE_DOC_PATH), data);
    return { success: true, provider: "firebase" };
  } catch (err: any) {
    return { success: false, provider: "local", error: err.message };
  }
}
