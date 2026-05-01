import { useState, useEffect, useCallback } from 'react';

const FREE_DAILY_LIMIT = 100;
const STORAGE_KEY = 'ramu_generations';
const PRO_KEY = 'ramu_pro';

interface GenerationData {
  date: string;
  count: number;
}

const todayKey = () => new Date().toISOString().slice(0, 10);

export const useGenerationLimit = () => {
  const [count, setCount] = useState(0);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data: GenerationData = JSON.parse(raw);
        if (data.date === todayKey()) {
          setCount(data.count);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      setIsPro(localStorage.getItem(PRO_KEY) === '1');
    } catch {
      // ignore
    }
  }, []);

  const remaining = isPro ? Infinity : Math.max(0, FREE_DAILY_LIMIT - count);
  const limitReached = !isPro && count >= FREE_DAILY_LIMIT;

  const increment = useCallback(() => {
    if (isPro) return;
    const next = count + 1;
    setCount(next);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ date: todayKey(), count: next } as GenerationData),
      );
    } catch {
      // ignore
    }
  }, [count, isPro]);

  const setPro = useCallback((pro: boolean) => {
    setIsPro(pro);
    try {
      if (pro) localStorage.setItem(PRO_KEY, '1');
      else localStorage.removeItem(PRO_KEY);
    } catch {
      // ignore
    }
  }, []);

  return {
    count,
    remaining,
    limit: FREE_DAILY_LIMIT,
    isPro,
    limitReached,
    increment,
    setPro,
  };
};
