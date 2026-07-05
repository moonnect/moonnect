/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { PortfolioData } from "../types";
import { INITIAL_DATA } from "../constants";

// ---------------------------------------------------------
// 데이터베이스 드라이버 정의 (Database Drivers)
// ---------------------------------------------------------
export type DbProvider = "local" | "firebase" | "supabase";

export interface DbConfig {
  provider: DbProvider;
  // Firebase Config
  firebase?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    databaseId?: string;
  };
  // Supabase Config
  supabase?: {
    url: string;
    anonKey: string;
  };
}

const CONFIG_STORAGE_KEY = "db_config_v1";
const DATA_STORAGE_KEY = "portfolio_data_v1";
const FIRESTORE_DOC_PATH = "portfolio/current_data"; // collection: portfolio, doc: current_data

// ---------------------------------------------------------
// 1. 데이터베이스 설정 저장 및 로드
// ---------------------------------------------------------
export function getDbConfig(): DbConfig {
  // 1. 환경 변수 확인 (우선순위 1)
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

  // 2. localStorage 브라우저 내 저장된 설정 확인 (우선순위 2)
  const savedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
  if (savedConfig) {
    try {
      const parsed = JSON.parse(savedConfig) as DbConfig;
      if (parsed && parsed.provider) return parsed;
    } catch (err) {
      console.error("Failed to parse db config from localStorage", err);
    }
  }

  // 3. 기본값: 로컬 브라우저 저장소 사용
  return { provider: "local" };
}

export function saveDbConfig(config: DbConfig) {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

// ---------------------------------------------------------
// 2. Firebase Firestore 연동 코어
// ---------------------------------------------------------
let firebaseAppInstance: any = null;
let firestoreInstance: any = null;

function getFirestoreDB(config: DbConfig) {
  if (!config.firebase || !config.firebase.apiKey) {
    throw new Error("Firebase 설정 정보(API Key 등)가 누락되었습니다.");
  }
  
  try {
    if (!firebaseAppInstance) {
      const apps = getApps();
      if (apps.length > 0) {
        firebaseAppInstance = getApp();
      } else {
        firebaseAppInstance = initializeApp(config.firebase);
      }
    }
    if (!firestoreInstance) {
      if (config.firebase.databaseId) {
        firestoreInstance = getFirestore(firebaseAppInstance, config.firebase.databaseId);
      } else {
        firestoreInstance = getFirestore(firebaseAppInstance);
      }
    }
    return firestoreInstance;
  } catch (err) {
    console.error("Firebase 초기화 에러:", err);
    throw err;
  }
}

// ---------------------------------------------------------
// 3. Supabase 연동 코어 (JS SDK 동적 호출 또는 HTTP API 연동)
// ---------------------------------------------------------
async function fetchFromSupabase(config: DbConfig): Promise<PortfolioData | null> {
  if (!config.supabase || !config.supabase.url || !config.supabase.anonKey) {
    throw new Error("Supabase 설정 정보(URL, Anon Key)가 누락되었습니다.");
  }

  // Supabase JS SDK 대신 범용성과 에러 방지를 위해 초간단 REST API를 사용합니다.
  // 이 방식은 별도 무거운 SDK 임포트가 불필요하고, 모든 플랫폼에서 100% 동작합니다.
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
  // upsert 수행 (있으면 update, 없으면 insert)
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
    // 만약 단순 POST(upsert)가 실패하면, 먼저 insert 시도 후 실패 시 update를 명시적으로 수행합니다.
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
      // 이미 존재해서 실패했을 확률이 높으므로 patch(update) 수행
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
// 4. 통합 데이터 로드 및 저장 API
// ---------------------------------------------------------

/**
 * 설정된 프로바이더(Local, Firebase, Supabase)로부터 전체 포트폴리오 데이터를 로드합니다.
 */
export async function loadPortfolioData(): Promise<{ data: PortfolioData; provider: DbProvider }> {
  const config = getDbConfig();

  // 1. Firebase Firestore 연동
  if (config.provider === "firebase") {
    try {
      const db = getFirestoreDB(config);
      const docRef = doc(db, FIRESTORE_DOC_PATH);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { data: docSnap.data() as PortfolioData, provider: "firebase" };
      } else {
        // Firestore에 데이터가 아직 없는 경우: 로컬스토리지 데이터를 가져가거나 기본 데이터를 시딩
        console.log("Firestore에 데이터가 없어 초기 데이터를 설정합니다.");
        const localSaved = localStorage.getItem(DATA_STORAGE_KEY);
        const initialData = localSaved ? JSON.parse(localSaved) : INITIAL_DATA;
        
        await setDoc(docRef, initialData);
        return { data: initialData, provider: "firebase" };
      }
    } catch (err) {
      console.error("Firebase Firestore 로드 실패, 로컬 저장소로 포백합니다.", err);
      // 에러 발생 시 로컬 저장소 데이터 로드 포백
    }
  }

  // 2. Supabase 연동
  if (config.provider === "supabase") {
    try {
      const supabaseData = await fetchFromSupabase(config);
      if (supabaseData) {
        return { data: supabaseData, provider: "supabase" };
      } else {
        console.log("Supabase에 데이터가 없어 초기 데이터를 설정합니다.");
        const localSaved = localStorage.getItem(DATA_STORAGE_KEY);
        const initialData = localSaved ? JSON.parse(localSaved) : INITIAL_DATA;
        
        await saveToSupabase(config, initialData);
        return { data: initialData, provider: "supabase" };
      }
    } catch (err) {
      console.error("Supabase 로드 실패, 로컬 저장소로 포백합니다.", err);
    }
  }

  // 3. 로컬 브라우저 저장소 로드 (Local Storage)
  const saved = localStorage.getItem(DATA_STORAGE_KEY);
  if (saved) {
    try {
      return { data: JSON.parse(saved) as PortfolioData, provider: "local" };
    } catch (err) {
      console.error("로컬 저장소 파싱 실패:", err);
    }
  }

  return { data: INITIAL_DATA, provider: "local" };
}

/**
 * 설정된 프로바이더(Local, Firebase, Supabase)로 데이터를 즉시 저장하고 브라우저 로컬 저장소에도 백업합니다.
 */
export async function savePortfolioData(data: PortfolioData): Promise<{ success: boolean; provider: DbProvider; error?: string }> {
  const config = getDbConfig();
  
  // 브라우저 백업 (항상 로컬 캐싱 유지)
  try {
    localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("로컬 브라우저 저장소 캐싱 한도 초과 (비중요):", err);
  }

  // 1. Firebase Firestore 저장
  if (config.provider === "firebase") {
    try {
      const db = getFirestoreDB(config);
      const docRef = doc(db, FIRESTORE_DOC_PATH);
      await setDoc(docRef, data);
      return { success: true, provider: "firebase" };
    } catch (err: any) {
      console.error("Firebase Firestore 저장 실패:", err);
      return { success: false, provider: "local", error: `Firebase 저장 실패: ${err.message || err}` };
    }
  }

  // 2. Supabase 저장
  if (config.provider === "supabase") {
    try {
      await saveToSupabase(config, data);
      return { success: true, provider: "supabase" };
    } catch (err: any) {
      console.error("Supabase 저장 실패:", err);
      return { success: false, provider: "local", error: `Supabase 저장 실패: ${err.message || err}` };
    }
  }

  // 3. 로컬 저장만 한 경우
  return { success: true, provider: "local" };
}
