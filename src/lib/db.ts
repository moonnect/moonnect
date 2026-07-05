/// <reference types="vite/client" />
import { PortfolioData } from "../types";
import { INITIAL_DATA } from "../constants"; 

export type DbProvider = "local" | "firebase" | "supabase";
export interface DbConfig { provider: DbProvider; }
export function getDbConfig(): DbConfig { return { provider: "local" }; }
export function saveDbConfig(config: DbConfig) {}

// 핵심: 브라우저가 사이트를 켤 때 작동하는 함수
export async function loadPortfolioData(): Promise<{ data: PortfolioData; provider: DbProvider }> {
  try {
    // 1. 승문님이 관리자 페이지에서 수정하고 저장 버튼을 눌렀던 진짜 데이터를 먼저 찾아봅니다.
    const localData = localStorage.getItem("portfolio_data_v1");
    
    if (localData) {
      // 2. 진짜 데이터가 존재하면, 깡통 constants.ts를 무시하고 승문님의 수정본을 화면에 쏩니다!
      return { data: JSON.parse(localData), provider: "local" };
    }
  } catch (err) {
    console.error("로컬 데이터를 불러오는 중 오류 발생:", err);
  }
  
  // 3. 만약 관리자 페이지에서 수정한 적이 없는 완전 처음 상태라면 기본 도면을 보여줍니다.
  return { data: INITIAL_DATA, provider: "local" };
}

export async function savePortfolioData(data: PortfolioData): Promise<{ success: boolean; provider: DbProvider; error?: string }> {
  try {
    // 관리자 페이지에서 [저장]을 누르면 이 로컬 저장소에 완벽하게 꽂히도록 합니다.
    localStorage.setItem("portfolio_data_v1", JSON.stringify(data));
    return { success: true, provider: "local" };
  } catch (err) {
    return { success: false, provider: "local", error: String(err) };
  }
}
