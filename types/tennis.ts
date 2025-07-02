export interface Player {
  id: string;
  name: string;
  avatar?: string;
  createdAt?: string;
}

export interface ServeData {
  isFirstServeIn: boolean;
  isSecondServeIn?: boolean;
  isDoubleFault: boolean;
}

export enum ShotType {
  NONE = 'none',
  FOREHAND = 'forehand',
  BACKHAND = 'backhand',
  VOLLEY = 'volley',
  DROPSHOT = 'dropshot',
  OVERHEAD = 'overhead',
  LOB = 'lob',
  ACE = 'ace',
  SLICE = 'slice',
  SERVE_UNRETURNED = 'serve_unreturned',
  OPPONENT_UNFORCED_ERROR = 'opponent_unforced_error',
  FOREHAND_WINNER = 'forehand_winner',
  BACKHAND_WINNER = 'backhand_winner',
  VOLLEY_WINNER = 'volley_winner',
  DROPSHOT_WINNER = 'dropshot_winner',
  OVERHEAD_WINNER = 'overhead_winner',
  LOB_WINNER = 'lob_winner',
  SLICE_WINNER = 'slice_winner',
  FOREHAND_UNRETURNED = 'forehand_unreturned',
  BACKHAND_UNRETURNED = 'backhand_unreturned',
  VOLLEY_UNRETURNED = 'volley_unreturned',
  DROPSHOT_UNRETURNED = 'dropshot_unreturned',
  OVERHEAD_UNRETURNED = 'overhead_unreturned',
  LOB_UNRETURNED = 'lob_unreturned',
  SLICE_UNRETURNED = 'slice_unreturned',
}

export enum ErrorType {
  NONE = 'none',
  FOREHAND_UNFORCED = 'forehand_unforced',
  BACKHAND_UNFORCED = 'backhand_unforced',
  VOLLEY_UNFORCED = 'volley_unforced',
  DROPSHOT_UNFORCED = 'dropshot_unforced',
  OVERHEAD_UNFORCED = 'overhead_unforced',
  SLICE_UNFORCED = 'slice_unforced',
  LOB_UNFORCED = 'lob_unforced',
  FORCED_ERROR = 'forced_error',
}

export enum MatchFormat {
  REGULAR_SET = 'regular_set',
  SHORT_SET = 'short_set',
}

export enum TiebreakType {
  FIVE_POINT = 'five_point',
  SEVEN_POINT = 'seven_point',
  TEN_POINT = 'ten_point',
}

export enum MentalPhysicalState {
  CONFIDENT = 'confident',
  NERVOUS = 'nervous',
  TIRED = 'tired',
  ENERGETIC = 'energetic',
  FOCUSED = 'focused',
  DISTRACTED = 'distracted',
  FRUSTRATED = 'frustrated',
  CALM = 'calm',
  AGGRESSIVE = 'aggressive',
  DEFENSIVE = 'defensive',
}

export interface Point {
  id: string;
  isPlayerPoint: boolean;
  shotType?: ShotType;
  errorType?: ErrorType;
  serveData: ServeData;
  mentalPhysicalStates?: MentalPhysicalState[];
  rallyLength?: number;
  timestamp?: string;
}

export interface TiebreakPoint {
  id: string;
  isPlayerPoint: boolean;
  shotType?: ShotType;
  errorType?: ErrorType;
  serveData: ServeData;
  isPlayerServing?: boolean;
  mentalPhysicalStates?: MentalPhysicalState[];
  rallyLength?: number;
  timestamp?: string;
}

export interface Game {
  id: string;
  isPlayerServing: boolean;
  points: Point[];
  playerScore: number;
  opponentScore: number;
  isCompleted?: boolean;
}

export interface Tiebreak {
  id: string;
  playerPoints: number;
  opponentPoints: number;
  points: TiebreakPoint[];
  isCompleted?: boolean;
  type: TiebreakType;
}

export interface Set {
  id: string;
  playerGames: number;
  opponentGames: number;
  games: Game[];
  tiebreak?: Tiebreak;
  isCompleted?: boolean;
}

export interface AIInsights {
  whatYouDidWell: string[];
  areasToImprove: string[];
  trainingRecommendations: string[];
  overallAssessment: string;
  generatedAt: string;
  llmUsed?: string;
  rawResponse?: string;
}

export interface Match {
  id: string;
  player: Player;
  opponent: Player;
  sets: Set[];
  isCompleted: boolean;
  date: string;
  createdAt: string;
  completedAt?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  totalDuration?: number;
  aiInsights?: AIInsights;
  comments?: string;
  isNoAdScoring?: boolean;
  matchFormat?: MatchFormat;
  thirdSetTiebreakType?: TiebreakType;
}

export function formatEnumValue(value: string): string {
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function formatErrorTypeValue(value: string): string {
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// New function to format error types without "Unforced"
export function formatErrorTypeValueWithoutUnforced(value: string): string {
  return value
    .split('_')
    .filter(word => word.toLowerCase() !== 'unforced') // Remove "unforced" word
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function scoreToString(score: number): string {
  switch (score) {
    case 0:
      return '0';
    case 15:
      return '15';
    case 30:
      return '30';
    case 40:
      return '40';
    case 45:
      return 'Ad';
    default:
      return score.toString();
  }
}

export interface RallyLengthStats {
  shortRallies: {
    total: number;
    won: number;
    winPercentage: number;
    averageLength: number;
  };
  mediumRallies: {
    total: number;
    won: number;
    winPercentage: number;
    averageLength: number;
  };
  longRallies: {
    total: number;
    won: number;
    winPercentage: number;
    averageLength: number;
  };
  averageLength: number;
  totalPointsWithRallyData: number;
  strongestCategory?: 'short' | 'medium' | 'long';
  weakestCategory?: 'short' | 'medium' | 'long';
}

export function calculateRallyLengthStats(points: (Point | TiebreakPoint)[]): RallyLengthStats {
  const pointsWithRallyData = points.filter(point => 
    point.rallyLength !== undefined && point.rallyLength > 0
  );

  if (pointsWithRallyData.length === 0) {
    return {
      shortRallies: { total: 0, won: 0, winPercentage: 0, averageLength: 0 },
      mediumRallies: { total: 0, won: 0, winPercentage: 0, averageLength: 0 },
      longRallies: { total: 0, won: 0, winPercentage: 0, averageLength: 0 },
      averageLength: 0,
      totalPointsWithRallyData: 0
    };
  }

  const shortRallies = pointsWithRallyData.filter(p => p.rallyLength! <= 4);
  const mediumRallies = pointsWithRallyData.filter(p => p.rallyLength! >= 5 && p.rallyLength! <= 9);
  const longRallies = pointsWithRallyData.filter(p => p.rallyLength! >= 10);

  const shortWon = shortRallies.filter(p => p.isPlayerPoint).length;
  const mediumWon = mediumRallies.filter(p => p.isPlayerPoint).length;
  const longWon = longRallies.filter(p => p.isPlayerPoint).length;

  const totalRallyLength = pointsWithRallyData.reduce((sum, point) => sum + (point.rallyLength || 0), 0);
  const averageLength = totalRallyLength / pointsWithRallyData.length;

  // Calculate average length for each category
  const shortAverage = shortRallies.length > 0 
    ? shortRallies.reduce((sum, p) => sum + (p.rallyLength || 0), 0) / shortRallies.length 
    : 0;
  const mediumAverage = mediumRallies.length > 0 
    ? mediumRallies.reduce((sum, p) => sum + (p.rallyLength || 0), 0) / mediumRallies.length 
    : 0;
  const longAverage = longRallies.length > 0 
    ? longRallies.reduce((sum, p) => sum + (p.rallyLength || 0), 0) / longRallies.length 
    : 0;

  const shortWinPercentage = shortRallies.length > 0 ? (shortWon / shortRallies.length) * 100 : 0;
  const mediumWinPercentage = mediumRallies.length > 0 ? (mediumWon / mediumRallies.length) * 100 : 0;
  const longWinPercentage = longRallies.length > 0 ? (longWon / longRallies.length) * 100 : 0;

  // Determine strongest and weakest categories
  const categories = [
    { name: 'short' as const, percentage: shortWinPercentage, total: shortRallies.length },
    { name: 'medium' as const, percentage: mediumWinPercentage, total: mediumRallies.length },
    { name: 'long' as const, percentage: longWinPercentage, total: longRallies.length }
  ].filter(cat => cat.total > 0); // Only consider categories with data

  const strongestCategory = categories.length > 0 
    ? categories.reduce((max, cat) => cat.percentage > max.percentage ? cat : max).name
    : undefined;

  const weakestCategory = categories.length > 0 
    ? categories.reduce((min, cat) => cat.percentage < min.percentage ? cat : min).name
    : undefined;

  return {
    shortRallies: {
      total: shortRallies.length,
      won: shortWon,
      winPercentage: shortWinPercentage,
      averageLength: Math.round(shortAverage * 10) / 10
    },
    mediumRallies: {
      total: mediumRallies.length,
      won: mediumWon,
      winPercentage: mediumWinPercentage,
      averageLength: Math.round(mediumAverage * 10) / 10
    },
    longRallies: {
      total: longRallies.length,
      won: longWon,
      winPercentage: longWinPercentage,
      averageLength: Math.round(longAverage * 10) / 10
    },
    averageLength: Math.round(averageLength * 10) / 10,
    totalPointsWithRallyData: pointsWithRallyData.length,
    strongestCategory,
    weakestCategory
  };
}

export interface MatchRallyAnalysis {
  playerWinsByRallyLength: { [length: number]: number };
  opponentWinsByRallyLength: { [length: number]: number };
  totalPointsByRallyLength: { [length: number]: number };
  correlationInsight: string;
}

export function analyzeMatchRallyCorrelation(match: Match): MatchRallyAnalysis {
  const allPoints = match.sets
    .flatMap(set => [
      ...set.games.flatMap(game => game.points),
      ...(set.tiebreak?.points || [])
    ])
    .filter(point => point.rallyLength && point.rallyLength > 0);

  const playerWinsByRallyLength: { [length: number]: number } = {};
  const opponentWinsByRallyLength: { [length: number]: number } = {};
  const totalPointsByRallyLength: { [length: number]: number } = {};

  allPoints.forEach(point => {
    const length = point.rallyLength!;
    totalPointsByRallyLength[length] = (totalPointsByRallyLength[length] || 0) + 1;
    
    if (point.isPlayerPoint) {
      playerWinsByRallyLength[length] = (playerWinsByRallyLength[length] || 0) + 1;
    } else {
      opponentWinsByRallyLength[length] = (opponentWinsByRallyLength[length] || 0) + 1;
    }
  });

  // Generate correlation insight
  const rallyLengths = Object.keys(totalPointsByRallyLength).map(Number).sort((a, b) => a - b);
  let correlationInsight = "No clear pattern found.";

  if (rallyLengths.length > 0) {
    const shortRallies = rallyLengths.filter(l => l <= 4);
    const longRallies = rallyLengths.filter(l => l >= 10);
    
    const shortWinRate = shortRallies.length > 0 
      ? shortRallies.reduce((sum, l) => sum + (playerWinsByRallyLength[l] || 0), 0) / 
        shortRallies.reduce((sum, l) => sum + totalPointsByRallyLength[l], 0)
      : 0;
    
    const longWinRate = longRallies.length > 0 
      ? longRallies.reduce((sum, l) => sum + (playerWinsByRallyLength[l] || 0), 0) / 
        longRallies.reduce((sum, l) => sum + totalPointsByRallyLength[l], 0)
      : 0;

    if (shortWinRate > 0.6) {
      correlationInsight = "You perform better in short rallies. Focus on aggressive play and finishing points quickly.";
    } else if (longWinRate > 0.6) {
      correlationInsight = "You excel in longer rallies. Your endurance and patience are strengths.";
    } else if (Math.abs(shortWinRate - longWinRate) < 0.1) {
      correlationInsight = "You maintain consistent performance across different rally lengths.";
    }
  }

  return {
    playerWinsByRallyLength,
    opponentWinsByRallyLength,
    totalPointsByRallyLength,
    correlationInsight
  };
}