/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getDatabase, ref, get as rtdbGet, set as rtdbSet } from "firebase/database";
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

/**
 * 무한 Pending 방지용 비동기 타임아웃 래퍼
 */
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

// ---------------------------------------------------------
// 2. Firebase (Firestore & Realtime Database) 연동 코어
// ---------------------------------------------------------
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
        // Realtime Database 연동을 위해 databaseURL을 설정해 줍니다. 
        // 만약 명시적인 databaseURL이 없는 경우, projectId 기반의 기본 대기 주소 포백을 구성합니다.
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

  // 1. Firebase (Realtime Database & Firestore) 연동
  if (config.provider === "firebase") {
    let loadedData: PortfolioData | null = null;
    let rtdbSuccess = false;
    let firestoreSuccess = false;

    // 1-A. Firebase Realtime Database에서 가져오기 시도
    try {
      const rtdb = getRealtimeDB(config);
      const snapshot = await withTimeout(rtdbGet(ref(rtdb, "portfolio/current_data")), 2500);
      if (snapshot.exists()) {
        const dbData = snapshot.val() as PortfolioData;
        if (dbData && dbData.name && dbData.items && Array.isArray(dbData.items) && dbData.items.length > 0) {
          loadedData = dbData;
          rtdbSuccess = true;
          console.log("Firebase Realtime Database에서 포트폴리오 데이터를 성공적으로 로드했습니다.");
        }
      }
    } catch (err) {
      console.warn("Firebase Realtime Database 로드 실패, Firestore 조회를 시도합니다.", err);
    }

    // 1-B. Realtime Database가 비어있거나 실패한 경우, Cloud Firestore에서 가져오기 시도
    if (!loadedData) {
      try {
        const db = getFirestoreDB(config);
        const docRef = doc(db, FIRESTORE_DOC_PATH);
        const docSnap = await withTimeout(getDoc(docRef), 2500);

        if (docSnap.exists()) {
          const dbData = docSnap.data() as PortfolioData;
          if (dbData && dbData.name && dbData.items && Array.isArray(dbData.items) && dbData.items.length > 0) {
            loadedData = dbData;
            firestoreSuccess = true;
            console.log("Firebase Firestore에서 포트폴리오 데이터를 성공적으로 로드했습니다.");

            // 복구/정렬 차원에서 Realtime Database에 저장해 줍니다.
            try {
              const rtdb = getRealtimeDB(config);
              await withTimeout(rtdbSet(ref(rtdb, "portfolio/current_data"), dbData), 2000);
            } catch (e) {
              console.warn("Firestore 데이터를 Realtime Database에 동기화하는 중 오류 발생:", e);
            }
          }
        }
      } catch (err) {
        console.warn("Firebase Firestore 로드 실패, 로컬 저장소 조회를 시도합니다.", err);
      }
    }

    // 1-C. 둘 다 성공한 데이터가 없거나 처음 생성된 경우: 내장된 포트폴리오 데이터(기본값)를 가져와 양쪽에 시딩
    if (!loadedData) {
      console.log("Firebase 저장소(RTDB & Firestore)가 비어있어 기본 포트폴리오 데이터(INITIAL_DATA)를 설정하고 복구합니다.");
      const localSaved = localStorage.getItem(DATA_STORAGE_KEY);
      let initialData = INITIAL_DATA;
      
      if (localSaved) {
        try {
          const parsed = JSON.parse(localSaved);
          if (parsed && parsed.name && parsed.items && parsed.items.length > 0) {
            initialData = parsed;
          }
        } catch (e) {
          console.error("로컬 백업 파싱 실패:", e);
        }
      }

      // 양쪽 데이터베이스에 내장 기본 데이터를 저장하여 시딩 완료시킵니다.
      try {
        const rtdb = getRealtimeDB(config);
        await withTimeout(rtdbSet(ref(rtdb, "portfolio/current_data"), initialData), 2000);
      } catch (e) {
        console.warn("기본 데이터를 Realtime Database에 시딩 실패:", e);
      }

      try {
        const db = getFirestoreDB(config);
        await withTimeout(setDoc(doc(db, FIRESTORE_DOC_PATH), initialData), 2000);
      } catch (e) {
        console.warn("기본 데이터를 Firestore에 시딩 실패:", e);
      }

      return { data: initialData, provider: "firebase" };
    }

    return { data: loadedData, provider: "firebase" };
  }

  // 2. Supabase 연동
  if (config.provider === "supabase") {
    try {
      const supabaseData = await withTimeout(fetchFromSupabase(config), 2500);
      if (supabaseData && supabaseData.name && supabaseData.items && Array.isArray(supabaseData.items) && supabaseData.items.length > 0) {
        return { data: supabaseData, provider: "supabase" };
      } else {
        console.log("Supabase에 데이터가 비어있거나 불완전하여 초기 데이터를 설정합니다.");
        const localSaved = localStorage.getItem(DATA_STORAGE_KEY);
        let initialData = INITIAL_DATA;
        if (localSaved) {
          try {
            const parsed = JSON.parse(localSaved);
            if (parsed && parsed.name && parsed.items && parsed.items.length > 0) {
              initialData = parsed;
            }
          } catch (e) {
            console.error("Failed to parse local backup", e);
          }
        }
        
        await withTimeout(saveToSupabase(config, initialData), 2500);
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
      const parsed = JSON.parse(saved) as PortfolioData;
      if (parsed && parsed.name && parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
        return { data: parsed, provider: "local" };
      }
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

  // 1. Firebase (Realtime Database & Firestore) 저장
  if (config.provider === "firebase") {
    let successCount = 0;
    let rtdbErrorMsg = "";
    let firestoreErrorMsg = "";

    // 1-A. Realtime Database 저장 시도
    try {
      const rtdb = getRealtimeDB(config);
      await withTimeout(rtdbSet(ref(rtdb, "portfolio/current_data"), data), 2500);
      successCount++;
    } catch (err: any) {
      console.error("Firebase Realtime Database 저장 실패:", err);
      rtdbErrorMsg = err.message || String(err);
    }

    // 1-B. Firestore 저장 시도
    try {
      const db = getFirestoreDB(config);
      const docRef = doc(db, FIRESTORE_DOC_PATH);
      await withTimeout(setDoc(docRef, data), 2500);
      successCount++;
    } catch (err: any) {
      console.error("Firebase Firestore 저장 실패:", err);
      firestoreErrorMsg = err.message || String(err);
    }

    if (successCount > 0) {
      return { success: true, provider: "firebase" };
    } else {
      return { 
        success: false, 
        provider: "local", 
        error: `Firebase 저장 실패.\n[RTDB 에러]: ${rtdbErrorMsg || "없음"}\n[Firestore 에러]: ${firestoreErrorMsg || "없음"}` 
      };
    }
  }

  // 2. Supabase 저장
  if (config.provider === "supabase") {
    try {
      await withTimeout(saveToSupabase(config, data), 2500);
      return { success: true, provider: "supabase" };
    } catch (err: any) {
      console.error("Supabase 저장 실패:", err);
      return { success: false, provider: "local", error: `Supabase 저장 실패: ${err.message || err}` };
    }
  }

  // 3. 로컬 저장만 한 경우
  return { success: true, provider: "local" };
}
