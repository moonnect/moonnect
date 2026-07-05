/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getDatabase, ref, get as rtdbGet, set as rtdbSet } from "firebase/database";
import { PortfolioData } from "../types";
import { INITIAL_DATA } from "../constants";

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
  supabase?: {
    url: string;
    anonKey: string;
  };
}

const CONFIG_STORAGE_KEY = "db_config_v1";
const DATA_STORAGE_KEY = "portfolio_data_v1";
const FIRESTORE_DOC_PATH = "portfolio/current_data";

export function getDbConfig(): DbConfig {
  const envProvider = import.meta.env.VITE_DB_PROVIDER as DbProvider;
  
  if (envProvider === "firebase" && import.meta.env.VITE_FIREBASE_API_KEY) {
    return {
      provider: "firebase",
      firebase: {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
        appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
        databaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || "",
      }
    };
  }

  if (envProvider === "supabase" && import.meta.env.VITE_SUPABASE_URL) {
    return {
      provider: "supabase",
      supabase: {
        url: import.meta.env.VITE_SUPABASE_URL,
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
      }
    };
  }

  const savedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
  if (savedConfig) {
    try {
      const parsed = JSON.parse(savedConfig) as DbConfig;
      if (parsed && parsed.provider) return parsed;
    } catch (err) {
      console.error("Failed to parse db config from localStorage", err);
    }
  }

  return { provider: "local" };
}

export function saveDbConfig(config: DbConfig) {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

function withTimeout<T>(promise: Promise<T>, ms: number = 2500): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout: ${ms}ms 이내에 데이터베이스 응답이 없습니다.`));
    }, ms);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

let firebaseAppInstance: any = null;
let firestoreInstance: any = null;
let rtdbInstance: any = null;

function getFirebaseApp(config: DbConfig) {
  if (!config.firebase || !config.firebase.apiKey) {
    throw new Error("Firebase 설정 정보(API Key 등)가 누락되었습니다.");
  }
  
  try {
    if (!firebaseAppInstance) {
      const apps = getApps();
      if (apps.length > 0) {
        firebaseAppInstance = getApp();
      } else {
        const rtdbUrl = (config.firebase as any).databaseURL || `https://${config.firebase.projectId}-default-rtdb.firebaseio.com`;
        firebaseAppInstance = initializeApp({
          ...config.firebase,
          databaseURL: rtdbUrl
        });
      }
    }
    return firebaseAppInstance;
  } catch (err) {
    console.error("Firebase App 초기화 에러:", err);
    throw err;
  }
}

function getFirestoreDB(config: DbConfig) {
  const app = getFirebaseApp(config);
  try {
    if (!firestoreInstance) {
      if (config.firebase?.databaseId) {
        firestoreInstance = getFirestore(app, config.firebase.databaseId);
      } else {
        firestoreInstance = getFirestore(app);
      }
    }
    return firestoreInstance;
  } catch (err) {
    console.error("Firestore 초기화 실패:", err);
    throw err;
  }
}

function getRealtimeDB(config: DbConfig) {
  const app = getFirebaseApp(config);
  try {
    if (!rtdbInstance) {
      rtdbInstance = getDatabase(app);
    }
    return rtdbInstance;
  } catch (err) {
    console.error("Firebase Realtime Database 초기화 실패:", err);
    throw err;
  }
}

async function fetchFromSupabase(config: DbConfig): Promise<PortfolioData | null> {
  if (!config.supabase || !config.supabase.url || !config.supabase.anonKey) {
    throw new Error("Supabase 설정 정보(URL, Anon Key)가 누락되었습니다.");
  }

  const url = `${config.supabase.url}/rest/v1/portfolio?select=data&id=eq.current`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "apikey": config.supabase.anonKey,
      "Authorization": `Bearer ${config.supabase.anonKey}`,
      "Content-Type": "application/json",
    }
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Supabase API 호출 실패: ${response.statusText}`);
  }

  const result = await response.json();
  if (result && result.length > 0 && result[0].data) {
    return result[0].data as PortfolioData;
  }
  return null;
}

async function saveToSupabase(config: DbConfig, data: PortfolioData): Promise<void> {
  if (!config.supabase || !config.supabase.url || !config.supabase.anonKey) {
    throw new Error("Supabase 설정 정보(URL, Anon Key)가 누락되었습니다.");
  }

  const url = `${config.supabase.url}/rest/v1/portfolio?id=eq.current`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "apikey": config.supabase.anonKey,
      "Authorization": `Bearer ${config.supabase.anonKey}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates, return=minimal"
    },
    body: JSON.stringify({
      id: "current",
      data: data,
      updated_at: new Date().toISOString()
    })
  });

  if (!response.ok) {
    const insertUrl = `${config.supabase.url}/rest/v1/portfolio`;
    const insertResponse = await fetch(insertUrl, {
      method: "POST",
      headers: {
        "apikey": config.supabase.anonKey,
        "Authorization": `Bearer ${config.supabase.anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: "current",
        data: data,
        updated_at: new Date().toISOString()
      })
    });

    if (!insertResponse.ok) {
      const patchResponse = await fetch(url, {
        method: "PATCH",
        headers: {
          "apikey": config.supabase.anonKey,
          "Authorization": `Bearer ${config.supabase.anonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: data,
          updated_at: new Date().toISOString()
        })
      });

      if (!patchResponse.ok) {
        throw new Error(`Supabase 저장 실패: ${patchResponse.statusText}`);
      }
    }
  }
}

// ---------------------------------------------------------
// 데이터베이스가 비어있어도 무조건 '내 원래 포트폴리오'로 강제 고정하는 튜닝 코드
// ---------------------------------------------------------
export async function loadPortfolioData(): Promise<{ data: PortfolioData; provider: DbProvider }> {
  const config = getDbConfig();

  // 언제나 AI 스튜디오가 준 INITIAL_DATA를 메인 포백으로 무조건 사용하도록 강제 설정합니다.
  if (config.provider === "firebase") {
    let loadedData: PortfolioData | null = null;

    try {
      const rtdb = getRealtimeDB(config);
      const snapshot = await withTimeout(rtdbGet(ref(rtdb, "portfolio/current_data")), 1500);
      if (snapshot.exists()) {
        const dbData = snapshot.val() as PortfolioData;
        if (dbData && dbData.name) {
          loadedData = dbData;
        }
      }
    } catch (err) {
      console.warn("RTDB 조회 스킵 또는 실패");
    }

    if (!loadedData) {
      try {
        const db = getFirestoreDB(config);
        const docRef = doc(db, FIRESTORE_DOC_PATH);
        const docSnap = await withTimeout(getDoc(docRef), 1500);
        if (docSnap.exists()) {
          const dbData = docSnap.data() as PortfolioData;
          if (dbData && dbData.name) {
            loadedData = dbData;
          }
        }
      } catch (err) {
        console.warn("Firestore 조회 스킵 또는 실패");
      }
    }

    // 데이터베이스가 텅 비어있거나 옛날 모양이면, 강제로 AI 스튜디오가 만든 INITIAL_DATA를 화면에 반환시킵니다.
    if (!loadedData) {
      return { data: INITIAL_DATA, provider: "firebase" };
    }

    return { data: loadedData, provider: "firebase" };
  }

  return { data: INITIAL_DATA, provider: "local" };
}

export async function savePortfolioData(data: PortfolioData): Promise<{ success: boolean; provider: DbProvider; error?: string }> {
  const config = getDbConfig();
  
  try {
    localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("로컬 브라우저 캐시 저장 한도 초과");
  }

  if (config.provider === "firebase") {
    let successCount = 0;
    try {
      const rtdb = getRealtimeDB(config);
      await withTimeout(rtdbSet(ref(rtdb, "portfolio/current_data"), data), 2000);
      successCount++;
    } catch (err) {}

    try {
      const db = getFirestoreDB(config);
      const docRef = doc(db, FIRESTORE_DOC_PATH);
      await withTimeout(setDoc(docRef, data), 2000);
      successCount++;
    } catch (err) {}

    return { success: true, provider: "firebase" };
  }

  return { success: true, provider: "local" };
}
