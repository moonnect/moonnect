/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { PortfolioData } from '@/types';
import { INITIAL_DATA } from '@/constants';
import { loadPortfolioData, savePortfolioData, DbProvider, getDbConfig } from '@/lib/db';

export function usePortfolio() {
  const [data, setData] = useState<PortfolioData>(INITIAL_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [provider, setProvider] = useState<DbProvider>("local");

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const result = await loadPortfolioData();
      setData(result.data);
      setProvider(result.provider);
    } catch (err) {
      console.error("Failed to load portfolio data from database", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const updateData = async (newData: PortfolioData): Promise<{ success: boolean; provider: DbProvider; error?: string }> => {
    setData(newData);
    setIsSaving(true);
    try {
      const result = await savePortfolioData(newData);
      setProvider(result.provider);
      return result;
    } catch (err: any) {
      console.error("Failed to save data", err);
      return { success: false, provider: "local", error: err.message || String(err) };
    } finally {
      setIsSaving(false);
    }
  };

  return { 
    data, 
    updateData, 
    isLoading, 
    isSaving, 
    provider,
    refreshData
  };
}

