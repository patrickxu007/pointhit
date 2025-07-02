import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { router } from 'expo-router';
import { useMatchStore } from '@/store/matchStore';
import Button from '@/components/Button';
import PlayerAvatar from '@/components/PlayerAvatar';
import Colors from '@/constants/colors';
import { Match, Player, Set, MatchFormat, TiebreakType } from '@/types/tennis';

export default function NewMatchScreen() {
  const { players, createMatch } = useMatchStore();
  
  const [playerName, setPlayerName] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [location, setLocation] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedOpponent, setSelectedOpponent] = useState<Player | null>(null);
  const [isCreatingPlayer, setIsCreatingPlayer] = useState(false);
  const [isCreatingOpponent, setIsCreatingOpponent] = useState(false);
  const [isNoAdScoring, setIsNoAdScoring] = useState(false);
  const [matchFormat, setMatchFormat] = useState<MatchFormat>(MatchFormat.REGULAR_SET);
  const [thirdSetTiebreakType, setThirdSetTiebreakType] = useState<TiebreakType>(TiebreakType.SEVEN_POINT);
  
  const handleCreateMatch = () => {
    if (!selectedPlayer) {
      Alert.alert('Error', 'Please select or create a player');
      return;
    }
    
    if (!selectedOpponent) {
      Alert.alert('Error', 'Please select or create an opponent');
      return;
    }
    
    const initialSet: Set = {
      id: Date.now().toString(),
      playerGames: 0,
      opponentGames: 0,
      games: [],
      isCompleted: false,
    };
    
    const currentDate = new Date().toISOString();
    
    const newMatch: Match = {
      id: Date.now().toString(),
      date: currentDate,
      createdAt: currentDate,
      player: selectedPlayer,
      opponent: selectedOpponent,
      location: location.trim() || undefined,
      isCompleted: false,
      sets: [initialSet],
      isNoAdScoring: isNoAdScoring,
      matchFormat: matchFormat,
      thirdSetTiebreakType: matchFormat === MatchFormat.REGULAR_SET ? thirdSetTiebreakType : undefined,
    };
    
    createMatch(newMatch);
    router.push(`/match/${newMatch.id}/track`);
  };
  
  const handleCreatePlayer = () => {
    if (playerName.trim() === '') {
      Alert.alert('Error', 'Please enter a player name');
      return;
    }
    
    const newPlayer: Player = {
      id: 'player_' + Date.now().toString(),
      name: playerName.trim(),
      createdAt: new Date().toISOString(),
    };
    
    setSelectedPlayer(newPlayer);
    setIsCreatingPlayer(false);
  };
  
  const handleCreateOpponent = () => {
    if (opponentName.trim() === '') {
      Alert.alert('Error', 'Please enter an opponent name');
      return;
    }
    
    const newOpponent: Player = {
      id: 'opponent_' + Date.now().toString(),
      name: opponentName.trim(),
      createdAt: new Date().toISOString(),
    };
    
    setSelectedOpponent(newOpponent);
    setIsCreatingOpponent(false);
  };
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
      keyboardVerticalOffset={100}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Create New Match</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Player</Text>
          
          {isCreatingPlayer ? (
            <View style={styles.createPlayerForm}>
              <TextInput
                style={styles.input}
                value={playerName}
                onChangeText={setPlayerName}
                placeholder="Enter your name"
                autoFocus
              />
              <View style={styles.formButtons}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setIsCreatingPlayer(false)}
                  style={styles.formButton}
                />
                <Button
                  title="Create"
                  variant="primary"
                  onPress={handleCreatePlayer}
                  style={styles.formButton}
                />
              </View>
            </View>
          ) : selectedPlayer ? (
            <View style={styles.selectedPlayerContainer}>
              <View style={styles.selectedPlayer}>
                <PlayerAvatar player={selectedPlayer} size={40} />
                <Text style={styles.playerName}>{selectedPlayer.name}</Text>
              </View>
              <Button
                title="Change"
                variant="outline"
                size="small"
                onPress={() => setSelectedPlayer(null)}
              />
            </View>
          ) : (
            <View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playersScroll}>
                {players.map((player) => (
                  <Button
                    key={player.id}
                    title={player.name}
                    variant="outline"
                    onPress={() => setSelectedPlayer(player)}
                    style={styles.playerButton}
                  />
                ))}
              </ScrollView>
              
              <Button
                title="Create New Player"
                variant="primary"
                onPress={() => setIsCreatingPlayer(true)}
                style={styles.createButton}
              />
            </View>
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Opponent</Text>
          
          {isCreatingOpponent ? (
            <View style={styles.createPlayerForm}>
              <TextInput
                style={styles.input}
                value={opponentName}
                onChangeText={setOpponentName}
                placeholder="Enter opponent name"
                autoFocus
              />
              <View style={styles.formButtons}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setIsCreatingOpponent(false)}
                  style={styles.formButton}
                />
                <Button
                  title="Create"
                  variant="primary"
                  onPress={handleCreateOpponent}
                  style={styles.formButton}
                />
              </View>
            </View>
          ) : selectedOpponent ? (
            <View style={styles.selectedPlayerContainer}>
              <View style={styles.selectedPlayer}>
                <PlayerAvatar player={selectedOpponent} size={40} />
                <Text style={styles.playerName}>{selectedOpponent.name}</Text>
              </View>
              <Button
                title="Change"
                variant="outline"
                size="small"
                onPress={() => setSelectedOpponent(null)}
              />
            </View>
          ) : (
            <View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playersScroll}>
                {players.map((player) => (
                  <Button
                    key={player.id}
                    title={player.name}
                    variant="outline"
                    onPress={() => setSelectedOpponent(player)}
                    style={styles.playerButton}
                  />
                ))}
              </ScrollView>
              
              <Button
                title="Create New Opponent"
                variant="primary"
                onPress={() => setIsCreatingOpponent(true)}
                style={styles.createButton}
              />
            </View>
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Match Format</Text>
          
          <View style={styles.formatButtons}>
            <Button
              title="Regular Set"
              variant={matchFormat === MatchFormat.REGULAR_SET ? 'primary' : 'outline'}
              onPress={() => setMatchFormat(MatchFormat.REGULAR_SET)}
              style={styles.formatButton}
            />
            <Button
              title="Short Set"
              variant={matchFormat === MatchFormat.SHORT_SET ? 'primary' : 'outline'}
              onPress={() => setMatchFormat(MatchFormat.SHORT_SET)}
              style={styles.formatButton}
            />
          </View>
          
          <Text style={styles.formatDescription}>
            {matchFormat === MatchFormat.REGULAR_SET 
              ? "Regular Set: First to 6 games (2-game lead), 7-point tiebreak at 6-6"
              : "Short Set: First to 4 games (2-game lead), 5-point tiebreak at 3-3"
            }
          </Text>
          
          {matchFormat === MatchFormat.REGULAR_SET && (
            <View style={styles.thirdSetOptions}>
              <Text style={styles.subSectionTitle}>Third Set Format</Text>
              <View style={styles.formatButtons}>
                <Button
                  title="Regular Set"
                  variant={thirdSetTiebreakType === TiebreakType.SEVEN_POINT ? 'primary' : 'outline'}
                  onPress={() => setThirdSetTiebreakType(TiebreakType.SEVEN_POINT)}
                  style={styles.formatButton}
                />
                <Button
                  title="10-Point Tiebreak"
                  variant={thirdSetTiebreakType === TiebreakType.TEN_POINT ? 'primary' : 'outline'}
                  onPress={() => setThirdSetTiebreakType(TiebreakType.TEN_POINT)}
                  style={styles.formatButton}
                />
              </View>
              <Text style={styles.formatDescription}>
                {thirdSetTiebreakType === TiebreakType.TEN_POINT 
                  ? "Third set will be a 10-point tiebreak (first to 10, win by 2)"
                  : "Third set will be a regular set with 7-point tiebreak at 6-6"
                }
              </Text>
            </View>
          )}
          
          {matchFormat === MatchFormat.SHORT_SET && (
            <Text style={styles.formatDescription}>
              If sets are tied 1-1, the third set will be a 5-point tiebreak.
            </Text>
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Match Location</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="Location (optional)"
          />
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>No-Ad Scoring</Text>
            <Switch
              value={isNoAdScoring}
              onValueChange={setIsNoAdScoring}
              trackColor={{ false: Colors.border, true: Colors.primary + '70' }}
              thumbColor={isNoAdScoring ? Colors.primary : '#f4f3f4'}
            />
          </View>
          <Text style={styles.settingDescription}>
            In No-Ad scoring, when the score reaches 40-40 (deuce), the next point decides the game winner.
          </Text>
        </View>
        
        <Button
          title="Start Match"
          variant="primary"
          size="large"
          onPress={handleCreateMatch}
          style={styles.startButton}
          disabled={!selectedPlayer || !selectedOpponent}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  playersScroll: {
    marginBottom: 12,
  },
  playerButton: {
    marginRight: 8,
    minWidth: 100,
  },
  createButton: {
    marginTop: 8,
  },
  createPlayerForm: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: Colors.card,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  formButton: {
    width: 100,
  },
  selectedPlayerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  selectedPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  formatButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  formatButton: {
    flex: 1,
  },
  formatDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  thirdSetOptions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  settingDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  startButton: {
    marginTop: 12,
    marginBottom: 40,
  },
});