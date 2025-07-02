import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { TiebreakPoint, ServeData, ShotType, ErrorType, TiebreakType, formatEnumValue } from '@/types/tennis';
import Button from '@/components/Button';
import Colors from '@/constants/colors';
import { useMatchStore } from '@/store/matchStore';
import { RefreshCw } from 'lucide-react-native';

interface TiebreakTrackerProps {
  setIndex: number;
  tiebreakType: TiebreakType;
  onTiebreakCompleted: () => void;
  onPointAdded: () => void;
}

export default function TiebreakTracker({ 
  setIndex, 
  tiebreakType,
  onTiebreakCompleted,
  onPointAdded
}: TiebreakTrackerProps) {
  const { addTiebreakPoint, currentMatch } = useMatchStore();
  const scrollViewRef = React.useRef<ScrollView>(null);
  
  const [serveData, setServeData] = useState<ServeData>({
    isFirstServeIn: false,
    isSecondServeIn: true,
    isDoubleFault: false
  });
  
  const [rallyLength, setRallyLength] = useState(0);
  const [shotType, setShotType] = useState<ShotType | undefined>(undefined);
  const [errorType, setErrorType] = useState<ErrorType | undefined>(undefined);
  const [isPlayerPoint, setIsPlayerPoint] = useState<boolean | null>(null);
  const [currentServer, setCurrentServer] = useState<'player' | 'opponent'>('player');
  const [firstPointServer, setFirstPointServer] = useState<'player' | 'opponent'>('player');
  const [pointsPlayed, setPointsPlayed] = useState(0);
  
  const currentSet = currentMatch?.sets[setIndex];
  const tiebreak = currentSet?.tiebreak;
  
  // Determine server based on tiebreak serve rules:
  // First point: whoever is set as firstPointServer serves
  // Then alternating: first server serves 1 point, then other server serves 2 points, then back to first server for 2 points, etc.
  useEffect(() => {
    if (tiebreak) {
      const totalPoints = tiebreak.points.length;
      setPointsPlayed(totalPoints);
      
      if (totalPoints === 0) {
        // First point - use the firstPointServer
        setCurrentServer(firstPointServer);
      } else {
        // Tiebreak serve rule: 1 point for first server, then 2 points each
        // Point 0: firstPointServer serves
        // Points 1-2: other server serves
        // Points 3-4: firstPointServer serves
        // etc.
        
        const otherServer = firstPointServer === 'player' ? 'opponent' : 'player';
        
        if (totalPoints === 1 || totalPoints === 2) {
          // Points 2 and 3 (1-indexed) - other server serves
          setCurrentServer(otherServer);
        } else {
          // After first 3 points, alternate every 2 points
          // Points 3+ follow pattern: 2 for firstPointServer, 2 for otherServer, etc.
          const pointsAfterFirst = totalPoints - 1; // Subtract the first point
          const serverChanges = Math.floor(pointsAfterFirst / 2);
          setCurrentServer(serverChanges % 2 === 0 ? otherServer : firstPointServer);
        }
      }
    }
  }, [tiebreak, firstPointServer]);
  
  const handleFirstServeChange = (isIn: boolean) => {
    setServeData(prev => ({
      ...prev,
      isFirstServeIn: isIn,
      isSecondServeIn: isIn ? false : prev.isSecondServeIn,
      isDoubleFault: isIn ? false : prev.isDoubleFault
    }));
  };
  
  const handleSecondServeChange = (isIn: boolean) => {
    if (!serveData.isFirstServeIn) {
      setServeData(prev => ({
        ...prev,
        isSecondServeIn: isIn,
        isDoubleFault: !isIn
      }));
    }
  };
  
  const handleDoubleFaultChange = (isDoubleFault: boolean) => {
    if (!serveData.isFirstServeIn) {
      setServeData(prev => ({
        ...prev,
        isSecondServeIn: !isDoubleFault,
        isDoubleFault
      }));
      
      if (isDoubleFault) {
        setIsPlayerPoint(currentServer === 'opponent');
        setShotType(undefined);
        setErrorType(undefined);
      }
    }
  };
  
  const handleShotTypeSelect = (type: ShotType) => {
    setShotType(type);
    setErrorType(undefined);
  };
  
  const handleErrorTypeSelect = (type: ErrorType) => {
    setErrorType(type);
    setShotType(undefined);
  };
  
  const handleServerChange = () => {
    // Only allow changing server before any points are played
    if (pointsPlayed === 0) {
      const newFirstServer = firstPointServer === 'player' ? 'opponent' : 'player';
      setFirstPointServer(newFirstServer);
      setCurrentServer(newFirstServer);
    }
  };
  
  const incrementRallyLength = () => {
    setRallyLength(prev => Math.min(50, prev + 1));
  };
  
  const decrementRallyLength = () => {
    setRallyLength(prev => Math.max(0, prev - 1));
  };

  const handleSliderChange = (value: number) => {
    setRallyLength(Math.round(value));
  };
  
  const handleSavePoint = () => {
    // Validate that point outcome is selected
    if (isPlayerPoint === null) {
      // Could add an alert or toast here to inform user
      return;
    }
    
    // DO NOT start timing for tiebreak points
    // Timing should only start with regular points
    
    const point: TiebreakPoint = {
      id: Date.now().toString(),
      isPlayerPoint,
      isPlayerServing: currentServer === 'player',
      serveData,
      rallyLength,
      shotType,
      errorType,
      timestamp: new Date().toISOString()
    };
    
    addTiebreakPoint(setIndex, point);
    
    // Check if tiebreak is completed after adding the point
    if (tiebreak) {
      const newPlayerPoints = tiebreak.playerPoints + (isPlayerPoint ? 1 : 0);
      const newOpponentPoints = tiebreak.opponentPoints + (isPlayerPoint ? 0 : 1);
      
      const minPointsToWin = getMinPointsToWin(tiebreakType);
      const isCompleted = (newPlayerPoints >= minPointsToWin && newPlayerPoints - newOpponentPoints >= 2) ||
                         (newOpponentPoints >= minPointsToWin && newOpponentPoints - newPlayerPoints >= 2);
      
      if (isCompleted) {
        onTiebreakCompleted();
        return; // Don't reset form if tiebreak is completed, as we'll navigate away
      }
    }
    
    // Notify parent that a point was added
    onPointAdded();
    
    // Reset form
    setServeData({
      isFirstServeIn: false,
      isSecondServeIn: true,
      isDoubleFault: false
    });
    setRallyLength(0);
    setShotType(undefined);
    setErrorType(undefined);
    setIsPlayerPoint(null);
    
    // Dismiss keyboard
    Keyboard.dismiss();
    
    // Scroll to top
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };
  
  const getMinPointsToWin = (type: TiebreakType): number => {
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
  };
  
  const getTiebreakName = (type: TiebreakType): string => {
    switch (type) {
      case TiebreakType.FIVE_POINT:
        return '5-Point Tiebreak';
      case TiebreakType.SEVEN_POINT:
        return '7-Point Tiebreak';
      case TiebreakType.TEN_POINT:
        return '10-Point Tiebreak';
      default:
        return 'Tiebreak';
    }
  };
  
  // Get serve pattern description
  const getServePatternDescription = (): string => {
    if (pointsPlayed === 0) {
      return "First point";
    } else if (pointsPlayed === 1 || pointsPlayed === 2) {
      return `Point ${pointsPlayed + 1} of 2`;
    } else {
      const pointsAfterFirst = pointsPlayed - 1;
      const currentGroup = Math.floor(pointsAfterFirst / 2);
      const positionInGroup = (pointsAfterFirst % 2) + 1;
      return `Point ${positionInGroup} of 2`;
    }
  };
  
  // Custom formatter for error types that removes "Unforced" from labels
  const formatErrorTypeForTiebreak = (type: ErrorType): string => {
    switch (type) {
      case ErrorType.FOREHAND_UNFORCED:
        return 'Forehand';
      case ErrorType.BACKHAND_UNFORCED:
        return 'Backhand';
      case ErrorType.VOLLEY_UNFORCED:
        return 'Volley';
      case ErrorType.SLICE_UNFORCED:
        return 'Slice';
      case ErrorType.DROPSHOT_UNFORCED:
        return 'Dropshot';
      case ErrorType.LOB_UNFORCED:
        return 'Lob';
      case ErrorType.OVERHEAD_UNFORCED:
        return 'Overhead';
      case ErrorType.FORCED_ERROR:
        return 'Forced Error';
      default:
        return formatEnumValue(type);
    }
  };
  
  // Get player and opponent names for server display
  const playerName = currentMatch?.player.name || "You";
  const opponentName = currentMatch?.opponent.name || "Opponent";
  
  // Organize shot types into 5x2 grid (5 rows, 2 columns)
  const shotTypeRows = [
    [ShotType.FOREHAND, ShotType.BACKHAND],
    [ShotType.VOLLEY, ShotType.SLICE],
    [ShotType.DROPSHOT, ShotType.LOB],
    [ShotType.OVERHEAD, ShotType.ACE],
    [ShotType.SERVE_UNRETURNED, ShotType.OPPONENT_UNFORCED_ERROR],
  ];
  
  // Organize error types into 4x2 grid (4 rows, 2 columns)
  const errorTypeRows = [
    [ErrorType.FOREHAND_UNFORCED, ErrorType.BACKHAND_UNFORCED],
    [ErrorType.VOLLEY_UNFORCED, ErrorType.SLICE_UNFORCED],
    [ErrorType.DROPSHOT_UNFORCED, ErrorType.LOB_UNFORCED],
    [ErrorType.OVERHEAD_UNFORCED, ErrorType.FORCED_ERROR],
  ];

  // Helper function to get button text style based on shot type - all enlarged for tiebreak
  const getShotTypeButtonTextStyle = (type: ShotType) => {
    // All shot types should have enlarged font in tiebreak
    return styles.enlargedButtonText;
  };

  // Helper function to get button text style based on error type - all enlarged for tiebreak
  const getErrorTypeButtonTextStyle = (type: ErrorType) => {
    // All error types should have enlarged font in tiebreak
    return styles.enlargedButtonText;
  };

  // Helper function to determine if a shot type button should be disabled
  const isShotTypeButtonDisabled = (type: ShotType): boolean => {
    // Base condition: disabled if not player point
    if (isPlayerPoint !== true) return true;
    
    // When opponent is serving and it's a double fault, disable all winner type buttons
    if (currentServer === 'opponent' && serveData.isDoubleFault) return true;
    
    // When opponent is serving and player wins the point (but not double fault), 
    // disable ACE and SERVE_UNRETURNED buttons
    if (currentServer === 'opponent' && isPlayerPoint === true && !serveData.isDoubleFault) {
      if (type === ShotType.ACE || type === ShotType.SERVE_UNRETURNED) {
        return true;
      }
    }
    
    return false;
  };
  
  if (!tiebreak) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Setting up tiebreak...</Text>
      </View>
    );
  }
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          ref={scrollViewRef}
          style={styles.container}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <View style={styles.tiebreakHeader}>
            <Text style={styles.tiebreakTitle}>{getTiebreakName(tiebreakType)}</Text>
            <Text style={styles.tiebreakScore}>
              {tiebreak.playerPoints} - {tiebreak.opponentPoints}
            </Text>
          </View>
          
          <View style={styles.serverInfo}>
            <View style={styles.serverRow}>
              <Text style={styles.serverLabel}>Server:</Text>
              <Text style={styles.serverName}>
                {currentServer === 'player' ? playerName : opponentName}
              </Text>
              <TouchableOpacity 
                style={[
                  styles.changeServerButton,
                  pointsPlayed > 0 && styles.disabledChangeServerButton
                ]}
                onPress={handleServerChange}
                disabled={pointsPlayed > 0}
              >
                <RefreshCw size={16} color={pointsPlayed > 0 ? Colors.textSecondary : Colors.primary} />
                <Text style={[
                  styles.changeServerText,
                  pointsPlayed > 0 && styles.disabledChangeServerText
                ]}>
                  Change
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pointInfoRow}>
              <Text style={styles.pointInfo}>
                Point {pointsPlayed + 1}
              </Text>
              <Text style={styles.servePattern}>
                {getServePatternDescription()}
              </Text>
            </View>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Serve</Text>
            <View style={styles.serveButtons}>
              <Button
                title="1st Serve In"
                variant={serveData.isFirstServeIn ? 'primary' : 'outline'}
                size="small"
                onPress={() => handleFirstServeChange(true)}
                style={styles.serveButton}
              />
              <Button
                title="1st Serve Out"
                variant={!serveData.isFirstServeIn ? 'primary' : 'outline'}
                size="small"
                onPress={() => handleFirstServeChange(false)}
                style={styles.serveButton}
              />
            </View>
            
            {!serveData.isFirstServeIn && (
              <View style={styles.serveButtons}>
                <Button
                  title="2nd Serve In"
                  variant={serveData.isSecondServeIn ? 'primary' : 'outline'}
                  size="small"
                  onPress={() => handleSecondServeChange(true)}
                  style={styles.serveButton}
                />
                <Button
                  title="Double Fault"
                  variant={serveData.isDoubleFault ? 'primary' : 'outline'}
                  size="small"
                  onPress={() => handleDoubleFaultChange(true)}
                  style={styles.serveButton}
                />
              </View>
            )}
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rally Length</Text>
            <View style={styles.rallyCounter}>
              <Button
                title="-"
                variant="outline"
                size="small"
                onPress={decrementRallyLength}
                style={styles.counterButton}
              />
              <Text style={styles.rallyCount}>{rallyLength}</Text>
              <Button
                title="+"
                variant="outline"
                size="small"
                onPress={incrementRallyLength}
                style={styles.counterButton}
              />
            </View>
            
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>0</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={50}
                value={rallyLength}
                onValueChange={handleSliderChange}
                step={1}
                minimumTrackTintColor={Colors.primary}
                maximumTrackTintColor={Colors.border}
              />
              <Text style={styles.sliderLabel}>50</Text>
            </View>
          </View>
          
          <View style={styles.section}>
            <Text style={[
              styles.sectionTitle,
              isPlayerPoint === null && styles.requiredSectionTitle
            ]}>
              Point Outcome {isPlayerPoint === null && '(Required)'}
            </Text>
            <View style={styles.outcomeButtons}>
              <Button
                title="Your Point"
                variant={isPlayerPoint === true ? 'primary' : 'outline'}
                size="small"
                onPress={() => setIsPlayerPoint(true)}
                style={styles.outcomeButton}
              />
              <Button
                title="Opponent Point"
                variant={isPlayerPoint === false ? 'primary' : 'outline'}
                size="small"
                onPress={() => setIsPlayerPoint(false)}
                style={styles.outcomeButton}
              />
            </View>
          </View>
          
          <View style={[
            styles.section,
            (isPlayerPoint !== true) && styles.disabledSection
          ]}>
            <Text style={[
              styles.sectionTitle,
              (isPlayerPoint !== true) && styles.disabledText
            ]}>
              Winner Type {(isPlayerPoint !== true) && '(Not applicable for opponent points)'}
            </Text>
            <View style={styles.rowContainer}>
              {shotTypeRows.map((row, rowIndex) => (
                <View key={`shot-row-${rowIndex}`} style={styles.buttonRow}>
                  {row.map((type) => {
                    const isDisabled = isShotTypeButtonDisabled(type);
                    return (
                      <Button
                        key={`shot-${type}`}
                        title={type === ShotType.OPPONENT_UNFORCED_ERROR ? 'Opponent Unforced Error' : formatEnumValue(type)}
                        variant={shotType === type ? 'primary' : 'outline'}
                        size="small"
                        onPress={() => handleShotTypeSelect(type)}
                        style={[
                          styles.rowButton,
                          isDisabled && styles.disabledButton
                        ]}
                        textStyle={getShotTypeButtonTextStyle(type)}
                        disabled={isDisabled}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
          
          <View style={[
            styles.section,
            (isPlayerPoint !== false) && styles.disabledSection
          ]}>
            <Text style={[
              styles.sectionTitle,
              (isPlayerPoint !== false) && styles.disabledText
            ]}>
              Error Type {(isPlayerPoint !== false) && '(Not applicable for your points)'}
            </Text>
            <View style={styles.rowContainer}>
              {errorTypeRows.map((row, rowIndex) => (
                <View key={`error-row-${rowIndex}`} style={styles.buttonRow}>
                  {row.map((type) => (
                    <Button
                      key={`error-${type}`}
                      title={formatErrorTypeForTiebreak(type)}
                      variant={errorType === type ? 'primary' : 'outline'}
                      size="small"
                      onPress={() => handleErrorTypeSelect(type)}
                      style={[
                        styles.rowButton,
                        (isPlayerPoint !== false) && styles.disabledButton
                      ]}
                      textStyle={getErrorTypeButtonTextStyle(type)}
                      disabled={isPlayerPoint !== false}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
          
          <Button
            title="Save Point"
            variant={isPlayerPoint === null ? 'outline' : 'primary'}
            size="large"
            onPress={handleSavePoint}
            style={[
              styles.saveButton,
              isPlayerPoint === null && styles.disabledSaveButton
            ]}
            disabled={isPlayerPoint === null}
          />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tiebreakHeader: {
    backgroundColor: Colors.primary + '15',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  tiebreakTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  tiebreakScore: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
  },
  serverInfo: {
    backgroundColor: Colors.primary + '15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  serverLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginRight: 8,
  },
  serverName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    flex: 1,
  },
  changeServerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  disabledChangeServerButton: {
    backgroundColor: Colors.textSecondary + '20',
  },
  changeServerText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  disabledChangeServerText: {
    color: Colors.textSecondary,
  },
  pointInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointInfo: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  servePattern: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 20,
  },
  disabledSection: {
    opacity: 0.5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: Colors.text,
  },
  requiredSectionTitle: {
    color: Colors.primary,
  },
  disabledText: {
    color: Colors.textSecondary,
  },
  serveButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  serveButton: {
    flex: 1,
  },
  rallyCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  counterButton: {
    width: 50,
  },
  rallyCount: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text,
    width: 50,
    textAlign: 'center',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    minWidth: 20,
    textAlign: 'center',
  },
  outcomeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  outcomeButton: {
    flex: 1,
  },
  rowContainer: {
    gap: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rowButton: {
    flex: 1,
    minHeight: 40, // Ensure consistent height
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    textAlign: 'center',
    fontSize: 11,
  },
  enlargedButtonText: {
    textAlign: 'center',
    fontSize: 14, // Increased from 12 to 14 for better visibility
  },
  smallerButtonText: {
    textAlign: 'center',
    fontSize: 9,
  },
  saveButton: {
    marginVertical: 20,
  },
  disabledSaveButton: {
    opacity: 0.6,
  },
});