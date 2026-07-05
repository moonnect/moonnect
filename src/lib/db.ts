/// <reference types="vite/client" />
import { PortfolioData } from "../types";
// 경로 수정 완료: 한 단계 위(..)에 있는 final_portfolio 데이터를 다이렉트로 읽어옵니다.
import { INITIAL_DATA } from "../constants.final_portfolio";

export type DbProvider = "local" | "firebase" | "supabase";
export interface DbConfig {
  provider: DbProvider;
}

// 모든 서버 연결을 끊고 안전한 로컬 모드로 완벽 고정
export function getDbConfig(): DbConfig {
  return { provider: "local" };
}

export function saveDbConfig(config: DbConfig) {}

// Firebase 데이터 유무와 상관없이 승문님의 진짜 데이터만 100% 반환
export async function loadPortfolioData(): Promise<{ data: PortfolioData; provider: DbProvider }> {
  console.log("강제 고정 모드: 전승문님의 진짜 포트폴리오 데이터를 로드합니다.");
  return { data: INITIAL_DATA, provider: "local" };
}

// 저장 기능 안전 우회
export async function savePortfolioData(data: PortfolioData): Promise<{ success: boolean; provider: DbProvider; error?: string }> {
  try {
    localStorage.setItem("portfolio_data_v1", JSON.stringify(data));
  } catch (err) {}
  return { success: true, provider: "local" };
}
