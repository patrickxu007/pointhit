import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Match, scoreToString } from '@/types/tennis';
import Colors from '@/constants/colors';

interface ScoreDisplayProps {
  match: Match;
  currentSetIndex: number;
  currentGameIndex?: number;
}

export default function ScoreDisplay({ 
  match, 
  currentSetIndex, 
  currentGameIndex 
}: ScoreDisplayProps) {
  const currentSet = match.sets[currentSetIndex];
  const currentGame = currentGameIndex !== undefined ? currentSet?.games[currentGameIndex] : null;
  const tiebreak = currentSet?.tiebreak;
  
  // Check if this is the third set and it's a tiebreak
  const isThirdSetTiebreak = currentSetIndex === 2 && tiebreak;
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.playerName}>{match.player.name}</Text>
        <Text style={[styles.playerName, styles.opponentName]}>{match.opponent.name}</Text>
      </View>
      
      <View style={styles.setsContainer}>
        {match.sets.map((set, index) => {
          // For third set tiebreak, show tiebreak score as set score
          const isThirdSetTiebreakDisplay = index === 2 && set.tiebreak && set.isCompleted;
          
          return (
            <View key={`set-${set.id}-${index}`} style={styles.setRow}>
              <Text style={[
                styles.setNumber, 
                index === currentSetIndex && styles.currentSetNumber
              ]}>
                Set {index + 1}
              </Text>
              <View style={styles.setScores}>
                <Text style={[
                  styles.setScore, 
                  index === currentSetIndex && styles.currentSetScore
                ]}>
                  {isThirdSetTiebreakDisplay ? set.tiebreak!.playerPoints : set.playerGames}
                </Text>
                <Text style={[
                  styles.setScore, 
                  index === currentSetIndex && styles.currentSetScore
                ]}>
                  {isThirdSetTiebreakDisplay ? set.tiebreak!.opponentPoints : set.opponentGames}
                </Text>
              </View>
              {set.tiebreak && !isThirdSetTiebreakDisplay && (
                <View style={styles.tiebreakScores}>
                  <Text style={styles.tiebreakScore}>
                    ({set.tiebreak.playerPoints}-{set.tiebreak.opponentPoints})
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
      
      {tiebreak && !tiebreak.isCompleted ? (
        <View style={styles.currentGameContainer}>
          <Text style={styles.currentGameTitle}>
            {getTiebreakName(tiebreak.type)} in Progress
          </Text>
          <View style={styles.gameScores}>
            <Text style={styles.gameScore}>{tiebreak.playerPoints}</Text>
            <Text style={styles.gameScore}>{tiebreak.opponentPoints}</Text>
          </View>
        </View>
      ) : currentGame && !currentGame.isCompleted ? (
        <View style={styles.currentGameContainer}>
          <Text style={styles.currentGameTitle}>
            Current Game - {currentGame.isPlayerServing ? match.player.name : match.opponent.name} Serves
          </Text>
          <View style={styles.gameScores}>
            <Text style={styles.gameScore}>{scoreToString(currentGame.playerScore)}</Text>
            <Text style={styles.gameScore}>{scoreToString(currentGame.opponentScore)}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function getTiebreakName(type: string): string {
  switch (type) {
    case 'five_point':
      return '5-Point Tiebreak';
    case 'seven_point':
      return '7-Point Tiebreak';
    case 'ten_point':
      return '10-Point Tiebreak';
    default:
      return 'Tiebreak';
  }
}

const styles = StyleSheet.create({
  container: {
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 8,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  opponentName: {
    textAlign: 'right',
  },
  setsContainer: {
    marginBottom: 16,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  setNumber: {
    fontSize: 14,
    color: Colors.textSecondary,
    width: 60,
  },
  currentSetNumber: {
    fontWeight: '600',
    color: Colors.primary,
  },
  setScores: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  setScore: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    width: 30,
    textAlign: 'center',
  },
  currentSetScore: {
    fontWeight: '700',
    color: Colors.primary,
  },
  tiebreakScores: {
    marginLeft: 16,
  },
  tiebreakScore: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  currentGameContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  currentGameTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  gameScores: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  gameScore: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    width: 50,
    textAlign: 'center',
  },
});