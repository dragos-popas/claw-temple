import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface DashboardData {
  spend: {
    daily: { date: string; amount: number }[];
    total: number;
  };
  productivity: {
    tasksCompleted: number;
    avgCycleTimeMinutes: number;
  };
  modelUsage: Array<{
    model: string;
    cost: number;
  }>;
  queue: {
    TODO: number;
    RESEARCH: number;
    DEV: number;
    QA: number;
    DONE: number;
  };
  generatedAt: string;
}

export function useAnalytics() {
  const [analytics, setAnalytics] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboard();
      setAnalytics(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    analytics,
    loading,
    error,
    refreshAnalytics: fetchAnalytics
  };
}