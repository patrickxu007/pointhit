import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Match, Point, Set, Game, Player, Tiebreak, TiebreakPoint, MatchFormat, TiebreakType, AIInsights } from '@/types/tennis';

interface LastAction {
  type: 'regular_point' | 'tiebreak_point';
  setIndex: number;
  gameIndex?: number;
  pointId: string;
  gameWasCompleted?: boolean;
  setWasCompleted?: boolean;
  matchWasCompleted?: boolean;
  newGameWasAdded?: boolean;
  newSetWasAdded?: boolean;
  previousMatchState?: {
    isCompleted: boolean;
    endTime?: string;
    totalDuration?: number;
  };
  previousGameState?: {
    playerScore: number;
    opponentScore: number;
    isCompleted: boolean;
  };
  previousSetState?: {
    playerGames: number;
    opponentGames: number;
    isCompleted: boolean;
    tiebreakExists: boolean;
  };
  tiebreakWasCompleted?: boolean;
  previousTiebreakState?: {
    playerPoints: number;
    opponentPoints: number;
    isCompleted: boolean;
  };
}

interface MatchState {
  matches: Match[];
  currentMatch: Match | null;
  players: Player[];
  isLoaded: boolean;
  lastAction: LastAction | null;
  
  // Actions
  addPlayer: (player: Player) => void;
  updatePlayer: (player: Player) => void;
  deletePlayer: (playerId: string) => void;
  createMatch: (match: Match) => void;
  updateMatch: (match: Match) => void;
  deleteMatch: (matchId: string) => void;
  reopenMatch: (matchId: string) => void;
  setCurrentMatch: (matchId: string | null) => void;
  
  // Point tracking
  addPoint: (setIndex: number, gameIndex: number, point: Point) => void;
  undoLastPoint: (setIndex: number, gameIndex: number) => void;
  undoLastAction: () => void;
  completeGame: (setIndex: number, gameIndex: number) => void;
  completeSet: (setIndex: number) => void;
  completeMatch: () => void;
  
  // Tiebreak tracking
  startTiebreak: (setIndex: number, type: TiebreakType) => void;
  addTiebreakPoint: (setIndex: number, point: TiebreakPoint) => void;
  undoLastTiebreakPoint: (setIndex: number) => void;
  completeTiebreak: (setIndex: number) => void;
  
  // Game management
  addGame: (setIndex: number, isPlayerServing: boolean) => void;
  addSet: () => void;
  updateServerForGame: (setIndex: number, gameIndex: number, isPlayerServing: boolean) => void;
  
  // Scoring settings
  toggleNoAdScoring: () => void;
  
  // Time tracking
  startMatchTiming: () => void;
  endMatchTiming: () => void;
  
  // AI Insights
  updateMatchInsights: (matchId: string, insights: AIInsights) => void;
  
  // Comments
  updateMatchComments: (matchId: string, comments: string) => void;
}

// Helper function to check if a player has won a set
function getSetWinner(set: Set): 'player' | 'opponent' | null {
  if (!set.isCompleted) return null;
  
  if (set.tiebreak && set.tiebreak.isCompleted) {
    // For tiebreak sets, winner is determined by tiebreak score
    if (set.tiebreak.playerPoints > set.tiebreak.opponentPoints) {
      return 'player';
    } else if (set.tiebreak.opponentPoints > set.tiebreak.playerPoints) {
      return 'opponent';
    }
  } else {
    // For regular sets, winner is determined by games
    if (set.playerGames > set.opponentGames) {
      return 'player';
    } else if (set.opponentGames > set.playerGames) {
      return 'opponent';
    }
  }
  
  return null;
}

// Helper function to check if match should be completed (best of 3 sets)
function shouldCompleteMatch(sets: Set[]): boolean {
  const completedSets = sets.filter(s => s.isCompleted);
  
  let playerSetsWon = 0;
  let opponentSetsWon = 0;
  
  completedSets.forEach(set => {
    const winner = getSetWinner(set);
    if (winner === 'player') {
      playerSetsWon++;
    } else if (winner === 'opponent') {
      opponentSetsWon++;
    }
  });
  
  // Match is completed when either player wins 2 sets
  return playerSetsWon >= 2 || opponentSetsWon >= 2;
}

// Helper function to check if this is the first point of the match
// Checks both regular game points AND tiebreak points
function isFirstPointOfMatch(match: Match): boolean {
  // Check if any points have been recorded in any set (regular or tiebreak)
  for (const set of match.sets) {
    // Check regular games
    for (const game of set.games) {
      if (game.points.length > 0) {
        return false;
      }
    }
    // Check tiebreak points
    if (set.tiebreak && set.tiebreak.points.length > 0) {
      return false;
    }
  }
  return true;
}

// Helper function to check if this is the first regular point of the match
// Only checks regular game points, NOT tiebreak points
function isFirstRegularPointOfMatch(match: Match): boolean {
  // Check if any regular points have been recorded in any set
  for (const set of match.sets) {
    // Only check regular games, NOT tiebreak points
    for (const game of set.games) {
      if (game.points.length > 0) {
        return false;
      }
    }
  }
  return true;
}

// Create a safe storage wrapper
const safeStorage = {
  getItem: async (name: string) => {
    try {
      return await AsyncStorage.getItem(name);
    } catch (error) {
      console.warn('Failed to load from AsyncStorage:', error);
      return null;
    }
  },
  setItem: async (name: string, value: string) => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch (error) {
      console.warn('Failed to save to AsyncStorage:', error);
    }
  },
  removeItem: async (name: string) => {
    try {
      await AsyncStorage.removeItem(name);
    } catch (error) {
      console.warn('Failed to remove from AsyncStorage:', error);
    }
  }
};

export const useMatchStore = create<MatchState>()(
  persist(
    (set, get) => ({
      matches: [],
      currentMatch: null,
      players: [],
      isLoaded: false,
      lastAction: null,
      
      addPlayer: (player) => set((state) => ({
        players: [...state.players, player]
      })),
      
      updatePlayer: (updatedPlayer) => set((state) => ({
        players: state.players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p),
        // Update player info in matches
        matches: state.matches.map(match => ({
          ...match,
          player: match.player.id === updatedPlayer.id ? updatedPlayer : match.player,
          opponent: match.opponent.id === updatedPlayer.id ? updatedPlayer : match.opponent,
        })),
        // Update current match if needed
        currentMatch: state.currentMatch ? {
          ...state.currentMatch,
          player: state.currentMatch.player.id === updatedPlayer.id ? updatedPlayer : state.currentMatch.player,
          opponent: state.currentMatch.opponent.id === updatedPlayer.id ? updatedPlayer : state.currentMatch.opponent,
        } : null
      })),
      
      deletePlayer: (playerId) => set((state) => ({
        players: state.players.filter(p => p.id !== playerId),
        // Note: We don't delete matches when a player is deleted to preserve match history
      })),
      
      createMatch: (match) => set((state) => ({
        matches: [...state.matches, match],
        currentMatch: match,
        lastAction: null
      })),
      
      updateMatch: (match) => set((state) => ({
        matches: state.matches.map(m => m.id === match.id ? match : m),
        currentMatch: state.currentMatch?.id === match.id ? match : state.currentMatch
      })),
      
      deleteMatch: (matchId) => set((state) => ({
        matches: state.matches.filter(m => m.id !== matchId),
        currentMatch: state.currentMatch?.id === matchId ? null : state.currentMatch,
        lastAction: null
      })),
      
      reopenMatch: (matchId) => set((state) => {
        const updatedMatches = state.matches.map(m => 
          m.id === matchId ? { ...m, isCompleted: false, endTime: undefined, totalDuration: undefined } : m
        );
        
        return {
          matches: updatedMatches,
          currentMatch: state.currentMatch?.id === matchId 
            ? { ...state.currentMatch, isCompleted: false, endTime: undefined, totalDuration: undefined } 
            : state.currentMatch,
          lastAction: null
        };
      }),
      
      setCurrentMatch: (matchId) => set((state) => ({
        currentMatch: matchId ? state.matches.find(m => m.id === matchId) || null : null,
        lastAction: null
      })),
      
      startMatchTiming: () => set((state) => {
        if (!state.currentMatch || state.currentMatch.startTime) return state;
        
        const newMatch = { 
          ...state.currentMatch, 
          startTime: new Date().toISOString() 
        };
        
        return {
          currentMatch: newMatch,
          matches: state.matches.map(m => m.id === newMatch.id ? newMatch : m)
        };
      }),
      
      endMatchTiming: () => set((state) => {
        if (!state.currentMatch || !state.currentMatch.startTime || state.currentMatch.endTime) return state;
        
        const endTime = new Date().toISOString();
        const startTime = new Date(state.currentMatch.startTime);
        const totalDuration = new Date(endTime).getTime() - startTime.getTime();
        
        const newMatch = { 
          ...state.currentMatch, 
          endTime,
          totalDuration
        };
        
        return {
          currentMatch: newMatch,
          matches: state.matches.map(m => m.id === newMatch.id ? newMatch : m)
        };
      }),
      
      updateMatchInsights: (matchId, insights) => set((state) => {
        const updatedMatches = state.matches.map(m => 
          m.id === matchId ? { ...m, aiInsights: insights } : m
        );
        
        return {
          matches: updatedMatches,
          currentMatch: state.currentMatch?.id === matchId 
            ? { ...state.currentMatch, aiInsights: insights } 
            : state.currentMatch
        };
      }),
      
      updateMatchComments: (matchId, comments) => set((state) => {
        const updatedMatches = state.matches.map(m => 
          m.id === matchId ? { ...m, comments } : m
        );
        
        return {
          matches: updatedMatches,
          currentMatch: state.currentMatch?.id === matchId 
            ? { ...state.currentMatch, comments } 
            : state.currentMatch
        };
      }),
      
      startTiebreak: (setIndex, type) => set((state) => {
        if (!state.currentMatch) return state;
        
        const newMatch = { ...state.currentMatch };
        const sets = [...newMatch.sets];
        const set = { ...sets[setIndex] };
        
        const tiebreak: Tiebreak = {
          id: Date.now().toString(),
          playerPoints: 0,
          opponentPoints: 0,
          points: [],
          isCompleted: false,
          type: type
        };
        
        set.tiebreak = tiebreak;
        sets[setIndex] = set;
        newMatch.sets = sets;
        
        return {
          currentMatch: newMatch,
          matches: state.matches.map(m => m.id === newMatch.id ? newMatch : m)
        };
      }),
      
      addTiebreakPoint: (setIndex, point) => set((state) => {
        if (!state.currentMatch) return state;
        
        const newMatch = { ...state.currentMatch };
        
        // Start timing if this is the first point of the match (including tiebreak points)
        // Timing should start with the first point regardless of whether it's regular or tiebreak
        if (isFirstPointOfMatch(newMatch) && !newMatch.startTime) {
          newMatch.startTime = new Date().toISOString();
        }
        
        const sets = [...newMatch.sets];
        
        // Safety check for set existence
        if (!sets[setIndex]) return state;
        
        const set = { ...sets[setIndex] };
        const tiebreak = set.tiebreak;
        
        if (!tiebreak) return state;
        
        const newTiebreak = { ...tiebreak };
        
        // Store previous states for undo
        const previousTiebreakState = {
          playerPoints: newTiebreak.playerPoints,
          opponentPoints: newTiebreak.opponentPoints,
          isCompleted: newTiebreak.isCompleted || false
        };
        
        const previousSetState = {
          playerGames: set.playerGames,
          opponentGames: set.opponentGames,
          isCompleted: set.isCompleted || false,
          tiebreakExists: !!set.tiebreak
        };
        
        const previousMatchState = {
          isCompleted: newMatch.isCompleted || false,
          endTime: newMatch.endTime,
          totalDuration: newMatch.totalDuration
        };
        
        newTiebreak.points = [...newTiebreak.points, point];
        
        // Update tiebreak score
        if (point.isPlayerPoint) {
          newTiebreak.playerPoints += 1;
        } else {
          newTiebreak.opponentPoints += 1;
        }
        
        // Track state changes for undo
        let setWasCompleted = false;
        let matchWasCompleted = false;
        let newSetWasAdded = false;
        let tiebreakWasCompleted = false;
        
        // Always update the tiebreak in the set
        set.tiebreak = newTiebreak;
        
        // Check if tiebreak is completed
        const minPointsToWin = getTiebreakMinPoints(newTiebreak.type);
        if ((newTiebreak.playerPoints >= minPointsToWin && newTiebreak.playerPoints - newTiebreak.opponentPoints >= 2) ||
            (newTiebreak.opponentPoints >= minPointsToWin && newTiebreak.opponentPoints - newTiebreak.playerPoints >= 2)) {
          newTiebreak.isCompleted = true;
          tiebreakWasCompleted = true;
          setWasCompleted = true;
          
          // For third set tiebreak, use tiebreak score as set score
          const completedSets = newMatch.sets.filter(s => s.isCompleted).length;
          if (completedSets === 2) {
            // This is the third set
            set.playerGames = newTiebreak.playerPoints;
            set.opponentGames = newTiebreak.opponentPoints;
          } else {
            // Regular tiebreak - winner gets the game
            if (newTiebreak.playerPoints > newTiebreak.opponentPoints) {
              set.playerGames += 1;
            } else {
              set.opponentGames += 1;
            }
          }
          
          set.isCompleted = true;
          
          // Check if this completes the match
          sets[setIndex] = set;
          newMatch.sets = sets;
          
          if (shouldCompleteMatch(newMatch.sets)) {
            newMatch.isCompleted = true;
            matchWasCompleted = true;
            
            // End timing when match is completed via tiebreak
            if (newMatch.startTime && !newMatch.endTime) {
              const endTime = new Date().toISOString();
              const startTime = new Date(newMatch.startTime);
              const totalDuration = new Date(endTime).getTime() - startTime.getTime();
              
              newMatch.endTime = endTime;
              newMatch.totalDuration = totalDuration;
            }
          } else {
            // Add new set if match is not completed
            const newSet: Set = {
              id: Date.now().toString(),
              playerGames: 0,
              opponentGames: 0,
              games: [],
              isCompleted: false,
            };
            
            // Add initial game to the new set
            const newGame: Game = {
              id: Date.now().toString(),
              playerScore: 0,
              opponentScore: 0,
              isPlayerServing: true, // Default to player serving
              points: [],
              isCompleted: false
            };
            newSet.games = [newGame];
            
            newMatch.sets = [...newMatch.sets, newSet];
            newSetWasAdded = true;
          }
        }
        
        sets[setIndex] = set;
        newMatch.sets = sets;
        
        // Store last action for undo
        const lastAction: LastAction = {
          type: 'tiebreak_point',
          setIndex,
          pointId: point.id,
          setWasCompleted,
          matchWasCompleted,
          newSetWasAdded,
          tiebreakWasCompleted,
          previousMatchState,
          previousSetState,
          previousTiebreakState
        };
        
        return {
          currentMatch: newMatch,
          matches: state.matches.map(m => m.id === newMatch.id ? newMatch : m),
          lastAction
        };
      }),
      
      undoLastTiebreakPoint: (setIndex) => set((state) => {
        if (!state.currentMatch || !state.lastAction || state.lastAction.type !== 'tiebreak_point') return state;
        
        const newMatch = { ...state.currentMatch };
        const sets = [...newMatch.sets];
        
        // Safety check for set existence
        if (!sets[setIndex]) return state;
        
        const set = { ...sets[setIndex] };
        const tiebreak = set.tiebreak;
        
        if (!tiebreak || tiebreak.points.length === 0) return state;
        
        // Get the last point
        const lastPoint = tiebreak.points[tiebreak.points.length - 1];
        
        // Remove the last point
        const newTiebreak = { ...tiebreak };
        newTiebreak.points = newTiebreak.points.slice(0, -1);
        
        // Update tiebreak score
        if (lastPoint.isPlayerPoint) {
          newTiebreak.playerPoints -= 1;
        } else {
          newTiebreak.opponentPoints -= 1;
        }
        
        // Reverse state changes based on last action
        const lastAction = state.lastAction;
        
        if (lastAction.setWasCompleted) {
          // Reverse set completion
          newTiebreak.isCompleted = false;
          set.isCompleted = false;
          
          // Reverse game score changes
          const completedSets = newMatch.sets.filter(s => s.isCompleted).length;
          if (completedSets === 2) {
            // This was the third set - restore games to 0
            set.playerGames = 0;
            set.opponentGames = 0;
          } else {
            // Regular tiebreak - remove the game win
            if (lastPoint.isPlayerPoint) {
              set.playerGames -= 1;
            } else {
              set.opponentGames -= 1;
            }
          }
        }
        
        if (lastAction.matchWasCompleted) {
          // Reverse match completion and timing
          newMatch.isCompleted = lastAction.previousMatchState?.isCompleted || false;
          newMatch.endTime = lastAction.previousMatchState?.endTime;
          newMatch.totalDuration = lastAction.previousMatchState?.totalDuration;
        }
        
        if (lastAction.newSetWasAdded) {
          // Remove the last set that was added
          newMatch.sets = newMatch.sets.slice(0, -1);
        }
        
        set.tiebreak = newTiebreak;
        sets[setIndex] = set;
        newMatch.sets = sets;
        
        return {
          currentMatch: newMatch,
          matches: state.matches.map(m => m.id === newMatch.id ? newMatch : m),
          lastAction: null
        };
      }),
      
      completeTiebreak: (setIndex) => set((state) => {
        if (!state.currentMatch) return state;
        
        const newMatch = { ...state.currentMatch };
        const sets = [...newMatch.sets];
        
        // Safety check for set existence
        if (!sets[setIndex]) return state;
        
        const set = { ...sets[setIndex] };
        
        if (set.tiebreak) {
          set.tiebreak.isCompleted = true;
          set.isCompleted = true;
          
          // Check if this completes the match
          sets[setIndex] = set;
          newMatch.sets = sets;
          
          if (shouldCompleteMatch(newMatch.sets)) {
            newMatch.isCompleted = true;
            
            // End timing when match is completed
            if (newMatch.startTime && !newMatch.endTime) {
              const endTime = new Date().toISOString();
              const startTime = new Date(newMatch.startTime);
              const totalDuration = new Date(endTime).getTime() - startTime.getTime();
              
              newMatch.endTime = endTime;
              newMatch.totalDuration = totalDuration;
            }
          }
        }
        
        return {
          currentMatch: newMatch,
          matches: state.matches.map(m => m.id === newMatch.id ? newMatch : m)
        };
      }),
      
      addPoint: (setIndex, gameIndex, point) => set((state) => {
        if (!state.currentMatch) return state;
        
        const newMatch = { ...state.currentMatch };
        
        // Start timing if this is the first REGULAR point of the match and timing hasn't started
        if (isFirstRegularPointOfMatch(newMatch) && !newMatch.startTime) {
          newMatch.startTime = new Date().toISOString();
        }
        
        const sets = [...newMatch.sets];
        
        // Safety check for set existence
        if (!sets[setIndex]) return state;
        
        const set = { ...sets[setIndex] };
        const games = [...set.games];
        
        // Safety check for game existence
        if (!games[gameIndex]) return state;
        
        const game = { ...games[gameIndex] };
        
        // Store previous states for undo
        const previousGameState = {
          playerScore: game.playerScore,
          opponentScore: game.opponentScore,
          isCompleted: game.isCompleted || false
        };
        
        const previousSetState = {
          playerGames: set.playerGames,
          opponentGames: set.opponentGames,
          isCompleted: set.isCompleted || false,
          tiebreakExists: !!set.tiebreak
        };
        
        const previousMatchState = {
          isCompleted: newMatch.isCompleted || false,
          endTime: newMatch.endTime,
          totalDuration: newMatch.totalDuration
        };
        
        // Track state before changes for undo
        let gameWasCompleted = false;
        let setWasCompleted = false;
        let matchWasCompleted = false;
        let newGameWasAdded = false;
        let newSetWasAdded = false;
        
        // Add point to the game
        game.points = [...game.points, point];
        
        // Update score based on point
        if (point.isPlayerPoint) {
          if (game.playerScore === 0) game.playerScore = 15;
          else if (game.playerScore === 15) game.playerScore = 30;
          else if (game.playerScore === 30) game.playerScore = 40;
          else if (game.playerScore === 40) {
            // Check for No Ad scoring
            if (newMatch.isNoAdScoring && game.opponentScore === 40) {
              // In No Ad scoring, winning at deuce immediately ends the game
              game.playerScore = 0;
              game.opponentScore = 0;
              game.isCompleted = true;
              gameWasCompleted = true;
              
              // Update set score immediately
              set.playerGames += 1;
            } else if (game.opponentScore < 40) {
              // Regular win
              game.playerScore = 0;
              game.opponentScore = 0;
              game.isCompleted = true;
              gameWasCompleted = true;
              
              // Update set score immediately
              set.playerGames += 1;
            } else if (game.opponentScore === 40) {
              // Deuce to advantage (only in regular scoring)
              game.playerScore = 45; // Advantage
            } else if (game.opponentScore === 45) {
              // Back to deuce
              game.playerScore = 40;
              game.opponentScore = 40;
            }
          } else if (game.playerScore === 45) {
            // Win after advantage
            game.playerScore = 0;
            game.opponentScore = 0;
            game.isCompleted = true;
            gameWasCompleted = true;
            
            // Update set score immediately
            set.playerGames += 1;
          }
        } else {
          if (game.opponentScore === 0) game.opponentScore = 15;
          else if (game.opponentScore === 15) game.opponentScore = 30;
          else if (game.opponentScore === 30) game.opponentScore = 40;
          else if (game.opponentScore === 40) {
            // Check for No Ad scoring
            if (newMatch.isNoAdScoring && game.playerScore === 40) {
              // In No Ad scoring, winning at deuce immediately ends the game
              game.playerScore = 0;
              game.opponentScore = 0;
              game.isCompleted = true;
              gameWasCompleted = true;
              
              // Update set score immediately
              set.opponentGames += 1;
            } else if (game.playerScore < 40) {
              // Regular win
              game.playerScore = 0;
              game.opponentScore = 0;
              game.isCompleted = true;
              gameWasCompleted = true;
              
              // Update set score immediately
              set.opponentGames += 1;
            } else if (game.playerScore === 40) {
              // Deuce to advantage (only in regular scoring)
              game.opponentScore = 45; // Advantage
            } else if (game.playerScore === 45) {
              // Back to deuce
              game.playerScore = 40;
              game.opponentScore = 40;
            }
          } else if (game.opponentScore === 45) {
            // Win after advantage
            game.playerScore = 0;
            game.opponentScore = 0;
            game.isCompleted = true;
            gameWasCompleted = true;
            
            // Update set score immediately
            set.opponentGames += 1;
          }
        }
        
        // Check if set is completed or needs tiebreak
        const playerGames = set.playerGames;
        const opponentGames = set.opponentGames;
        
        if (newMatch.matchFormat === MatchFormat.SHORT_SET) {
          // Short set: First to 4 games with 2-game lead, tiebreak at 3-3
          if ((playerGames >= 4 && playerGames - opponentGames >= 2) || 
              (opponentGames >= 4 && opponentGames - playerGames >= 2)) {
            set.isCompleted = true;
            setWasCompleted = true;
          } else if (playerGames === 3 && opponentGames === 3) {
            // Start 5-point tiebreak
            const tiebreak: Tiebreak = {
              id: Date.now().toString(),
              playerPoints: 0,
              opponentPoints: 0,
              points: [],
              isCompleted: false,
              type: TiebreakType.FIVE_POINT
            };
            set.tiebreak = tiebreak;
          }
        } else {
          // Regular set: First to 6 games with 2-game lead, tiebreak at 6-6
          if ((playerGames >= 6 && playerGames - opponentGames >= 2) || 
              (opponentGames >= 6 && opponentGames - playerGames >= 2)) {
            set.isCompleted = true;
            setWasCompleted = true;
          } else if (playerGames === 6 && opponentGames === 6) {
            // Start 7-point tiebreak
            const tiebreak: Tiebreak = {
              id: Date.now().toString(),
              playerPoints: 0,
              opponentPoints: 0,
              points: [],
              isCompleted: false,
              type: TiebreakType.SEVEN_POINT
            };
            set.tiebreak = tiebreak;
          }
        }
        
        games[gameIndex] = game;
        set.games = games;
        sets[setIndex] = set;
        newMatch.sets = sets;
        
        // If the game is completed and set is not completed and no tiebreak, automatically add a new game
        if (game.isCompleted && !set.isCompleted && !set.tiebreak) {
          // Create a new game with the opposite server
          const newGame: Game = {
            id: Date.now().toString(),
            playerScore: 0,
            opponentScore: 0,
            isPlayerServing: !game.isPlayerServing, // Switch server
            points: [],
            isCompleted: false
          };
          
          // Add the new game to the set
          set.games.push(newGame);
          sets[setIndex] = set;
          newMatch.sets = sets;
          newGameWasAdded = true;
        }
        
        // If the set is completed, check if match should be completed or add new set
        if (setWasCompleted) {
          sets[setIndex] = set;
          newMatch.sets = sets;
          
          // Check if this completes the match (player won 2 sets)
          if (shouldCompleteMatch(newMatch.sets)) {
            newMatch.isCompleted = true;
            matchWasCompleted = true;
            
            // End timing when match is completed via regular game
            if (newMatch.startTime && !newMatch.endTime) {
              const endTime = new Date().toISOString();
              const startTime = new Date(newMatch.startTime);
              const totalDuration = new Date(endTime).getTime() - startTime.getTime();
              
              newMatch.endTime = endTime;
              newMatch.totalDuration = totalDuration;
            }
          } else {
            // Add a new set if match is not completed
            // Determine if this should be a special third set
            const completedSets = newMatch.sets.filter(s => s.isCompleted).length;
            let shouldStartTiebreak = false;
            let tiebreakType = TiebreakType.SEVEN_POINT;
            
            if (completedSets === 2) {
              // This is the third set
              if (newMatch.matchFormat === MatchFormat.SHORT_SET) {
                // For short sets, if tied 1-1, third set is a 5-point tiebreak
                const playerSetsWon = newMatch.sets.filter(s => getSetWinner(s) === 'player').length;
                const opponentSetsWon = newMatch.sets.filter(s => getSetWinner(s) === 'opponent').length;
                
                if (playerSetsWon === 1 && opponentSetsWon === 1) {
                  shouldStartTiebreak = true;
                  tiebreakType = TiebreakType.FIVE_POINT;
                }
              } else if (newMatch.thirdSetTiebreakType === TiebreakType.TEN_POINT) {
                // For regular sets with 10-point third set option
                shouldStartTiebreak = true;
                tiebreakType = TiebreakType.TEN_POINT;
              }
            }
            
            const newSet: Set = {
              id: Date.now().toString(),
              playerGames: 0,
              opponentGames: 0,
              games: [],
              isCompleted: false,
            };
            
            if (shouldStartTiebreak) {
              const tiebreak: Tiebreak = {
                id: Date.now().toString(),
                playerPoints: 0,
                opponentPoints: 0,
                points: [],
                isCompleted: false,
                type: tiebreakType
              };
              newSet.tiebreak = tiebreak;
            } else {
              // Add initial game to the new set with alternating server
              const newGame: Game = {
                id: Date.now().toString(),
                playerScore: 0,
                opponentScore: 0,
                isPlayerServing: !game.isPlayerServing, // Switch server from the last game
                points: [],
                isCompleted: false
              };
              newSet.games = [newGame];
            }
            
            newMatch.sets = [...newMatch.sets, newSet];
            newSetWasAdded = true;
          }
        }
        
        // Store last action for undo
        const lastAction: LastAction = {
          type: 'regular_point',
          setIndex,
          gameIndex,
          pointId: point.id,
          gameWasCompleted,
          setWasCompleted,
          matchWasCompleted,
          newGameWasAdded,
          newSetWasAdded,
          previousMatchState,
          previousGameState,
          previousSetState
        };
        
        return {
          currentMatch: newMatch,
          matches: state.matches.map(m => m.id === newMatch.id ? newMatch : m),
          lastAction
        };
      }),
      
      undoLastPoint: (setIndex, gameIndex) => set((state) => {
        if (!state.currentMatch) return state;
        
        const newMatch = { ...state.currentMatch };
        const sets = [...newMatch.sets];
        
        // Safety check for set existence
        if (!sets[setIndex]) return state;
        
        const set = { ...sets[setIndex] };
        const games = [...set.games];
        
        // Safety check for game existence
        if (!games[gameIndex]) return state;
        
        const game = { ...games[gameIndex] };
        
        // Check if there are points to undo
        if (game.points.length === 0) return state;
        
        // Get the last point
        const lastPoint = game.points[game.points.length - 1];
        
        // Remove the last point
        game.points = game.points.slice(0, -1);
        
        // Reverse the score change
        if (lastPoint.isPlayerPoint) {
          // Undo player point
          if (game.playerScore === 15) game.playerScore = 0;
          else if (game.playerScore === 30) game.playerScore = 15;
          else if (game.playerScore === 40) game.playerScore = 30;
          else if (game.playerScore === 45) game.playerScore = 40; // From advantage back to 40
          else if (game.playerScore === 0 && game.isCompleted) {
            // Game was completed by this point, need to restore previous score
            game.playerScore = 40;
            game.isCompleted = false;
            set.playerGames -= 1; // Undo the game win
          }
        } else {
          // Undo opponent point
          if (game.opponentScore === 15) game.opponentScore = 0;
          else if (game.opponentScore === 30) game.opponentScore = 15;
          else if (game.opponentScore === 40) game.opponentScore = 30;
          else if (game.opponentScore === 45) game.opponentScore = 40; // From advantage back to 40
          else if (game.opponentScore === 0 && game.isCompleted) {
            // Game was completed by this point, need to restore previous score
            game.opponentScore = 40;
            game.isCompleted = false;
            set.opponentGames -= 1; // Undo the game win
          }
        }
        
        games[gameIndex] = game;
        set.games = games;
        sets[setIndex] = set;
        newMatch.sets = sets;
        
        return {
          currentMatch: newMatch,
          matches: state.matches.map(m => m.id === newMatch.id ? newMatch : m)
        };
      }),
      
      undoLastAction: () => set((state) => {
        if (!state.currentMatch || !state.lastAction) return state;
        
        const lastAction = state.lastAction;
        const newMatch = { ...state.currentMatch };
        let sets = [...newMatch.sets];
        
        if (lastAction.type === 'regular_point') {
          // Undo regular point
          const setIndex = lastAction.setIndex;
          const gameIndex = lastAction.gameIndex!;
          
          // Handle new set removal first
          if (lastAction.newSetWasAdded) {
            sets = sets.slice(0, -1);
            newMatch.sets = sets;
          }
          
          if (!sets[setIndex]) return state;
          
          const set = { ...sets[setIndex] };
          let games = [...set.games];
          
          // Handle new game removal
          if (lastAction.newGameWasAdded && !lastAction.newSetWasAdded) {
            games = games.slice(0, -1);
            set.games = games;
          }
          
          if (!games[gameIndex]) return state;
          
          const game = { ...games[gameIndex] };
          
          // Find and remove the point
          const pointIndex = game.points.findIndex(p => p.id === lastAction.pointId);
          if (pointIndex === -1) return state;
          
          game.points = game.points.filter(p => p.id !== lastAction.pointId);
          
          // Restore previous game state
          if (lastAction.previousGameState) {
            game.playerScore = lastAction.previousGameState.playerScore;
            game.opponentScore = lastAction.previousGameState.opponentScore;
            game.isCompleted = lastAction.previousGameState.isCompleted;
          }
          
          // Restore previous set state
          if (lastAction.previousSetState) {
            set.playerGames = lastAction.previousSetState.playerGames;
            set.opponentGames = lastAction.previousSetState.opponentGames;
            set.isCompleted = lastAction.previousSetState.isCompleted;
            
            // Handle tiebreak restoration
            if (!lastAction.previousSetState.tiebreakExists && set.tiebreak) {
              set.tiebreak = undefined;
            }
          }
          
          // Restore previous match state
          if (lastAction.previousMatchState) {
            newMatch.isCompleted = lastAction.previousMatchState.isCompleted;
            newMatch.endTime = lastAction.previousMatchState.endTime;
            newMatch.totalDuration = lastAction.previousMatchState.totalDuration;
          }
          
          games[gameIndex] = game;
          set.games = games;
          sets[setIndex] = set;
          newMatch.sets = sets;
          
        } else if (lastAction.type === 'tiebreak_point') {
          // Undo tiebreak point
          const setIndex = lastAction.setIndex;
          
          // Handle new set removal first
          if (lastAction.newSetWasAdded) {
            sets = sets.slice(0, -1);
            newMatch.sets = sets;
          }
          
          if (!sets[setIndex] || !sets[setIndex].tiebreak) return state;
          
          const set = { ...sets[setIndex] };
          const tiebreak = { ...set.tiebreak! };
          
          // Find and remove the point
          const pointIndex = tiebreak.points.findIndex(p => p.id === lastAction.pointId);
          if (pointIndex === -1) return state;
          
          tiebreak.points = tiebreak.points.filter(p => p.id !== lastAction.pointId);
          
          // Restore previous tiebreak state
          if (lastAction.previousTiebreakState) {
            tiebreak.playerPoints = lastAction.previousTiebreakState.playerPoints;
            tiebreak.opponentPoints = lastAction.previousTiebreakState.opponentPoints;
            tiebreak.isCompleted = lastAction.previousTiebreakState.isCompleted;
          }
          
          // Restore previous set state
          if (lastAction.previousSetState) {
            set.playerGames = lastAction.previousSetState.playerGames;
            set.opponentGames = lastAction.previousSetState.opponentGames;
            set.isCompleted = lastAction.previousSetState.isCompleted;
          }
          
          // Restore previous match state
          if (lastAction.previousMatchState) {
            newMatch.isCompleted = lastAction.previousMatchState.isCompleted;
            newMatch.endTime = lastAction.previousMatchState.endTime;
            newMatch.totalDuration = lastAction.previousMatchState.totalDuration;
          }
          
          set.tiebreak = tiebreak;
          sets[setIndex] = set;
          newMatch.sets = sets;
        }
        
        return {
          currentMatch: newMatch,
          matches: state.matches.map(m => m.id === newMatch.id ? newMatch : m),
          lastAction: null
        };
      }),
      
      completeGame: (setIndex, gameIndex) => set((state) => {
        if (!state.currentMatch) return state;
        
        const newMatch = { ...state.currentMatch };
        const sets = [...newMatch.sets];
        
        // Safety check for set existence
        if (!sets[setIndex]) return state;
        
        const set = { ...sets[setIndex] };
        const games = [...set.games];
        
        // Safety check for game existence
        if (!games[gameIndex]) return state;
        
        const game = { ...games[gameIndex], isCompleted: true };
        
        games[gameIndex] = game;
        set.games = games;
        sets[setIndex] = set;
        newMatch.sets = sets;
        
        return {
          currentMatch: newMatch,
          matches: state.matches.map(m => m.id === newMatch.id ? newMatch : m)
        };
      }),
      
      completeSet: (setIndex) => set((state) => {
        if (!state.currentMatch) return state;
        
        const newMatch = { ...state.currentMatch };
        const sets = [...newMatch.sets];
        
        // Safety check for set existence
        if (!sets[setIndex]) return state;
        
        const set = { ...sets[setIndex], isCompleted: true };
        
        sets[setIndex] = set;
        newMatch.sets = sets;
        
        // Check if this completes the match
        if (shouldCompleteMatch(newMatch.sets)) {
          newMatch.isCompleted = true;
          
          // End timing when match is completed
          if (newMatch.startTime && !newMatch.endTime) {
            const endTime = new Date().toISOString();
            const startTime = new Date(newMatch.startTime);
            const totalDuration = new Date(endTime).getTime() - startTime.getTime();
            
            newMatch.endTime = endTime;
            newMatch.totalDuration = totalDuration;
          }
        }
        
        return {
          currentMatch: newMatch,
          matches: state.matches.map(m => m.id === newMatch.id ? newMatch : m)
        };
      }),
      
      completeMatch: () => set((state) => {
        if (!state.currentMatch) return state;
        
        const newMatch = { ...state.currentMatch };
        
        // Remove empty games before completing the match
        newMatch.sets = newMatch.sets.map(set => ({
          ...set,
          games: set.games.filter(game => game.points.length > 0)
        }));
        
        newMatch.isCompleted = true;
        
        // End timing if not already ended
        if (newMatch.startTime && !newMatch.endTime) {
          const endTime = new Date().toISOString();
          const startTime = new Date(newMatch.startTime);
          const totalDuration = new Date(endTime).getTime() - startTime.getTime();
          
          newMatch.endTime = endTime;
          newMatch.totalDuration = totalDuration;
        }
        
        return {
          currentMatch: newMatch,
          matches: state.matches.map(m => m.id === newMatch.id ? newMatch : m),
          lastAction: null
        };
      }),
      
      addGame: (setIndex, isPlayerServing) => set((state) => {
        if (!state.currentMatch) return state;
        
        const newMatch = { ...state.currentMatch };
        const sets = [...newMatch.sets];
        
        // Safety check for set existence
        if (!sets[setIndex]) return state;
        
        const set = { ...sets[setIndex] };
        
        const newGame: Game = {
          id: Date.now().toString(),
          playerScore: 0,
          opponentScore: 0,
          isPlayerServing,
          points: [],
          isCompleted: false
        };
        
        set.games = [...set.games, newGame];
        sets[setIndex] = set;
        newMatch.sets = sets;
        
        return {
          currentMatch: newMatch,
          matches: state.matches.map(m => m.id === newMatch.id ? newMatch : m)
        };
      }),
      
      addSet: () => set((state) => {
        if (!state.currentMatch) return state;
        
        const newMatch = { ...state.currentMatch };
        
        // Check if match should be completed before adding new set
        if (shouldCompleteMatch(newMatch.sets)) {
          newMatch.isCompleted = true;
          return {
            currentMatch: newMatch,
            matches: state.matches.map(m => m.id === newMatch.id ? newMatch : m)
          };
        }
        
        const completedSets = newMatch.sets.filter(s => s.isCompleted).length;
        
        // Don't add more than 3 sets
        if (completedSets >= 3) return state;
        
        // Determine if this should be a special third set
        let shouldStartTiebreak = false;
        let tiebreakType = TiebreakType.SEVEN_POINT;
        
        if (completedSets === 2) {
          // This is the third set
          if (newMatch.matchFormat === MatchFormat.SHORT_SET) {
            // For short sets, if tied 1-1, third set is a 5-point tiebreak
            const playerSetsWon = newMatch.sets.filter(s => getSetWinner(s) === 'player').length;
            const opponentSetsWon = newMatch.sets.filter(s => getSetWinner(s) === 'opponent').length;
            
            if (playerSetsWon === 1 && opponentSetsWon === 1) {
              shouldStartTiebreak = true;
              tiebreakType = TiebreakType.FIVE_POINT;
            }
          } else if (newMatch.thirdSetTiebreakType === TiebreakType.TEN_POINT) {
            // For regular sets with 10-point third set option
            shouldStartTiebreak = true;
            tiebreakType = TiebreakType.TEN_POINT;
          }
        }
        
        const newSet: Set = {
          id: Date.now().toString(),
          playerGames: 0,
          opponentGames: 0,
          games: [],
          isCompleted: false,
        };
        
        if (shouldStartTiebreak) {
          const tiebreak: Tiebreak = {
            id: Date.now().toString(),
            playerPoints: 0,
            opponentPoints: 0,
            points: [],
            isCompleted: false,
            type: tiebreakType
          };
          newSet.tiebreak = tiebreak;
        }
        
        newMatch.sets = [...newMatch.sets, newSet];
        
        return {
          currentMatch: newMatch,
          matches: state.matches.map(m => m.id === newMatch.id ? newMatch : m)
        };
      }),
      
      updateServerForGame: (setIndex, gameIndex, isPlayerServing) => set((state) => {
        if (!state.currentMatch) return state;
        
        const newMatch = { ...state.currentMatch };
        const sets = [...newMatch.sets];
        
        // Safety check for set existence
        if (!sets[setIndex]) return state;
        
        const set = { ...sets[setIndex] };
        const games = [...set.games];
        
        // Safety check for game existence
        if (!games[gameIndex]) return state;
        
        const game = { ...games[gameIndex], isPlayerServing };
        
        games[gameIndex] = game;
        set.games = games;
        sets[setIndex] = set;
        newMatch.sets = sets;
        
        return {
          currentMatch: newMatch,
          matches: state.matches.map(m => m.id === newMatch.id ? newMatch : m)
        };
      }),
      
      toggleNoAdScoring: () => set((state) => {
        if (!state.currentMatch) return state;
        
        const newMatch = { 
          ...state.currentMatch,
          isNoAdScoring: !state.currentMatch.isNoAdScoring
        };
        
        return {
          currentMatch: newMatch,
          matches: state.matches.map(m => m.id === newMatch.id ? newMatch : m)
        };
      })
    }),
    {
      name: 'tennis-match-storage',
      storage: createJSONStorage(() => safeStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isLoaded = true;
        }
      }
    }
  )
);

function getTiebreakMinPoints(type: TiebreakType): number {
  switch (type) {
    case TiebreakType.FIVE_POINT:
      return 5;
    case TiebreakType.SEVEN_POINT:
      return 7;
    case TiebreakType.TEN_POINT:
      return 10;
    default:
      return 7;
  }
}