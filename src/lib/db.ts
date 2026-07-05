/// <reference types="vite/client" />
import { PortfolioData } from "../types";
// 파이어베이스 주소를 완전히 지우고, 승문님의 진짜 데이터 파일만 강제로 읽어옵니다.
import { INITIAL_DATA } from "../constants.final_portfolio";

export type DbProvider = "local" | "firebase" | "supabase";
export interface DbConfig {
  provider: DbProvider;
}

// 데이터베이스 설정을 무조건 '로컬'로 강제 고정 (파이어베이스 연결을 완전히 끊음)
export function getDbConfig(): DbConfig {
  return { provider: "local" };
}

export function saveDbConfig(config: DbConfig) {}

// 서버 상태와 무관하게, 승문님이 제작한 진짜 포트폴리오 데이터만 100% 화면에 반환
export async function loadPortfolioData(): Promise<{ data: PortfolioData; provider: DbProvider }> {
  return { data: INITIAL_DATA, provider: "local" };
}

export async function savePortfolioData(data: PortfolioData): Promise<{ success: boolean; provider: DbProvider; error?: string }> {
  try {
    localStorage.setItem("portfolio_data_v1", JSON.stringify(data));
  } catch (err) {}
  return { success: true, provider: "local" };
}
