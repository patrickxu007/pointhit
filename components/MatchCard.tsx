import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Match } from '@/types/tennis';
import Colors from '@/constants/colors';
import { Calendar, ChevronRight, Trash2, RotateCcw } from 'lucide-react-native';
import { router } from 'expo-router';
import { useMatchStore } from '@/store/matchStore';
import PlayerAvatar from '@/components/PlayerAvatar';

interface MatchCardProps {
  match: Match;
}

export default function MatchCard({ match }: MatchCardProps) {
  const { deleteMatch, reopenMatch } = useMatchStore();
  const [showActions, setShowActions] = useState(false);

  const handlePress = () => {
    if (showActions) {
      setShowActions(false);
      return;
    }

    if (match.isCompleted) {
      router.push(`/match/${match.id}`);
    } else {
      router.push(`/match/${match.id}/track`);
    }
  };

  const handleLongPress = () => {
    setShowActions(!showActions);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Match',
      'Are you sure you want to delete this match? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setShowActions(false),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteMatch(match.id);
            setShowActions(false);
          },
        },
      ]
    );
  };

  const handleReopen = () => {
    Alert.alert(
      'Re-open Match',
      'Are you sure you want to re-open this completed match? You will be able to continue tracking it.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setShowActions(false),
        },
        {
          text: 'Re-open',
          onPress: () => {
            reopenMatch(match.id);
            setShowActions(false);
            // Navigate to track screen after re-opening
            router.push(`/match/${match.id}/track`);
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getMatchScore = () => {
    return match.sets.map(set => `${set.playerGames}-${set.opponentGames}`).join(', ');
  };

  return (
    <TouchableOpacity 
      style={[styles.card, showActions && styles.cardWithActions]} 
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.dateContainer}>
          <Calendar size={16} color={Colors.textSecondary} />
          <Text style={styles.date}>{formatDate(match.date)}</Text>
        </View>
        <View style={styles.rightHeader}>
          <View style={[
            styles.statusBadge, 
            match.isCompleted ? styles.completedBadge : styles.inProgressBadge
          ]}>
            <Text style={styles.statusText}>
              {match.isCompleted ? 'Completed' : 'In Progress'}
            </Text>
          </View>
          {showActions && (
            <View style={styles.actionButtons}>
              {match.isCompleted && (
                <TouchableOpacity 
                  style={styles.reopenButton}
                  onPress={handleReopen}
                  activeOpacity={0.7}
                >
                  <RotateCcw size={16} color={Colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={handleDelete}
                activeOpacity={0.7}
              >
                <Trash2 size={16} color={Colors.error} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.content}>
        <View style={styles.playerInfo}>
          <View style={styles.playerSection}>
            <PlayerAvatar player={match.player} size={32} />
            <Text style={styles.playerName}>{match.player.name}</Text>
          </View>
          <Text style={styles.vs}>vs</Text>
          <View style={styles.opponentSection}>
            <Text style={styles.opponentName}>{match.opponent.name}</Text>
            <PlayerAvatar player={match.opponent} size={32} />
          </View>
        </View>
        
        {match.sets.length > 0 && (
          <View style={styles.scoreContainer}>
            <Text style={styles.score}>{getMatchScore()}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.footer}>
        {match.location && (
          <Text style={styles.location}>{match.location}</Text>
        )}
        {!showActions && <ChevronRight size={20} color={Colors.textSecondary} />}
        {showActions && (
          <Text style={styles.actionHint}>
            Tap to close • Long press to show options
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
  cardWithActions: {
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  date: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  rightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedBadge: {
    backgroundColor: Colors.success + '20', // 20% opacity
  },
  inProgressBadge: {
    backgroundColor: Colors.warning + '20', // 20% opacity
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  reopenButton: {
    padding: 8,
    backgroundColor: Colors.primary + '10',
    borderRadius: 8,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: Colors.error + '10',
    borderRadius: 8,
  },
  content: {
    marginBottom: 12,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  playerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  opponentSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'flex-end',
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  vs: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginHorizontal: 8,
  },
  opponentName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'right',
    flex: 1,
  },
  scoreContainer: {
    marginTop: 4,
  },
  score: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  location: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  actionHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});