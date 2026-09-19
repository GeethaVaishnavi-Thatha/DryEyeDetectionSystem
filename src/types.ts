export type TabId = 'home' | 'monitoring' | 'dashboard' | 'exercises' | 'about' | 'future';

export interface SessionHistory {
  timestamp: string;
  ear: number;
  blinkRate: number;
  screenTime: number;
  status: string;
  riskLevel: string;
}
