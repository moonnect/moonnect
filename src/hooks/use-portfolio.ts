/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { PortfolioData } from '@/types';
import { INITIAL_DATA } from '@/constants';

const STORAGE_KEY = 'portfolio_data_v1';

export function usePortfolio() {
  const [data, setData] = useState<PortfolioData>(INITIAL_DATA);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch (err) {
        console.error("Failed to parse saved data", err);
      }
    }
    setIsLoading(false);
  }, []);

  const updateData = (newData: PortfolioData) => {
    setData(newData);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    } catch (err) {
      console.error("Failed to save data to localStorage", err);
      alert("⚠️ 용량 제한 초과: 직접 업로드하신 이미지의 크기가 브라우저 저장 공간 한도(5MB)를 초과했습니다.\n\n해결 방법:\n1. 더 작거나 해상도가 낮은 이미지 파일(또는 JPG 파일)로 등록을 시도해 주세요.\n2. 기존에 등록해 두신 고용량 직접 업로드 이미지를 삭제하거나 이미지 URL 링크 주소 형태로 등록해 주세요.");
    }
  };

  return { data, updateData, isLoading };
}
