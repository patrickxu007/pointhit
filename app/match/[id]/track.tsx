import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Switch, Modal, TextInput, Keyboard } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useMatchStore } from '@/store/matchStore';
import Button from '@/components/Button';
import ScoreDisplay from '@/components/ScoreDisplay';
import PointTracker from '@/components/PointTracker';
import TiebreakTracker from '@/components/TiebreakTracker';
import Colors from '@/constants/colors';
import { ChevronDown, Settings, X, MessageSquare } from 'lucide-react-native';
import { TiebreakType } from '@/types/tennis';

export default function TrackMatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { 
    currentMatch, 
    setCurrentMatch, 
    addGame, 
    addSet, 
    completeSet, 
    completeMatch,
    updateServerForGame,
    toggleNoAdScoring,
    startTiebreak,
    completeTiebreak,
    endMatchTiming,
    lastAction,
    undoLastAction,
    updateMatchComments
  } = useMatchStore();
  
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [showSetSelector, setShowSetSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [comments, setComments] = useState('');
  const mainScrollViewRef = useRef<ScrollView>(null);
  
  useEffect(() => {
    if (id) {
      setCurrentMatch(id);
    }
  }, [id, setCurrentMatch]);
  
  useEffect(() => {
    if (currentMatch && currentMatch.sets.length > 0) {
      const lastSetIndex = currentMatch.sets.length - 1;
      setCurrentSetIndex(lastSetIndex);
      
      const lastSet = currentMatch.sets[lastSetIndex];
      if (lastSet.games.length === 0 && !lastSet.tiebreak) {
        // Add initial game if no games exist and no tiebreak
        addGame(lastSetIndex, true);
      } else {
        setCurrentGameIndex(Math.max(0, lastSet.games.length - 1));
      }
    }
  }, [currentMatch, addGame]);
  
  // Update current game index when a new game is added
  useEffect(() => {
    if (currentMatch && currentMatch.sets[currentSetIndex]) {
      const gamesCount = currentMatch.sets[currentSetIndex].games.length;
      if (gamesCount > 0 && currentGameIndex !== gamesCount - 1) {
        setCurrentGameIndex(gamesCount - 1);
      }
    }
  }, [currentMatch, currentSetIndex, currentGameIndex]);
  
  // Check if match is completed and show comments modal
  useEffect(() => {
    if (currentMatch && currentMatch.isCompleted && !showCommentsModal) {
      setShowCommentsModal(true);
    }
  }, [currentMatch, showCommentsModal]);
  
  // Removed automatic timing start - timing should only start when first point is saved
  
  const handlePointAdded = () => {
    if (!currentMatch) return;
    
    // Scroll to top after point is added
    mainScrollViewRef.current?.scrollTo({ y: 0, animated: true });
    
    // Check if match was completed after the point
    if (currentMatch.isCompleted) {
      // Don't navigate immediately, let the useEffect handle showing comments modal
      return;
    }
    
    // Get the updated match state after the point was added
    const updatedMatch = currentMatch;
    
    // Check if we need to update the current set index (new set was created)
    if (updatedMatch.sets.length > currentSetIndex + 1) {
      // A new set was automatically created
      const newSetIndex = updatedMatch.sets.length - 1;
      setCurrentSetIndex(newSetIndex);
      
      const newSet = updatedMatch.sets[newSetIndex];
      if (newSet.games.length > 0) {
        setCurrentGameIndex(0);
      }
    } else {
      // Check if a new game was added to the current set
      const currentSet = updatedMatch.sets[currentSetIndex];
      if (currentSet && currentSet.games.length > currentGameIndex + 1) {
        setCurrentGameIndex(currentGameIndex + 1);
      }
    }
  };
  
  const handleTiebreakCompleted = () => {
    if (!currentMatch) return;
    
    // Scroll to top after tiebreak is completed
    mainScrollViewRef.current?.scrollTo({ y: 0, animated: true });
    
    completeTiebreak(currentSetIndex);
    
    // Check if match was completed after tiebreak
    if (currentMatch.isCompleted) {
      // Don't navigate immediately, let the useEffect handle showing comments modal
      return;
    }
    
    // Check if match should continue or end
    const completedSets = currentMatch.sets.filter(s => s.isCompleted).length + 1; // +1 for the set we just completed
    
    if (completedSets < 3) {
      // Add a new set only if match is not completed
      addSet();
      
      // Update indices to point to the new set
      const newSetIndex = currentMatch.sets.length;
      setCurrentSetIndex(newSetIndex);
      
      // Check if the new set should start with a tiebreak or regular game
      const newSet = currentMatch.sets[newSetIndex];
      if (newSet && !newSet.tiebreak) {
        // Start with a regular game, alternating server from last tiebreak point
        const currentSet = currentMatch.sets[currentSetIndex];
        const lastTiebreakPoint = currentSet.tiebreak?.points[currentSet.tiebreak.points.length - 1];
        const wasPlayerServing = lastTiebreakPoint ? 
          (currentSet.tiebreak!.points.length % 2 === 1) : true; // Default to player serving
        
        addGame(newSetIndex, !wasPlayerServing);
        setCurrentGameIndex(0);
      }
    }
  };
  
  const handleServerChange = (isPlayerServing: boolean) => {
    updateServerForGame(currentSetIndex, currentGameIndex, isPlayerServing);
  };
  
  const handleUndo = () => {
    Alert.alert(
      'Undo Last Point',
      'Are you sure you want to undo the last point? This will reverse all score changes.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Undo',
          onPress: () => {
            undoLastAction();
            // Scroll to top after undo
            mainScrollViewRef.current?.scrollTo({ y: 0, animated: true });
          },
        },
      ]
    );
  };
  
  const handleFinishMatch = () => {
    Alert.alert(
      'Finish Match',
      'Are you sure you want to finish this match?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Finish',
          onPress: () => {
            // End timing before completing the match
            endMatchTiming();
            completeMatch();
            // Comments modal will be shown by useEffect
          },
        },
      ]
    );
  };

  const handleFinishSet = () => {
    if (!currentMatch) return;
    
    Alert.alert(
      'Finish Set',
      'Are you sure you want to finish this set and start a new one?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Finish Set',
          onPress: () => {
            completeSet(currentSetIndex);
            
            // Check if match was completed after finishing the set
            if (currentMatch.isCompleted) {
              // Comments modal will be shown by useEffect
              return;
            }
            
            // Check if this was the third set or if match should be completed
            const completedSets = currentMatch.sets.filter(s => s.isCompleted).length + 1;
            if (completedSets >= 3) {
              // Match is completed
              endMatchTiming();
              completeMatch();
              // Comments modal will be shown by useEffect
            } else {
              addSet();
              
              // Update indices to point to the new set and game
              const newSetIndex = currentMatch.sets.length;
              setCurrentSetIndex(newSetIndex);
              
              // Check if the new set should start with a tiebreak or regular game
              const newSet = currentMatch.sets[newSetIndex];
              if (newSet && !newSet.tiebreak) {
                // Add initial game to the new set with alternating server
                const currentSet = currentMatch.sets[currentSetIndex];
                const lastGame = currentSet.games[currentSet.games.length - 1];
                addGame(newSetIndex, !lastGame.isPlayerServing);
                setCurrentGameIndex(0);
              }
            }
          },
        },
      ]
    );
  };

  const handleSelectSet = (index: number) => {
    setCurrentSetIndex(index);
    
    // Set current game to the last game in the selected set
    if (currentMatch && currentMatch.sets[index]) {
      const gameIndex = Math.max(0, currentMatch.sets[index].games.length - 1);
      setCurrentGameIndex(gameIndex);
    }
    
    setShowSetSelector(false);
  };
  
  const handleToggleNoAdScoring = () => {
    toggleNoAdScoring();
  };

  const handleSaveComments = () => {
    if (currentMatch) {
      updateMatchComments(currentMatch.id, comments.trim());
    }
    setShowCommentsModal(false);
    router.replace(`/match/${id}`);
  };

  const handleSkipComments = () => {
    setShowCommentsModal(false);
    router.replace(`/match/${id}`);
  };

  const handleCommentsDone = () => {
    // Only dismiss the keyboard, don't save comments
    Keyboard.dismiss();
  };
  
  if (!currentMatch) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading match data...</Text>
      </View>
    );
  }
  
  const currentSet = currentMatch.sets[currentSetIndex];
  const currentGame = currentSet?.games[currentGameIndex];
  const tiebreak = currentSet?.tiebreak;
  
  // Determine if we're in tiebreak mode
  const isInTiebreak = tiebreak && !tiebreak.isCompleted;
  
  if (!currentSet) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Setting up match...</Text>
      </View>
    );
  }
  
  return (
    <>
      <Stack.Screen options={{ title: "Track Match" }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={100}
      >
        <ScrollView 
          ref={mainScrollViewRef}
          style={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.setSelector}>
              <TouchableOpacity 
                style={styles.setSelectorButton}
                onPress={() => setShowSetSelector(!showSetSelector)}
              >
                <Text style={styles.setSelectorText}>Set {currentSetIndex + 1}</Text>
                <ChevronDown size={16} color={Colors.primary} />
              </TouchableOpacity>
              
              {showSetSelector && (
                <View style={styles.setSelectorDropdown}>
                  {currentMatch.sets.map((set, index) => (
                    <TouchableOpacity
                      key={set.id}
                      style={[
                        styles.setSelectorItem,
                        index === currentSetIndex && styles.setSelectorItemActive
                      ]}
                      onPress={() => handleSelectSet(index)}
                    >
                      <Text style={[
                        styles.setSelectorItemText,
                        index === currentSetIndex && styles.setSelectorItemTextActive
                      ]}>
                        Set {index + 1} {set.isCompleted ? '(Completed)' : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            
            <View style={styles.headerButtons}>
              {lastAction && (
                <TouchableOpacity 
                  style={styles.undoButton}
                  onPress={handleUndo}
                >
                  <Text style={styles.undoButtonText}>Undo</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={styles.settingsButton}
                onPress={() => setShowSettings(!showSettings)}
              >
                <Settings size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          
          {showSettings && (
            <View style={styles.settingsPanel}>
              <Text style={styles.settingsTitle}>Match Settings</Text>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>No-Ad Scoring</Text>
                <Switch
                  value={currentMatch.isNoAdScoring}
                  onValueChange={handleToggleNoAdScoring}
                  trackColor={{ false: Colors.border, true: Colors.primary + '70' }}
                  thumbColor={currentMatch.isNoAdScoring ? Colors.primary : '#f4f3f4'}
                />
              </View>
              <Text style={styles.settingDescription}>
                In No-Ad scoring, when the score reaches 40-40 (deuce), the next point decides the game winner.
              </Text>
            </View>
          )}
          
          <ScoreDisplay 
            match={currentMatch} 
            currentSetIndex={currentSetIndex} 
            currentGameIndex={!isInTiebreak ? currentGameIndex : undefined} 
          />
          
          <View style={styles.trackerContainer}>
            {isInTiebreak ? (
              <TiebreakTracker 
                setIndex={currentSetIndex}
                tiebreakType={tiebreak.type}
                onTiebreakCompleted={handleTiebreakCompleted}
                onPointAdded={handlePointAdded}
              />
            ) : currentGame ? (
              <PointTracker 
                setIndex={currentSetIndex}
                gameIndex={currentGameIndex}
                isPlayerServing={currentGame.isPlayerServing}
                onPointAdded={handlePointAdded}
                onServerChange={handleServerChange}
              />
            ) : (
              <View style={styles.loadingContainer}>
                <Text>Setting up game...</Text>
              </View>
            )}
          </View>
          
          <View style={styles.buttonContainer}>
            <Button
              title="Finish Set"
              variant="outline"
              size="medium"
              onPress={handleFinishSet}
              style={styles.actionButton}
              disabled={currentSet.isCompleted}
            />
            <Button
              title="Finish Match"
              variant="outline"
              size="medium"
              onPress={handleFinishMatch}
              style={styles.actionButton}
            />
          </View>
        </ScrollView>

        {/* Comments Modal */}
        <Modal
          visible={showCommentsModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleSkipComments}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <MessageSquare size={24} color={Colors.primary} />
                <Text style={styles.modalTitle}>Match Comments</Text>
              </View>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={handleSkipComments}
              >
                <X size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.modalDescription}>
                Add any observations, thoughts, or notes about this match. This will help you track your progress and identify patterns in your game.
              </Text>
              
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.commentsInput}
                  placeholder="What went well? What could be improved? Any key moments or insights..."
                  placeholderTextColor={Colors.textSecondary}
                  value={comments}
                  onChangeText={setComments}
                  multiline
                  numberOfLines={8}
                  textAlignVertical="top"
                  maxLength={1000}
                  returnKeyType="done"
                  blurOnSubmit={true}
                  onSubmitEditing={handleCommentsDone}
                />
              </View>
              
              <Text style={styles.characterCount}>
                {comments.length}/1000 characters
              </Text>
              
              <Text style={styles.keyboardHint}>
                Tip: Tap "Done" on keyboard to dismiss keyboard
              </Text>
            </View>
            
            <View style={styles.modalButtons}>
              <Button
                title="Skip"
                variant="outline"
                size="medium"
                onPress={handleSkipComments}
                style={styles.modalButton}
              />
              <Button
                title="Save & Continue"
                variant="primary"
                size="medium"
                onPress={handleSaveComments}
                style={styles.modalButton}
              />
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    zIndex: 10,
  },
  setSelector: {
    position: 'relative',
    flex: 1,
  },
  setSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '15',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  setSelectorText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginRight: 8,
  },
  setSelectorDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: Colors.card,
    borderRadius: 8,
    marginTop: 4,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: 200,
  },
  setSelectorItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  setSelectorItemActive: {
    backgroundColor: Colors.primary + '20',
  },
  setSelectorItemText: {
    fontSize: 14,
    color: Colors.text,
  },
  setSelectorItemTextActive: {
    fontWeight: '600',
    color: Colors.primary,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  undoButton: {
    backgroundColor: Colors.secondary + '20',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.secondary + '40',
  },
  undoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
  },
  settingsButton: {
    padding: 8,
    backgroundColor: Colors.primary + '15',
    borderRadius: 8,
  },
  settingsPanel: {
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
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  settingDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 8,
  },
  trackerContainer: {
    flex: 1,
    minHeight: 300,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 16 : 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 8,
  },
  commentsInput: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 200,
    maxHeight: 300,
  },
  characterCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginTop: 8,
  },
  keyboardHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalButton: {
    flex: 1,
  },
});