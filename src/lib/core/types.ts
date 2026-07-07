export type AttendanceValue = 'yes' | 'no' | 'unknown';
export type EventType = 'training' | 'match';
export type Side = 'home' | 'away' | null;

export interface DatasetConfig {
  id: string; displayName: string; season: string; startDate: string; endDate: string; timezone: string;
  rosterPath: string; sportlinkPdfDirectory: string;
  twizzit: { organizationId: number | 'discover'; groupName: string };
  sportlink: { teamName: string };
  classification?: { trainingPatterns?: string[]; matchPatterns?: string[]; nullNameAsTraining?: boolean };
  aliases?: Record<string, string>;
}

export interface RosterPerson { firstName: string; lastName: string; role: string; shirtNumber: string | null }
export interface ParsedSportlinkMatch {
  date: string; time: string | null; homeTeam: string; awayTeam: string; side: Exclude<Side, null>;
  opponent: string; competition: string | null; scoreHome: number | null; scoreAway: number | null;
  players: Array<{ name: string; shirtNumber: string | null; captain: boolean }>;
}

export interface Metric { numerator: number; denominator: number; percentage: number | null }
export interface PlayerMetrics {
  training: Metric; availability: Metric; appearances: Metric; homeAppearances: Metric; awayAppearances: Metric;
  homeAvailability: Metric; awayAvailability: Metric;
  trainingAdmin: Metric; matchAdmin: Metric; overallAdmin: Metric;
}
