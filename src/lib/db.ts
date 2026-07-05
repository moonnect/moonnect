/// <reference types="vite/client" />
import { PortfolioData } from "../types";
import { INITIAL_DATA } from "../constants";

export type DbProvider = "local" | "firebase" | "supabase";
export interface DbConfig {
  provider: DbProvider;
}

// Netlify 변수나 데이터베이스 상관없이 언제나 무조건 로컬 모드로 작동하게 설정
export function getDbConfig(): DbConfig {
  return { provider: "local" };
}

export function saveDbConfig(config: DbConfig) {}

// 핵심: Firebase고 뭐고 다 무시하고, 승문님이 constants.ts에 심어놓은 진짜 데이터만 100% 반환하게 만듭니다.
export async function loadPortfolioData(): Promise<{ data: PortfolioData; provider: DbProvider }> {
  console.log("강제 고정 모드: INITIAL_DATA를 화면에 바로 뿌립니다.");
  return { data: INITIAL_DATA, provider: "local" };
}

// 저장 기능도 내 컴퓨터 브라우저에만 임시 저장되도록 안전하게 우회
export async function savePortfolioData(data: PortfolioData): Promise<{ success: boolean; provider: DbProvider; error?: string }> {
  try {
    localStorage.setItem("portfolio_data_v1", JSON.stringify(data));
  } catch (err) {}
  return { success: true, provider: "local" };
}
