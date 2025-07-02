import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import Slider from '@react-native-community/slider';
import { Point, ServeData, ShotType, ErrorType, formatEnumValue, formatErrorTypeValueWithoutUnforced } from '@/types/tennis';
import Button from '@/components/Button';
import Colors from '@/constants/colors';
import { useMatchStore } from '@/store/matchStore';

interface PointTrackerProps {
  setIndex: number;
  gameIndex: number;
  isPlayerServing: boolean;
  onPointAdded: () => void;
  onServerChange: (isPlayerServing: boolean) => void;
}

export default function PointTracker({ 
  setIndex, 
  gameIndex, 
  isPlayerServing,
  onPointAdded,
  onServerChange
}: PointTrackerProps) {
  const { addPoint, currentMatch, completeGame, startMatchTiming } = useMatchStore();
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
  
  // Update local state when the server changes from parent
  useEffect(() => {
    // This ensures the component reflects the current server state
  }, [isPlayerServing]);
  
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
        setIsPlayerPoint(!isPlayerServing);
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
  
  const handleSavePoint = () => {
    // Validate that point outcome is selected
    if (isPlayerPoint === null) {
      // Could add an alert or toast here to inform user
      return;
    }
    
    // Start timing if this is the first point of the match
    if (currentMatch && !currentMatch.startTime) {
      startMatchTiming();
    }
    
    const point: Point = {
      id: Date.now().toString(),
      isPlayerPoint,
      serveData,
      rallyLength,
      shotType,
      errorType,
      timestamp: new Date().toISOString(),
    };
    
    addPoint(setIndex, gameIndex, point);
    
    // Check if the game is completed after adding the point
    const currentSet = currentMatch?.sets[setIndex];
    const currentGame = currentSet?.games[gameIndex];
    
    if (currentGame?.isCompleted) {
      // If game is completed, update the set score immediately
      completeGame(setIndex, gameIndex);
      
      // Notify parent component that a point was added and game is completed
      onPointAdded();
      
      // Update the server automatically
      if (currentSet && currentSet.games.length > gameIndex + 1) {
        const nextGame = currentSet.games[gameIndex + 1];
        onServerChange(nextGame.isPlayerServing);
      }
    } else {
      // Just notify that a point was added
      onPointAdded();
    }
    
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
  
  const incrementRallyLength = () => {
    setRallyLength(prev => Math.min(50, prev + 1));
  };
  
  const decrementRallyLength = () => {
    setRallyLength(prev => Math.max(0, prev - 1));
  };

  const handleSliderChange = (value: number) => {
    setRallyLength(Math.round(value));
  };

  const toggleServer = () => {
    onServerChange(!isPlayerServing);
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

  // Helper function to get button text style based on shot type
  const getShotTypeButtonTextStyle = (type: ShotType) => {
    // All shot types should use enlarged text
    return styles.enlargedButtonText;
  };

  // Helper function to get button text style based on error type
  const getErrorTypeButtonTextStyle = (type: ErrorType) => {
    // All error types should use enlarged text
    return styles.enlargedErrorButtonText;
  };

  // Helper function to determine if a shot type button should be disabled
  const isShotTypeButtonDisabled = (type: ShotType): boolean => {
    // Base condition: disabled if not player point
    if (isPlayerPoint !== true) return true;
    
    // When opponent is serving and it's a double fault, disable all winner type buttons
    if (!isPlayerServing && serveData.isDoubleFault) return true;
    
    // When opponent is serving and player wins the point (but not double fault), 
    // disable ACE and SERVE_UNRETURNED buttons
    if (!isPlayerServing && isPlayerPoint === true && !serveData.isDoubleFault) {
      if (type === ShotType.ACE || type === ShotType.SERVE_UNRETURNED) {
        return true;
      }
    }
    
    return false;
  };
  
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
          <View style={styles.serverInfo}>
            <Text style={styles.serverLabel}>Server:</Text>
            <Text style={styles.serverName}>
              {isPlayerServing ? playerName : opponentName}
            </Text>
            <Button
              title="Change Server"
              variant="outline"
              size="small"
              onPress={toggleServer}
              style={styles.changeServerButton}
            />
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
                <View key={rowIndex} style={styles.buttonRow}>
                  {row.map((type) => {
                    const isDisabled = isShotTypeButtonDisabled(type);
                    return (
                      <Button
                        key={type}
                        title={formatEnumValue(type)}
                        variant={shotType === type ? 'primary' : 'outline'}
                        size="small"
                        onPress={() => handleShotTypeSelect(type)}
                        style={[
                          styles.rowButton,
                          isDisabled && styles.disabledButton
                        ]}
                        disabled={isDisabled}
                        textStyle={getShotTypeButtonTextStyle(type)}
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
                <View key={rowIndex} style={styles.buttonRow}>
                  {row.map((type) => (
                    <Button
                      key={type}
                      title={formatErrorTypeValueWithoutUnforced(type)}
                      variant={errorType === type ? 'primary' : 'outline'}
                      size="small"
                      onPress={() => handleErrorTypeSelect(type)}
                      style={[
                        styles.rowButton,
                        (isPlayerPoint !== false) && styles.disabledButton
                      ]}
                      disabled={isPlayerPoint !== false}
                      textStyle={getErrorTypeButtonTextStyle(type)}
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
  serverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
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
    marginLeft: 8,
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
    minHeight: 40,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    textAlign: 'center',
    fontSize: 10,
  },
  enlargedButtonText: {
    textAlign: 'center',
    fontSize: 14, // Increased from 12 to 14
    fontWeight: '500',
  },
  enlargedErrorButtonText: {
    textAlign: 'center',
    fontSize: 14, // Increased from 12 to 14
    fontWeight: '500',
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