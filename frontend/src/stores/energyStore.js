import { create } from 'zustand';

export const useEnergyStore = create((set, get) => ({
  readings: [],
  latestReading: null,
  dailyStats: [],
  summaryStats: null,
  isLoading: false,
  error: null,

  setReadings: (readings) => set({ 
    readings, 
    latestReading: readings[0] || null 
  }),

  addReading: (reading) => set((state) => {
    const updatedReadings = [reading, ...state.readings].slice(0, 100);
    return {
      readings: updatedReadings,
      latestReading: reading,
    };
  }),

  setDailyStats: (dailyStats) => set({ dailyStats }),
  setSummaryStats: (summaryStats) => set({ summaryStats }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  getHourlyData: () => {
    const readings = get().readings;
    return readings.slice(0, 24).reverse();
  },
}));