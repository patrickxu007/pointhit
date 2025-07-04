import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useMatchStore } from '@/store/matchStore';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { ShotType, ErrorType, Player, Point, TiebreakPoint, Match, Set, Game, formatEnumValue, calculateRallyLengthStats, RallyLengthStats, analyzeMatchRallyCorrelation, MatchRallyAnalysis } from '@/types/tennis';
import BarChart from '@/components/charts/BarChart';
import HorizontalBarChart from '@/components/charts/HorizontalBarChart';
import ProgressChart from '@/components/charts/ProgressChart';
import GroupedBarChart from '@/components/charts/GroupedBarChart';
import PlayerAvatar from '@/components/PlayerAvatar';
import Button from '@/components/Button';
import { ChevronDown, User, Target, TrendingUp, Award, AlertTriangle } from 'lucide-react-native';

export default function StatsScreen() {
  const { matches, players } = useMatchStore();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  
  // Set default selected player to the first player if none selected
  React.useEffect(() => {
    if (!selectedPlayer && players.length > 0) {
      setSelectedPlayer(players[0]);
    }
  }, [players, selectedPlayer]);
  
  // Filter matches for the selected player
  const playerMatches = useMemo(() => {
    if (!selectedPlayer) return [];
    return matches.filter(match => match.player.id === selectedPlayer.id);
  }, [matches, selectedPlayer]);
  
  const stats = useMemo(() => {
    if (playerMatches.length === 0) return null;
    
    let totalMatches = playerMatches.length;
    let completedMatches = playerMatches.filter(m => m.isCompleted).length;
    let matchesWon = 0;
    let totalSets = 0;
    let wonSets = 0;
    let totalGames = 0;
    let wonGames = 0;
    let totalPoints = 0;
    let wonPoints = 0;
    
    let firstServeTotal = 0;
    let firstServeIn = 0;
    let secondServeOpportunities = 0;
    let secondServeIn = 0;
    let doubleFaults = 0;
    let aces = 0;
    
    let winners = {
      forehand: 0,
      backhand: 0,
      volley: 0,
      slice: 0,
      dropshot: 0,
      lob: 0,
      overhead: 0,
      ace: 0,
      serveUnreturned: 0,
    };
    
    let errors = {
      forehandUnforced: 0,
      backhandUnforced: 0,
      volleyUnforced: 0,
      sliceUnforced: 0,
      dropshotUnforced: 0,
      lobUnforced: 0,
      overheadUnforced: 0,
      forcedError: 0,
      doubleFaults: 0,
    };
    
    let rallyLengthTotal = 0;
    let rallyCount = 0;
    
    // Collect all points for rally length analysis
    let allMatchPoints: (Point | TiebreakPoint)[] = [];
    
    playerMatches.forEach(match => {
      // Count match as won if player won more sets than opponent
      const playerSetsWon = match.sets.filter(set => set.playerGames > set.opponentGames).length;
      const opponentSetsWon = match.sets.filter(set => set.opponentGames > set.playerGames).length;
      
      if (playerSetsWon > opponentSetsWon && match.isCompleted) {
        matchesWon++;
      }
      
      // Get all points from the match (regular + tiebreak)
      const matchPoints = getAllMatchPoints(match);
      allMatchPoints = [...allMatchPoints, ...matchPoints];
      
      match.sets.forEach((set, setIndex) => {
        totalSets++;
        if (set.playerGames > set.opponentGames) {
          wonSets++;
        }
        
        set.games.forEach(game => {
          totalGames++;
          
          // Count games won by looking at who won more points in completed games
          if (game.isCompleted) {
            const playerPointsInGame = game.points.filter(p => p.isPlayerPoint).length;
            const opponentPointsInGame = game.points.filter(p => !p.isPlayerPoint).length;
            
            if (playerPointsInGame > opponentPointsInGame) {
              wonGames++;
            }
          }
        });
      });
      
      // Process all points (regular + tiebreak)
      matchPoints.forEach(point => {
        totalPoints++;
        if (point.isPlayerPoint) {
          wonPoints++;
        }
        
        // Determine if this is a serving point
        const isServingPoint = isPlayerServingPoint(point, match);
        
        // Serve stats - only count when player is serving
        if (isServingPoint) {
          firstServeTotal++;
          
          // Count successful first serves (isFirstServeIn = true)
          if (point.serveData.isFirstServeIn) {
            firstServeIn++;
          } else {
            // This is a second serve opportunity
            secondServeOpportunities++;
            if (point.serveData.isSecondServeIn && !point.serveData.isDoubleFault) {
              secondServeIn++;
            }
            if (point.serveData.isDoubleFault) {
              doubleFaults++;
            }
          }
          
          // Count aces (can happen on any serve, not just first serve)
          if (point.isPlayerPoint && point.shotType === ShotType.ACE) {
            aces++;
          }
        }
        
        // Winner stats - only count player's winners (excluding Opponent Mistake)
        if (point.isPlayerPoint && point.shotType) {
          if (point.shotType === ShotType.FOREHAND) {
            winners.forehand++;
          } else if (point.shotType === ShotType.BACKHAND) {
            winners.backhand++;
          } else if (point.shotType === ShotType.VOLLEY) {
            winners.volley++;
          } else if (point.shotType === ShotType.SLICE) {
            winners.slice++;
          } else if (point.shotType === ShotType.DROPSHOT) {
            winners.dropshot++;
          } else if (point.shotType === ShotType.LOB) {
            winners.lob++;
          } else if (point.shotType === ShotType.OVERHEAD) {
            winners.overhead++;
          } else if (point.shotType === ShotType.ACE) {
            winners.ace++;
          } else if (point.shotType === ShotType.SERVE_UNRETURNED) {
            winners.serveUnreturned++;
          }
          // Note: Excluding ShotType.OPPONENT_MISTAKE from winners display
        }
        
        // Error stats - only count player's unforced errors
        if (!point.isPlayerPoint && point.errorType) {
          if (point.errorType === ErrorType.FOREHAND_UNFORCED) {
            errors.forehandUnforced++;
          } else if (point.errorType === ErrorType.BACKHAND_UNFORCED) {
            errors.backhandUnforced++;
          } else if (point.errorType === ErrorType.VOLLEY_UNFORCED) {
            errors.volleyUnforced++;
          } else if (point.errorType === ErrorType.SLICE_UNFORCED) {
            errors.sliceUnforced++;
          } else if (point.errorType === ErrorType.DROPSHOT_UNFORCED) {
            errors.dropshotUnforced++;
          } else if (point.errorType === ErrorType.LOB_UNFORCED) {
            errors.lobUnforced++;
          } else if (point.errorType === ErrorType.OVERHEAD_UNFORCED) {
            errors.overheadUnforced++;
          } else if (point.errorType === ErrorType.FORCED_ERROR) {
            errors.forcedError++;
          }
        }
        
        // Count double faults as errors (only on player's serve)
        if (isServingPoint && point.serveData.isDoubleFault) {
          errors.doubleFaults++;
        }
        
        // Rally length - check if point has rallyLength property
        if (point.rallyLength && point.rallyLength > 0) {
          rallyLengthTotal += point.rallyLength;
          rallyCount++;
        }
      });
    });
    
    // Calculate rally length statistics
    const rallyLengthStats = calculateRallyLengthStats(allMatchPoints);
    
    return {
      matches: {
        total: totalMatches,
        completed: completedMatches,
        won: matchesWon,
        winPercentage: completedMatches > 0 ? (matchesWon / completedMatches) * 100 : 0,
      },
      sets: {
        total: totalSets,
        won: wonSets,
        winPercentage: totalSets > 0 ? (wonSets / totalSets) * 100 : 0,
      },
      games: {
        total: totalGames,
        won: wonGames,
        winPercentage: totalGames > 0 ? (wonGames / totalGames) * 100 : 0,
      },
      points: {
        total: totalPoints,
        won: wonPoints,
        winPercentage: totalPoints > 0 ? (wonPoints / totalPoints) * 100 : 0,
      },
      serve: {
        firstServePercentage: firstServeTotal > 0 ? (firstServeIn / firstServeTotal) * 100 : 0,
        secondServePercentage: secondServeOpportunities > 0 ? (secondServeIn / secondServeOpportunities) * 100 : 0,
        doubleFaults,
        aces,
      },
      winners,
      errors,
      rally: {
        averageLength: rallyCount > 0 ? rallyLengthTotal / rallyCount : 0,
      },
      rallyLengthStats,
    };
  }, [playerMatches]);
  
  // Show create player prompt if no players exist
  if (players.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <User size={48} color={Colors.textSecondary} />
        </View>
        <Text style={styles.emptyTitle}>No Player Profiles</Text>
        <Text style={styles.emptyText}>
          Create a player profile to start viewing career statistics.
        </Text>
        <Button
          title="Create Player Profile"
          variant="primary"
          onPress={() => router.push('/profile')}
          style={styles.createPlayerButton}
        />
      </View>
    );
  }
  
  // Show no matches message if selected player has no matches
  if (!stats) {
    return (
      <View style={styles.container}>
        <View style={styles.playerSelectorContainer}>
          <Text style={styles.selectorLabel}>Player:</Text>
          <TouchableOpacity 
            style={styles.playerSelector}
            onPress={() => setShowPlayerSelector(!showPlayerSelector)}
          >
            <View style={styles.selectedPlayerInfo}>
              {selectedPlayer && <PlayerAvatar player={selectedPlayer} size={32} />}
              <Text style={styles.selectedPlayerName}>{selectedPlayer?.name || 'Select Player'}</Text>
            </View>
            <ChevronDown size={20} color={Colors.primary} />
          </TouchableOpacity>
          
          {showPlayerSelector && (
            <View style={styles.playerDropdown}>
              {players.map((player) => (
                <TouchableOpacity
                  key={player.id}
                  style={[
                    styles.playerOption,
                    selectedPlayer?.id === player.id && styles.playerOptionActive
                  ]}
                  onPress={() => {
                    setSelectedPlayer(player);
                    setShowPlayerSelector(false);
                  }}
                >
                  <PlayerAvatar player={player} size={28} />
                  <Text style={[
                    styles.playerOptionName,
                    selectedPlayer?.id === player.id && styles.playerOptionNameActive
                  ]}>
                    {player.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Statistics Available</Text>
          <Text style={styles.emptyText}>
            {selectedPlayer?.name || 'This player'} has not played any matches yet. Start tracking matches to see performance statistics.
          </Text>
        </View>
      </View>
    );
  }
  
  // Prepare data for horizontal bar chart (winners) - excluding Opponent Mistake
  const winnersData = [
    {
      label: 'Forehand',
      value: stats.winners.forehand,
      color: '#4CAF50'
    },
    {
      label: 'Backhand',
      value: stats.winners.backhand,
      color: '#2196F3'
    },
    {
      label: 'Volley',
      value: stats.winners.volley,
      color: '#9C27B0'
    },
    {
      label: 'Slice',
      value: stats.winners.slice,
      color: '#FF9800'
    },
    {
      label: 'Dropshot',
      value: stats.winners.dropshot,
      color: '#F44336'
    },
    {
      label: 'Lob',
      value: stats.winners.lob,
      color: '#607D8B'
    },
    {
      label: 'Overhead',
      value: stats.winners.overhead,
      color: '#009688'
    },
    {
      label: 'Ace',
      value: stats.winners.ace,
      color: '#795548'
    },
    {
      label: 'Serve Unreturned',
      value: stats.winners.serveUnreturned,
      color: '#E91E63'
    },
  ].filter(item => item.value > 0);
  
  // Prepare data for horizontal bar chart (unforced errors including double faults and forced errors)
  const errorsData = [
    {
      label: 'Forehand',
      value: stats.errors.forehandUnforced,
      color: '#4CAF50'
    },
    {
      label: 'Backhand',
      value: stats.errors.backhandUnforced,
      color: '#2196F3'
    },
    {
      label: 'Volley',
      value: stats.errors.volleyUnforced,
      color: '#9C27B0'
    },
    {
      label: 'Slice',
      value: stats.errors.sliceUnforced,
      color: '#FF9800'
    },
    {
      label: 'Dropshot',
      value: stats.errors.dropshotUnforced,
      color: '#F44336'
    },
    {
      label: 'Lob',
      value: stats.errors.lobUnforced,
      color: '#607D8B'
    },
    {
      label: 'Overhead',
      value: stats.errors.overheadUnforced,
      color: '#009688'
    },
    {
      label: 'Forced Error',
      value: stats.errors.forcedError,
      color: '#795548'
    },
    {
      label: 'Double Fault',
      value: stats.errors.doubleFaults,
      color: '#E91E63'
    },
  ].filter(item => item.value > 0);
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.playerSelectorContainer}>
        <Text style={styles.selectorLabel}>Player:</Text>
        <TouchableOpacity 
          style={styles.playerSelector}
          onPress={() => setShowPlayerSelector(!showPlayerSelector)}
        >
          <View style={styles.selectedPlayerInfo}>
            {selectedPlayer && <PlayerAvatar player={selectedPlayer} size={32} />}
            <Text style={styles.selectedPlayerName}>{selectedPlayer?.name || 'Select Player'}</Text>
          </View>
          <ChevronDown size={20} color={Colors.primary} />
        </TouchableOpacity>
        
        {showPlayerSelector && (
          <View style={styles.playerDropdown}>
            {players.map((player) => (
              <TouchableOpacity
                key={player.id}
                style={[
                  styles.playerOption,
                  selectedPlayer?.id === player.id && styles.playerOptionActive
                ]}
                onPress={() => {
                  setSelectedPlayer(player);
                  setShowPlayerSelector(false);
                }}
              >
                <PlayerAvatar player={player} size={28} />
                <Text style={[
                  styles.playerOptionName,
                  selectedPlayer?.id === player.id && styles.playerOptionNameActive
                ]}>
                  {player.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      
      <Text style={styles.title}>{selectedPlayer?.name || 'Player'} Career Performance</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Career Summary</Text>
        <View style={styles.progressChartsGrid}>
          <View style={styles.progressChartRow}>
            <ProgressChart
              title="Matches Won"
              value={stats.matches.winPercentage}
              maxValue={100}
              color="#4CAF50"
              size={110}
            />
            <ProgressChart
              title="Sets Won"
              value={stats.sets.winPercentage}
              maxValue={100}
              color="#2196F3"
              size={110}
            />
          </View>
          <View style={styles.progressChartRow}>
            <ProgressChart
              title="Games Won"
              value={stats.games.winPercentage}
              maxValue={100}
              color="#9C27B0"
              size={110}
            />
            <ProgressChart
              title="Points Won"
              value={stats.points.winPercentage}
              maxValue={100}
              color="#FF9800"
              size={110}
            />
          </View>
        </View>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Matches</Text>
          <Text style={styles.statValue}>{stats.matches.total}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Sets</Text>
          <Text style={styles.statValue}>{stats.sets.total}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Games</Text>
          <Text style={styles.statValue}>{stats.games.total}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Matches Won</Text>
          <Text style={styles.statValue}>{stats.matches.won}</Text>
        </View>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Serve Statistics</Text>
        <View style={styles.serveChartsGrid}>
          <ProgressChart
            title="1st Serve In"
            value={stats.serve.firstServePercentage}
            maxValue={100}
            color="#4CAF50"
            size={90}
          />
          <ProgressChart
            title="2nd Serve In"
            value={stats.serve.secondServePercentage}
            maxValue={100}
            color="#FF9800"
            size={90}
          />
        </View>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Aces</Text>
          <Text style={styles.statValue}>{stats.serve.aces}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Double Faults</Text>
          <Text style={styles.statValue}>{stats.serve.doubleFaults}</Text>
        </View>
      </View>
      
      {winnersData.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Career Winners</Text>
          <HorizontalBarChart 
            data={winnersData}
            width={300}
          />
        </View>
      )}
      
      {errorsData.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Career Unforced Errors</Text>
          <HorizontalBarChart 
            data={errorsData}
            width={300}
          />
        </View>
      )}

      {/* Rally Length Win Percentage - moved to bottom */}
      {stats.rallyLengthStats.totalPointsWithRallyData > 0 && (
        <View style={styles.card}>
          <View style={styles.cardTitleContainer}>
            <Target size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Rally Length Win Percentage</Text>
          </View>
          
          {/* Performance Insights */}
          <View style={styles.insightsContainer}>
            {stats.rallyLengthStats.strongestCategory && (
              <View style={styles.insightItem}>
                <Award size={16} color="#4CAF50" />
                <Text style={styles.insightText}>
                  <Text style={styles.insightLabel}>Strongest: </Text>
                  {stats.rallyLengthStats.strongestCategory === 'short' ? 'Short rallies (< 4 shots)' :
                   stats.rallyLengthStats.strongestCategory === 'medium' ? 'Medium rallies (4-9 shots)' :
                   'Long rallies (> 9 shots)'} - {
                    stats.rallyLengthStats.strongestCategory === 'short' ? stats.rallyLengthStats.shortRallies.winPercentage.toFixed(1) :
                    stats.rallyLengthStats.strongestCategory === 'medium' ? stats.rallyLengthStats.mediumRallies.winPercentage.toFixed(1) :
                    stats.rallyLengthStats.longRallies.winPercentage.toFixed(1)
                  }%
                </Text>
              </View>
            )}
            
            {stats.rallyLengthStats.weakestCategory && stats.rallyLengthStats.weakestCategory !== stats.rallyLengthStats.strongestCategory && (
              <View style={styles.insightItem}>
                <AlertTriangle size={16} color="#FF9800" />
                <Text style={styles.insightText}>
                  <Text style={styles.insightLabel}>Needs Work: </Text>
                  {stats.rallyLengthStats.weakestCategory === 'short' ? 'Short rallies (< 4 shots)' :
                   stats.rallyLengthStats.weakestCategory === 'medium' ? 'Medium rallies (4-9 shots)' :
                   'Long rallies (> 9 shots)'} - {
                    stats.rallyLengthStats.weakestCategory === 'short' ? stats.rallyLengthStats.shortRallies.winPercentage.toFixed(1) :
                    stats.rallyLengthStats.weakestCategory === 'medium' ? stats.rallyLengthStats.mediumRallies.winPercentage.toFixed(1) :
                    stats.rallyLengthStats.longRallies.winPercentage.toFixed(1)
                  }%
                </Text>
              </View>
            )}
          </View>
          
          {/* Category Statistics Grid */}
          <View style={styles.rallyStatsGrid}>
            <View style={[styles.rallyStatItem, stats.rallyLengthStats.strongestCategory === 'short' && styles.rallyStatItemBest]}>
              <Text style={[styles.rallyStatValue, stats.rallyLengthStats.strongestCategory === 'short' && styles.rallyStatValueBest]}>
                {stats.rallyLengthStats.shortRallies.winPercentage.toFixed(1)}%
              </Text>
              <Text style={styles.rallyStatLabel}>Short Rallies</Text>
              <Text style={styles.rallyStatSubLabel}>{"< 4 shots"}</Text>
              <Text style={styles.rallyStatCount}>
                {stats.rallyLengthStats.shortRallies.won}/{stats.rallyLengthStats.shortRallies.total}
              </Text>
              <Text style={styles.rallyStatAverage}>
                Avg: {stats.rallyLengthStats.shortRallies.averageLength.toFixed(1)} shots
              </Text>
            </View>
            
            <View style={[styles.rallyStatItem, stats.rallyLengthStats.strongestCategory === 'medium' && styles.rallyStatItemBest]}>
              <Text style={[styles.rallyStatValue, stats.rallyLengthStats.strongestCategory === 'medium' && styles.rallyStatValueBest]}>
                {stats.rallyLengthStats.mediumRallies.winPercentage.toFixed(1)}%
              </Text>
              <Text style={styles.rallyStatLabel}>Medium Rallies</Text>
              <Text style={styles.rallyStatSubLabel}>4-9 shots</Text>
              <Text style={styles.rallyStatCount}>
                {stats.rallyLengthStats.mediumRallies.won}/{stats.rallyLengthStats.mediumRallies.total}
              </Text>
              <Text style={styles.rallyStatAverage}>
                Avg: {stats.rallyLengthStats.mediumRallies.averageLength.toFixed(1)} shots
              </Text>
            </View>
            
            <View style={[styles.rallyStatItem, stats.rallyLengthStats.strongestCategory === 'long' && styles.rallyStatItemBest]}>
              <Text style={[styles.rallyStatValue, stats.rallyLengthStats.strongestCategory === 'long' && styles.rallyStatValueBest]}>
                {stats.rallyLengthStats.longRallies.winPercentage.toFixed(1)}%
              </Text>
              <Text style={styles.rallyStatLabel}>Long Rallies</Text>
              <Text style={styles.rallyStatSubLabel}>{"> 9 shots"}</Text>
              <Text style={styles.rallyStatCount}>
                {stats.rallyLengthStats.longRallies.won}/{stats.rallyLengthStats.longRallies.total}
              </Text>
              <Text style={styles.rallyStatAverage}>
                Avg: {stats.rallyLengthStats.longRallies.averageLength.toFixed(1)} shots
              </Text>
            </View>
          </View>
          
          {/* Summary Statistics */}
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Average Rally Length</Text>
            <Text style={styles.statValue}>{stats.rallyLengthStats.averageLength.toFixed(1)} shots</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Points with Rally Data</Text>
            <Text style={styles.statValue}>{stats.rallyLengthStats.totalPointsWithRallyData}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// Helper function to check if a point is a regular point (not tiebreak)
function isRegularPoint(point: Point | TiebreakPoint): point is Point {
  return !('isPlayerServing' in point);
}

// Helper function to check if a point is a tiebreak point
function isTiebreakPoint(point: Point | TiebreakPoint): point is TiebreakPoint {
  return 'isPlayerServing' in point;
}

// Helper function to determine if player is serving for a given point
function isPlayerServingPoint(point: Point | TiebreakPoint, match: Match): boolean {
  if (isTiebreakPoint(point)) {
    return point.isPlayerServing ?? false;
  } else {
    // For regular points, find the game this point belongs to
    const game = match.sets
      .flatMap(set => set.games)
      .find(game => game.points.includes(point as Point));
    return game?.isPlayerServing || false;
  }
}

// Helper function to get all points from a match (regular + tiebreak)
function getAllMatchPoints(match: Match): (Point | TiebreakPoint)[] {
  const regularPoints = match.sets
    .flatMap((set: Set) => set.games)
    .flatMap((game: Game) => game.points);
  
  const tiebreakPoints = match.sets
    .filter((set: Set) => set.tiebreak && Array.isArray(set.tiebreak.points))
    .flatMap((set: Set) => set.tiebreak?.points || []);
  
  return [...regularPoints, ...tiebreakPoints];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.background,
  },
  playerSelectorContainer: {
    marginBottom: 16,
    position: 'relative',
    zIndex: 10,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  playerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedPlayerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  selectedPlayerName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  playerDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginTop: 4,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  playerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  playerOptionActive: {
    backgroundColor: Colors.primary + '20',
  },
  playerOptionName: {
    fontSize: 14,
    color: Colors.text,
  },
  playerOptionNameActive: {
    fontWeight: '600',
    color: Colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 8,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 8,
  },
  insightsContainer: {
    marginBottom: 16,
    gap: 8,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
  },
  insightText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  insightLabel: {
    fontWeight: '600',
    color: Colors.primary,
  },
  rallyStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  rallyStatItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
  },
  rallyStatItemBest: {
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  rallyStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  rallyStatValueBest: {
    color: '#4CAF50',
  },
  rallyStatLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  rallyStatSubLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  rallyStatCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 2,
  },
  rallyStatAverage: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '50', // 50% opacity
  },
  statLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.border + '30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  createPlayerButton: {
    width: '100%',
    maxWidth: 300,
  },
  progressChartsGrid: {
    marginBottom: 16,
  },
  progressChartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  serveChartsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
});