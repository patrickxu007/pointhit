import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useMatchStore } from '@/store/matchStore';
import Colors from '@/constants/colors';
import { Brain, CheckCircle, Target, TrendingUp, RefreshCw, Play, Pause, Square, Volume2, Wifi, WifiOff, MessageCircle } from 'lucide-react-native';
import { Match, Point, Game, Set, ErrorType, ShotType, TiebreakPoint, MentalPhysicalState, formatEnumValue, calculateRallyLengthStats } from '@/types/tennis';

// Safe TTS initialization with proper error handling
let Speech: any = null;
let isSpeechInitialized = false;
let speechInitializationPromise: Promise<void> | null = null;

const initializeSpeechSafely = async (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return false;
  }

  if (isSpeechInitialized && Speech) {
    return true;
  }

  if (speechInitializationPromise) {
    try {
      await speechInitializationPromise;
      return isSpeechInitialized;
    } catch {
      return false;
    }
  }

  speechInitializationPromise = (async () => {
    try {
      // Add delay to ensure app is fully loaded
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Speech = await import('expo-speech');
      
      // Test if Speech is actually working
      if (Speech && typeof Speech.speak === 'function') {
        isSpeechInitialized = true;
        console.log('TTS initialized successfully');
      } else {
        throw new Error('Speech module not properly loaded');
      }
    } catch (error) {
      console.warn('Failed to initialize Speech module:', error);
      Speech = null;
      isSpeechInitialized = false;
      throw error;
    }
  })();

  try {
    await speechInitializationPromise;
    return isSpeechInitialized;
  } catch {
    speechInitializationPromise = null;
    return false;
  }
};

interface TTSState {
  isPlaying: boolean;
  currentSection: string | null;
  isPaused: boolean;
  isInitialized: boolean;
  initializationFailed: boolean;
}

interface ParsedInsights {
  openingStatement?: string;
  whatWentWell?: string[];
  areasToImprove?: string[];
  suggestedDrills?: string[];
  finalComments?: string;
}

export default function AIInsightsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { matches, updateMatchInsights } = useMatchStore();
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [ttsState, setTtsState] = useState<TTSState>({
    isPlaying: false,
    currentSection: null,
    isPaused: false,
    isInitialized: false,
    initializationFailed: false
  });
  
  const match = matches.find(m => m.id === id);
  
  // Initialize Speech module safely with proper error handling
  useEffect(() => {
    const initSpeech = async () => {
      try {
        const success = await initializeSpeechSafely();
        setTtsState(prev => ({ 
          ...prev, 
          isInitialized: success,
          initializationFailed: !success
        }));
      } catch (error) {
        console.warn('Speech initialization failed:', error);
        setTtsState(prev => ({ 
          ...prev, 
          isInitialized: false,
          initializationFailed: true
        }));
      }
    };
    
    // Delay initialization to avoid startup crashes
    const timer = setTimeout(initSpeech, 3000);
    return () => clearTimeout(timer);
  }, []);
  
  if (!match) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Match not found</Text>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!match.isCompleted) {
    return (
      <View style={styles.loadingContainer}>
        <Brain size={60} color={Colors.textSecondary} />
        <Text style={styles.notCompletedTitle}>Match Not Complete</Text>
        <Text style={styles.notCompletedText}>
          AI insights are only available for completed matches. Finish your match to get personalized coaching feedback.
        </Text>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getMatchResult = (): 'Won' | 'Lost' | 'Tied' => {
    const playerSetsWon = match.sets.filter(set => set.playerGames > set.opponentGames).length;
    const opponentSetsWon = match.sets.filter(set => set.opponentGames > set.playerGames).length;
    
    if (playerSetsWon > opponentSetsWon) {
      return 'Won';
    } else if (opponentSetsWon > playerSetsWon) {
      return 'Lost';
    } else {
      return 'Tied';
    }
  };
  
  const getMatchScore = () => {
    return match.sets.map(set => `${set.playerGames}-${set.opponentGames}`).join(', ');
  };

  const formatMatchDuration = (match: Match): string => {
    if (!match.totalDuration) {
      return 'Not tracked';
    }
    
    const totalMinutes = Math.floor(match.totalDuration / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}hr${minutes > 0 ? `${minutes}min` : ''}`;
    } else {
      return `${minutes}min`;
    }
  };

  // Enhanced parsing function that processes full content without limits
  const parseRawResponse = (rawResponse: string): ParsedInsights => {
    const parsed: ParsedInsights = {};
    
    try {
      let textContent = rawResponse;
      
      // Remove <think> and </think> tags
      textContent = textContent.replace(/<think>[\s\S]*?<\/think>/gi, '');
      
      // Check if the rawResponse is JSON and extract the insights field
      try {
        const jsonResponse = JSON.parse(textContent);
        if (jsonResponse.insights) {
          textContent = jsonResponse.insights;
        }
      } catch (jsonError) {
        // If it's not JSON, use the raw response as is
        console.log('Raw response is not JSON, using as plain text');
      }
      
      // Process the full content without any length restrictions
      const lines = textContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      const firstSectionIndex = lines.findIndex(line => 
        line.toLowerCase().includes('what went well') || 
        line.toLowerCase().includes('areas to improve') ||
        line.toLowerCase().includes('suggested drill')
      );
      
      if (firstSectionIndex > 0) {
        const openingLines = lines.slice(0, firstSectionIndex);
        let openingText = openingLines.join(' ').trim();
        
        // Enhanced cleaning of opening statement - remove all variations
        openingText = openingText
          .replace(/\*\*/g, '') // Remove ** characters
          .replace(/Opening Statement:?\s*/gi, '') // Remove "Opening Statement" text
          .replace(/^Opening Statement\s*/gi, '') // Remove "Opening Statement" at the beginning
          .replace(/Opening Statement$/gi, '') // Remove "Opening Statement" at the end
          .replace(/^\*\*Opening Statement\*\*:?\s*/gi, '') // Remove **Opening Statement**
          .replace(/\*\*Opening Statement\*\*$/gi, '') // Remove **Opening Statement** at the end
          .trim();
        
        // Accept any length of opening statement
        if (openingText.length > 0) {
          parsed.openingStatement = openingText;
        }
      }
      
    } catch (error) {
      console.warn('Error parsing raw response for display:', error);
    }
    
    return parsed;
  };

  // Enhanced helper function to clean and filter insight items with comprehensive filtering
  const cleanInsightItems = (items: string[]): string[] => {
    return items
      .map(item => item.trim()) // Trim whitespace
      .filter(item => item.length > 0) // Remove empty items
      .filter(item => {
        // More comprehensive regex to catch various emoji patterns
        // This catches:
        // - Just emojis: 🎯, 💡, etc.
        // - Emojis with whitespace: 🎯   , 💡 
        // - Emojis with special chars: 🎯*, 💡*, 🎯 *, etc.
        // - Multiple emojis: 🎯💡, 🎯 💡, etc.
        const emojiOnlyPattern = /^[🎯💡🎾🚀🌟🏆\s\*\-\•\.\,\!\?\:]+$/;
        return !emojiOnlyPattern.test(item);
      })
      .filter(item => {
        // Additional check for items that are just punctuation or special characters
        const punctuationOnlyPattern = /^[\s\*\-\•\.\,\!\?\:]+$/;
        return !punctuationOnlyPattern.test(item);
      })
      .filter(item => {
        // Filter out items that are just numbers or bullets without content
        const numberBulletPattern = /^[\d\.\)\s\-\•\*]+$/;
        return !numberBulletPattern.test(item);
      })
      .filter(item => {
        // Filter out items that are just section headers
        const headerPattern = /^(what|areas?|suggested?|training|drill|recommendation|practice|exercise|overall|final|opening|strength|weakness|improvement)/i;
        const isJustHeader = headerPattern.test(item) && item.split(' ').length <= 3;
        return !isJustHeader;
      });
  };

  // Get parsed insights or fallback to original
  const getDisplayInsights = () => {
    if (!match.aiInsights) return null;
    
    if (match.aiInsights.rawResponse) {
      const parsed = parseRawResponse(match.aiInsights.rawResponse);
      
      return {
        openingStatement: parsed.openingStatement,
        whatYouDidWell: cleanInsightItems(match.aiInsights.whatYouDidWell),
        areasToImprove: cleanInsightItems(match.aiInsights.areasToImprove).slice(0, 3), // Limit to 3 items
        trainingRecommendations: cleanInsightItems(match.aiInsights.trainingRecommendations).slice(0, 3), // Limit to 3 items
        overallAssessment: match.aiInsights.overallAssessment,
      };
    }
    
    return {
      openingStatement: undefined,
      whatYouDidWell: cleanInsightItems(match.aiInsights.whatYouDidWell),
      areasToImprove: cleanInsightItems(match.aiInsights.areasToImprove).slice(0, 3), // Limit to 3 items
      trainingRecommendations: cleanInsightItems(match.aiInsights.trainingRecommendations).slice(0, 3), // Limit to 3 items
      overallAssessment: match.aiInsights.overallAssessment,
    };
  };

  // Enhanced TTS Functions with super warm, engaging, lively personality
  const stopTTS = async () => {
    if (Platform.OS !== 'web' && Speech && ttsState.isInitialized) {
      try {
        await Speech.stop();
      } catch (error) {
        console.warn('Error stopping TTS:', error);
      }
    }
    setTtsState(prev => ({
      ...prev,
      isPlaying: false,
      currentSection: null,
      isPaused: false
    }));
  };

  const pauseTTS = async () => {
    if (Platform.OS !== 'web' && Speech && ttsState.isInitialized) {
      try {
        await Speech.pause();
        setTtsState(prev => ({ ...prev, isPaused: true, isPlaying: false }));
      } catch (error) {
        console.warn('Error pausing TTS:', error);
        Alert.alert('Oops!', 'Had a little trouble pausing the audio. Let me try that again!');
      }
    }
  };

  const resumeTTS = async () => {
    if (Platform.OS !== 'web' && Speech && ttsState.isInitialized) {
      try {
        await Speech.resume();
        setTtsState(prev => ({ ...prev, isPaused: false, isPlaying: true }));
      } catch (error) {
        console.warn('Error resuming TTS:', error);
        Alert.alert('Oops!', 'Had a little trouble resuming the audio. Let me try that again!');
      }
    }
  };

  const addSuperWarmPersonalityToText = (text: string, sectionName: string): string => {
    const superEnthusiasticGreetings = [
      "Hey there, tennis superstar! I am absolutely THRILLED to share your insights! ",
      "OH MY GOODNESS, are you ready for this? I am so excited to dive into your amazing performance! ",
      "Hello, champion! I can barely contain my excitement to share these incredible insights with you! ",
      "Hey there, tennis warrior! Get ready for the most enthusiastic coaching session ever! ",
      "WOW! I am practically bouncing with excitement to share your fantastic insights! ",
    ];

    const superLivelyTransitions = {
      strengths: [
        "First up, let me absolutely CELEBRATE what you crushed out there! I am so proud! ",
        "Let me start by practically shouting about the incredible things you did! This is amazing! ",
        "Time to give yourself the biggest celebration ever! Here is what you absolutely nailed: ",
        "OH MY GOODNESS, the things you did well are just phenomenal! Let me tell you: ",
        "I am literally getting goosebumps talking about your strengths! Check this out: ",
      ],
      improvements: [
        "Now, here come the most EXCITING opportunities to make you even more unstoppable! I am so pumped! ",
        "Get ready for the fun part - these amazing opportunities to level up your game! This is going to be incredible! ",
        "Time for my favorite part - the thrilling areas where you can become absolutely dominant! ",
        "Here are some absolutely fantastic opportunities that have me super excited for your future! ",
        "OH, this is the best part! These growth areas are going to make you absolutely phenomenal! ",
      ],
      training: [
        "And now for the MOST exciting part - your personalized roadmap to tennis greatness! I am so pumped! ",
        "Time for some absolutely thrilling training recommendations that will boost your game to the stars! ",
        "Get ready for the most fun and effective training plan that will make you unstoppable! ",
        "Here comes your amazing training adventure that I am so excited to share with you! ",
        "OH MY GOODNESS, these training recommendations are going to be absolutely incredible! ",
      ],
      overall: [
        "And here is the big picture of your absolutely amazing tennis journey! I am so proud! ",
        "Let me wrap this up with your incredible performance story that has me so excited! ",
        "Finally, here is what I think about your phenomenal match overall - this is so inspiring! ",
        "Time for the grand finale - your overall performance story that absolutely blew me away! ",
        "And here is my absolutely glowing assessment of your incredible tennis performance! ",
      ]
    };

    const superWarmEncouragements = [
      " You are absolutely incredible and I am so excited for your tennis future!",
      " Your dedication and heart really shine through and it makes me so proud!",
      " I am practically bursting with excitement to see your continued growth!",
      " Your tennis journey is absolutely inspiring and I cannot wait to see what comes next!",
      " You have such amazing potential and watching you play fills me with joy!",
      " Keep up that fantastic energy - you are destined for tennis greatness!",
    ];

    let enhancedText = text;
    
    if (sectionName === 'full') {
      const greeting = superEnthusiasticGreetings[Math.floor(Math.random() * superEnthusiasticGreetings.length)];
      enhancedText = greeting + text;
    } else if (sectionName in superLivelyTransitions) {
      const sectionTransitions = superLivelyTransitions[sectionName as keyof typeof superLivelyTransitions];
      const transition = sectionTransitions[Math.floor(Math.random() * sectionTransitions.length)];
      enhancedText = transition + text;
    }

    // Add super warm encouraging ending
    const encouragement = superWarmEncouragements[Math.floor(Math.random() * superWarmEncouragements.length)];
    enhancedText += encouragement;

    return enhancedText;
  };

  const speakText = async (text: string, sectionName: string) => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available on Web', 'Text-to-speech is not available on web, but it works amazingly on mobile! Download our app to get the full experience with your super enthusiastic AI tennis coach.');
      return;
    }

    if (ttsState.initializationFailed) {
      Alert.alert('Audio Not Available', 'Text-to-speech is not available on this device, but your incredible insights are ready to read!');
      return;
    }

    if (!ttsState.isInitialized) {
      Alert.alert('Audio Loading', 'Text-to-speech is still loading. Please try again in a moment.');
      return;
    }

    if (!Speech) {
      Alert.alert('Audio Not Ready', 'Text-to-speech is not ready yet. Please try again in a moment.');
      return;
    }

    try {
      // Stop any current speech
      await stopTTS();
      
      setTtsState(prev => ({
        ...prev,
        isPlaying: true,
        currentSection: sectionName,
        isPaused: false
      }));

      // Add super warm, lively personality to the text
      const enhancedText = addSuperWarmPersonalityToText(text, sectionName);

      await Speech.speak(enhancedText, {
        language: 'en-US',
        pitch: 1.2, // Higher pitch for more energy and warmth
        rate: 0.85, // Slightly slower for clarity but still lively
        onDone: () => {
          setTtsState(prev => ({
            ...prev,
            isPlaying: false,
            currentSection: null,
            isPaused: false
          }));
        },
        onError: (error: any) => {
          console.warn('TTS Error:', error);
          setTtsState(prev => ({
            ...prev,
            isPlaying: false,
            currentSection: null,
            isPaused: false
          }));
          Alert.alert('Audio Hiccup', 'Oops! Had a little trouble with the audio. Your amazing insights are still here to read though!');
        }
      });
    } catch (error) {
      console.error('TTS Error:', error);
      Alert.alert('Audio Not Available', 'Having trouble with audio right now, but your incredible insights are ready to read!');
      setTtsState(prev => ({
        ...prev,
        isPlaying: false,
        currentSection: null,
        isPaused: false
      }));
    }
  };

  const speakFullInsights = async () => {
    const displayInsights = getDisplayInsights();
    if (!displayInsights) return;

    const fullText = `
      ${displayInsights.openingStatement || 'Welcome to your absolutely phenomenal personalized match analysis! I am SO excited to break down your incredible performance against ' + match.opponent.name + '!'}
      
      What you absolutely crushed and I am so proud of:
      ${displayInsights.whatYouDidWell.join('. ')}
      
      Exciting areas where you can become even more amazing:
      ${displayInsights.areasToImprove.join('. ')}
      
      Your personalized training roadmap to tennis greatness:
      ${displayInsights.trainingRecommendations.join('. ')}
      
      Your overall performance story that has me so inspired:
      ${displayInsights.overallAssessment}
      
      Keep up the absolutely fantastic work, and remember - every match is an incredible step forward in your amazing tennis journey! I am so excited to see what you accomplish next!
    `;

    await speakText(fullText, 'full');
  };

  const speakSection = async (sectionName: string, items: string[], title: string) => {
    const text = `${title}: ${items.join('. ')}`;
    await speakText(text, sectionName);
  };

  // Generate fallback insights based on match statistics - no text limits
  const generateFallbackInsights = (matchData: any) => {
    const insights = {
      whatYouDidWell: [] as string[],
      areasToImprove: [] as string[],
      trainingRecommendations: [] as string[],
      overallAssessment: '',
      generatedAt: new Date().toISOString(),
      llmUsed: 'PointHit',
      rawResponse: undefined,
    };

    // Analyze strengths - no length limits
    if (matchData.matchResult === 'Won') {
      insights.whatYouDidWell.push('Congratulations on your victory! Your mental toughness and execution under pressure were key factors in securing the win.');
    }

    if (matchData.firstServePercentage >= 65) {
      insights.whatYouDidWell.push(`Excellent first serve percentage at ${matchData.firstServePercentage}%. Your serve was a reliable weapon throughout the match.`);
    }

    if (matchData.aces >= 3) {
      insights.whatYouDidWell.push(`Outstanding serving with ${matchData.aces} aces! Your power and placement on serve created free points.`);
    }

    if (matchData.winners > matchData.unforcedErrors) {
      insights.whatYouDidWell.push('Great shot selection and execution! You hit more winners than unforced errors, showing aggressive yet controlled play.');
    }

    // Rally length analysis - no length limits
    if (matchData.rallyLengthStats) {
      const { shortRallies, mediumRallies, longRallies } = matchData.rallyLengthStats;
      
      if (shortRallies.winPercentage >= 60) {
        insights.whatYouDidWell.push('Excellent performance in short rallies! Your aggressive early-ball striking and court positioning were very effective.');
      }
      
      if (longRallies.winPercentage >= 60) {
        insights.whatYouDidWell.push('Outstanding endurance and patience in long rallies! Your fitness and mental resilience really showed.');
      }
    }

    // Analyze areas for improvement - limit to 3 items
    if (matchData.doubleFaults >= 3) {
      insights.areasToImprove.push(`Work on second serve consistency. ${matchData.doubleFaults} double faults gave away free points to your opponent.`);
    }

    if (matchData.firstServePercentage < 55) {
      insights.areasToImprove.push(`First serve percentage of ${matchData.firstServePercentage}% needs improvement. Focus on rhythm and technique over power.`);
    }

    if (matchData.unforcedErrors > matchData.winners) {
      insights.areasToImprove.push('Reduce unforced errors by improving shot selection and maintaining better balance during rallies.');
    }

    // Limit to 3 items
    insights.areasToImprove = insights.areasToImprove.slice(0, 3);

    // Error analysis - no length limits
    const totalErrors = Object.values(matchData.errors).reduce((sum: number, count: any) => sum + count, 0);
    if (totalErrors > 0 && insights.areasToImprove.length < 3) {
      const maxErrorType = Object.entries(matchData.errors).reduce((max, [type, count]) => 
        (count as number) > max.count ? { type, count: count as number } : max, { type: '', count: 0 });
      
      if (maxErrorType.count >= 3) {
        insights.areasToImprove.push(`Focus on ${maxErrorType.type} technique - this was your most frequent error type with ${maxErrorType.count} occurrences.`);
      }
    }

    // Training recommendations - limit to 3 items
    if (matchData.doubleFaults >= 2) {
      insights.trainingRecommendations.push('Practice second serve placement drills. Focus on hitting to specific targets with consistent spin and depth.');
    }

    if (matchData.firstServePercentage < 60) {
      insights.trainingRecommendations.push('Work on serve rhythm with shadow serving and target practice. Start with 75% power and gradually increase.');
    }

    insights.trainingRecommendations.push('Practice point construction drills to improve shot selection and court positioning during rallies.');

    if (matchData.rallyLengthStats && matchData.rallyLengthStats.shortRallies.winPercentage < 50 && insights.trainingRecommendations.length < 3) {
      insights.trainingRecommendations.push('Work on aggressive return of serve and approach shot drills to improve short rally performance.');
    }

    // Limit to 3 items
    insights.trainingRecommendations = insights.trainingRecommendations.slice(0, 3);

    // Overall assessment - no length limits
    const winPercentage = Math.round((matchData.playerPoints / matchData.totalPoints) * 100);
    insights.overallAssessment = `You played with ${winPercentage}% point efficiency in this ${matchData.matchResult.toLowerCase()} against ${matchData.opponentName}. `;
    
    if (matchData.matchResult === 'Won') {
      insights.overallAssessment += 'Your victory demonstrates solid fundamentals and mental strength. Continue building on these strengths while addressing the improvement areas to elevate your game further.';
    } else {
      insights.overallAssessment += 'While the result wasn\'t what you wanted, there were many positive aspects to build upon. Focus on the improvement areas and keep working on your strengths.';
    }

    // Ensure we have content for all sections - no minimum length requirements
    if (insights.whatYouDidWell.length === 0) {
      insights.whatYouDidWell.push('You showed determination and fighting spirit throughout the match, which are essential qualities for improvement.');
    }

    if (insights.areasToImprove.length === 0) {
      insights.areasToImprove.push('Continue working on consistency and shot selection to take your game to the next level.');
    }

    if (insights.trainingRecommendations.length === 0) {
      insights.trainingRecommendations.push('Focus on regular practice sessions with emphasis on footwork, consistency, and mental preparation.');
    }

    return insights;
  };

  // Enhanced AI response parsing function with much more robust parsing
  const parseAIResponse = (rawResponse: string) => {
    const insights = {
      whatYouDidWell: [] as string[],
      areasToImprove: [] as string[],
      trainingRecommendations: [] as string[],
      overallAssessment: '',
    };

    try {
      // Clean the response first
      let cleanedResponse = rawResponse;
      
      // Remove <think> tags if present
      cleanedResponse = cleanedResponse.replace(/<think>[\s\S]*?<\/think>/gi, '');
      
      // Try to extract JSON if the response is wrapped in JSON
      try {
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonResponse = JSON.parse(jsonMatch[0]);
          if (jsonResponse.insights) {
            cleanedResponse = jsonResponse.insights;
          }
        }
      } catch (jsonError) {
        // If not JSON, continue with the original response
      }

      // Enhanced function to extract items from a section with much better parsing
      const extractItemsFromSection = (sectionText: string): string[] => {
        const items: string[] = [];
        
        // Split by lines and process each line
        const lines = sectionText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        let currentItem = '';
        
        for (const line of lines) {
          // Skip section headers
          if (isLikelySectionHeader(line)) {
            continue;
          }
          
          // Check if this line starts a new numbered/bulleted item
          const numberedMatch = line.match(/^(\d+[\.\)]\s*|[-•*]\s*|[a-zA-Z][\.\)]\s*)(.+)$/);
          if (numberedMatch && numberedMatch[2]) {
            // Save previous item if exists
            if (currentItem.trim()) {
              items.push(cleanItemText(currentItem.trim()));
            }
            // Start new item
            currentItem = numberedMatch[2].trim();
          } else if (line.length > 0 && !isLikelySectionHeader(line)) {
            // This is a continuation of the current item or a standalone item
            if (currentItem) {
              currentItem += ' ' + line;
            } else {
              currentItem = line;
            }
          }
        }
        
        // Add the last item
        if (currentItem.trim()) {
          items.push(cleanItemText(currentItem.trim()));
        }
        
        // Filter out invalid items
        return items.filter(item => {
          const cleaned = item.trim();
          return cleaned.length > 10 && // Minimum length for meaningful content
                 !isJustEmojisOrPunctuation(cleaned) &&
                 !isLikelySectionHeader(cleaned);
        });
      };

      // Helper function to check if a line is likely a section header
      const isLikelySectionHeader = (line: string): boolean => {
        const headerPatterns = [
          /^(what|areas?|suggested?|training|drill|recommendation|practice|exercise|overall|final|opening|strength|weakness|improvement)/i,
          /^(what\s+went\s+well|areas?\s+to\s+improve|suggested?\s+drill|training\s+recommendation)/i,
          /^\*\*(what|areas?|suggested?|training|drill|recommendation|practice|exercise|overall|final|opening|strength|weakness|improvement)/i
        ];
        
        return headerPatterns.some(pattern => pattern.test(line.trim())) && line.split(' ').length <= 5;
      };

      // Helper function to clean item text
      const cleanItemText = (text: string): string => {
        return text
          .replace(/^\*\*|\*\*$/g, '') // Remove ** at start/end
          .replace(/^[-•*]\s*/, '') // Remove bullet points
          .replace(/^\d+[\.\)]\s*/, '') // Remove numbers
          .replace(/^[a-zA-Z][\.\)]\s*/, '') // Remove letter bullets
          .trim();
      };

      // Helper function to check if text is just emojis or punctuation
      const isJustEmojisOrPunctuation = (text: string): boolean => {
        const emojiPunctuationPattern = /^[🎯💡🎾🚀🌟🏆\s\*\-\•\.\,\!\?\:\(\)]+$/;
        return emojiPunctuationPattern.test(text);
      };

      // Enhanced section detection with much better fuzzy matching
      const detectSectionInText = (text: string, sectionKeywords: string[]): { start: number; end: number } | null => {
        const lines = text.split('\n');
        let startIndex = -1;
        let endIndex = lines.length;
        
        // Find start of section
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].toLowerCase().trim();
          if (sectionKeywords.some(keyword => line.includes(keyword))) {
            startIndex = i;
            break;
          }
        }
        
        if (startIndex === -1) return null;
        
        // Find end of section (next section or end of text)
        const allSectionKeywords = [
          'what went well', 'what you did well', 'strengths', 'positives',
          'areas to improve', 'areas for improvement', 'improvement', 'weaknesses', 'areas to work on',
          'suggested drill', 'suggested drall', 'training', 'practice', 'recommendations', 'drills', 'dralls', 'exercises',
          'overall', 'final', 'assessment', 'summary', 'conclusion', 'opening statement'
        ];
        
        for (let i = startIndex + 1; i < lines.length; i++) {
          const line = lines[i].toLowerCase().trim();
          if (allSectionKeywords.some(keyword => keyword !== sectionKeywords.find(k => line.includes(k)) && line.includes(keyword))) {
            endIndex = i;
            break;
          }
        }
        
        return { start: startIndex, end: endIndex };
      };

      // Extract sections with enhanced detection
      const lines = cleanedResponse.split('\n');
      
      // What went well section
      const strengthsKeywords = ['what went well', 'what you did well', 'strengths', 'positives', 'what you crushed'];
      const strengthsSection = detectSectionInText(cleanedResponse, strengthsKeywords);
      if (strengthsSection) {
        const sectionText = lines.slice(strengthsSection.start, strengthsSection.end).join('\n');
        insights.whatYouDidWell = extractItemsFromSection(sectionText);
      }
      
      // Areas to improve section
      const improvementKeywords = ['areas to improve', 'areas for improvement', 'improvement', 'weaknesses', 'areas to work on', 'level up opportunities'];
      const improvementSection = detectSectionInText(cleanedResponse, improvementKeywords);
      if (improvementSection) {
        const sectionText = lines.slice(improvementSection.start, improvementSection.end).join('\n');
        insights.areasToImprove = extractItemsFromSection(sectionText);
      }
      
      // Training recommendations section (with typo tolerance)
      const trainingKeywords = ['suggested drill', 'suggested drall', 'training', 'practice', 'recommendations', 'drills', 'dralls', 'exercises', 'training roadmap', 'amazing training'];
      const trainingSection = detectSectionInText(cleanedResponse, trainingKeywords);
      if (trainingSection) {
        const sectionText = lines.slice(trainingSection.start, trainingSection.end).join('\n');
        insights.trainingRecommendations = extractItemsFromSection(sectionText);
      }
      
      // Overall assessment section
      const overallKeywords = ['overall', 'final', 'assessment', 'summary', 'conclusion', 'opening statement', 'performance story'];
      const overallSection = detectSectionInText(cleanedResponse, overallKeywords);
      if (overallSection) {
        const sectionText = lines.slice(overallSection.start, overallSection.end).join('\n');
        const overallItems = extractItemsFromSection(sectionText);
        if (overallItems.length > 0) {
          insights.overallAssessment = overallItems[0]; // Take the first substantial paragraph
        }
      }

      // Enforce limits for specific sections
      insights.areasToImprove = insights.areasToImprove.slice(0, 3);
      insights.trainingRecommendations = insights.trainingRecommendations.slice(0, 3);

    } catch (error) {
      console.error('Error parsing AI response:', error);
    }

    return insights;
  };

  const generateAIInsights = async () => {
    setIsGeneratingInsights(true);
    setNetworkError(null);
    
    try {
      const matchResult = getMatchResult();
      const matchScore = getMatchScore();
      const playerPoints = countPlayerPoints(match);
      const totalPoints = countTotalPoints(match);
      const opponentPoints = totalPoints - playerPoints;
      const matchDuration = formatMatchDuration(match);
      
      // Collect all statistics
      const firstServePercentage = calculateFirstServePercentage(match);
      const secondServePercentage = calculateSecondServePercentage(match);
      const aces = countAceWinners(match);
      const doubleFaults = countDoubleFaults(match);
      const totalWinners = countWinners(match);
      const unforcedErrors = countUnforcedErrors(match);
      
      // Direct Winners breakdown
      const directWinners = {
        forehand: countForehandWinners(match),
        backhand: countBackhandWinners(match),
        volley: countVolleyWinners(match),
        dropshot: countDropshotWinners(match),
        overhead: countOverheadWinners(match),
        lob: countLobWinners(match),
        ace: countAceWinners(match),
        slice: countSliceWinners(match),
      };
      
      // Unreturned Shots breakdown
      const unreturnedShots = {
        forehand: countForehandUnreturned(match),
        backhand: countBackhandUnreturned(match),
        volley: countVolleyUnreturned(match),
        dropshot: countDropshotUnreturned(match),
        overhead: countOverheadUnreturned(match),
        lob: countLobUnreturned(match),
        serve: countServeUnreturned(match),
        slice: countSliceUnreturned(match),
      };
      
      // Unforced Errors breakdown (removed moonBall)
      const errors = {
        forehand: countForehandUnforcedErrors(match),
        backhand: countBackhandUnforcedErrors(match),
        volley: countVolleyUnforcedErrors(match),
        dropshot: countDropshotUnforcedErrors(match),
        overhead: countOverheadUnforcedErrors(match),
        slice: countSliceUnforcedErrors(match),
        doubleFault: countDoubleFaults(match),
      };

      // Mental & Physical States breakdown
      const mentalPhysicalStates = getMentalPhysicalStatesBreakdown(match);

      // Rally Length Analysis
      const allMatchPoints = getAllMatchPoints(match);
      const rallyLengthStats = calculateRallyLengthStats(allMatchPoints);
      
      // Points per set breakdown
      const pointsPerSet = match.sets.map((set, index) => {
        const setPoints = getPointsPerSet(match, index);
        return {
          set: index + 1,
          player: setPoints.player,
          opponent: setPoints.opponent
        };
      });

      const matchData = {
        playerName: match.player.name,
        opponentName: match.opponent.name,
        matchResult,
        finalScore: matchScore,
        matchDuration,
        totalPoints,
        playerPoints,
        opponentPoints,
        firstServePercentage,
        secondServePercentage,
        aces,
        doubleFaults,
        winners: totalWinners,
        unforcedErrors,
        directWinners,
        unreturnedShots,
        errors,
        mentalPhysicalStates,
        pointsPerSet,
        rallyLengthStats: {
          shortRallies: rallyLengthStats.shortRallies,
          mediumRallies: rallyLengthStats.mediumRallies,
          longRallies: rallyLengthStats.longRallies,
          averageLength: rallyLengthStats.averageLength,
          totalPointsWithRallyData: rallyLengthStats.totalPointsWithRallyData,
        },
        // Include match comments for comprehensive AI analysis
        comments: match.comments || ''
      };

      console.log(`[${new Date().toISOString()}] Making direct request to AI service`);

      // Direct fetch to AI service without tRPC middleware
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch('https://pointhit.com/tennis-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'PointHit-App/1.3.3',
          'X-Client-Platform': Platform.OS,
          'X-Request-Source': 'production',
        },
        body: JSON.stringify({ data: matchData }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`[${new Date().toISOString()}] AI service response status:`, response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${new Date().toISOString()}] AI service error:`, response.status, errorText);
        throw new Error(`AI service responded with status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error(`[${new Date().toISOString()}] AI service returned non-JSON:`, contentType);
        throw new Error(`AI service returned ${contentType} instead of JSON`);
      }

      const aiResult = await response.json();
      console.log(`[${new Date().toISOString()}] AI service response received:`, !!aiResult.insights);
      
      if (aiResult.insights) {
        // Parse the AI response using the enhanced parser - with item limits
        const rawResponse = typeof aiResult.insights === 'string' ? aiResult.insights : JSON.stringify(aiResult.insights);
        const parsedInsights = parseAIResponse(rawResponse);
        
        const insights = {
          whatYouDidWell: parsedInsights.whatYouDidWell,
          areasToImprove: parsedInsights.areasToImprove,
          trainingRecommendations: parsedInsights.trainingRecommendations,
          overallAssessment: parsedInsights.overallAssessment,
          generatedAt: new Date().toISOString(),
          llmUsed: 'AI Coach',
          rawResponse: rawResponse,
        };

        // Fallback to generated insights if parsing failed - with limits
        if (insights.whatYouDidWell.length === 0 || insights.areasToImprove.length === 0) {
          console.log(`[${new Date().toISOString()}] AI parsing failed, using fallback insights`);
          const fallbackInsights = generateFallbackInsights(matchData);
          updateMatchInsights(match.id, {
            ...fallbackInsights,
            rawResponse: rawResponse,
            llmUsed: 'AI Coach + PointHit Fallback'
          });
          Alert.alert('Insights Ready! 📊', 'Generated personalized insights for your match with incredible enthusiasm. Check them out below!');
          return;
        }

        console.log(`[${new Date().toISOString()}] Successfully generated AI insights`);
        updateMatchInsights(match.id, insights);
        Alert.alert('Success! 🎾', 'Your personalized AI insights are ready! Tap the audio button to hear your super enthusiastic coaching session!');
      } else {
        throw new Error('No insights in AI response');
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] AI insights generation failed:`, error);
      
      // Enhanced error handling for different types of failures
      let errorMessage = 'AI service unavailable, using PointHit analysis';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'AI service timeout, using PointHit analysis';
          setNetworkError('Request timeout - please check your internet connection and try again.');
        } else if (error.message.includes('Network request failed')) {
          errorMessage = 'Network connection failed, using PointHit analysis';
          setNetworkError('Unable to connect to the AI service. Please check your internet connection and try again.');
        } else if (error.message.includes('JSON Parse error')) {
          errorMessage = 'AI service returned invalid response, using PointHit analysis';
          setNetworkError('AI service returned invalid response. Please try again.');
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Unable to connect to AI service, using PointHit analysis';
          setNetworkError('Unable to connect to the AI service. Please check your internet connection and try again.');
        } else {
          setNetworkError('Unable to connect to the AI service. Please check your internet connection and try again.');
        }
      }
      
      // Return fallback insights - with limits
      const matchResult = getMatchResult();
      const matchScore = getMatchScore();
      const playerPoints = countPlayerPoints(match);
      const totalPoints = countTotalPoints(match);
      const opponentPoints = totalPoints - playerPoints;
      const matchDuration = formatMatchDuration(match);
      
      const firstServePercentage = calculateFirstServePercentage(match);
      const secondServePercentage = calculateSecondServePercentage(match);
      const aces = countAceWinners(match);
      const doubleFaults = countDoubleFaults(match);
      const totalWinners = countWinners(match);
      const unforcedErrors = countUnforcedErrors(match);
      
      const directWinners = {
        forehand: countForehandWinners(match),
        backhand: countBackhandWinners(match),
        volley: countVolleyWinners(match),
        dropshot: countDropshotWinners(match),
        overhead: countOverheadWinners(match),
        lob: countLobWinners(match),
        ace: countAceWinners(match),
        slice: countSliceWinners(match),
      };
      
      const unreturnedShots = {
        forehand: countForehandUnreturned(match),
        backhand: countBackhandUnreturned(match),
        volley: countVolleyUnreturned(match),
        dropshot: countDropshotUnreturned(match),
        overhead: countOverheadUnreturned(match),
        lob: countLobUnreturned(match),
        serve: countServeUnreturned(match),
        slice: countSliceUnreturned(match),
      };
      
      const errors = {
        forehand: countForehandUnforcedErrors(match),
        backhand: countBackhandUnforcedErrors(match),
        volley: countVolleyUnforcedErrors(match),
        dropshot: countDropshotUnforcedErrors(match),
        overhead: countOverheadUnforcedErrors(match),
        slice: countSliceUnforcedErrors(match),
        doubleFault: countDoubleFaults(match),
      };

      const mentalPhysicalStates = getMentalPhysicalStatesBreakdown(match);
      const allMatchPoints = getAllMatchPoints(match);
      const rallyLengthStats = calculateRallyLengthStats(allMatchPoints);
      
      const pointsPerSet = match.sets.map((set, index) => {
        const setPoints = getPointsPerSet(match, index);
        return {
          set: index + 1,
          player: setPoints.player,
          opponent: setPoints.opponent
        };
      });

      const matchData = {
        playerName: match.player.name,
        opponentName: match.opponent.name,
        matchResult,
        finalScore: matchScore,
        matchDuration,
        totalPoints,
        playerPoints,
        opponentPoints,
        firstServePercentage,
        secondServePercentage,
        aces,
        doubleFaults,
        winners: totalWinners,
        unforcedErrors,
        directWinners,
        unreturnedShots,
        errors,
        mentalPhysicalStates,
        pointsPerSet,
        rallyLengthStats: {
          shortRallies: rallyLengthStats.shortRallies,
          mediumRallies: rallyLengthStats.mediumRallies,
          longRallies: rallyLengthStats.longRallies,
          averageLength: rallyLengthStats.averageLength,
          totalPointsWithRallyData: rallyLengthStats.totalPointsWithRallyData,
        },
        comments: match.comments || ''
      };

      const fallbackInsights = generateFallbackInsights(matchData);
      updateMatchInsights(match.id, fallbackInsights);
      Alert.alert('Insights Ready! 📊', 'Generated personalized insights for your match. Check them out below!');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // Only auto-generate insights if they don't exist and the component is fully mounted
  useEffect(() => {
    // Add a delay to prevent initialization issues
    const timer = setTimeout(() => {
      if (!match.aiInsights && !isGeneratingInsights) {
        generateAIInsights();
      }
    }, 1000); // 1 second delay

    return () => clearTimeout(timer);
  }, [match.id]); // Only depend on match.id to prevent unnecessary re-runs

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      if (Platform.OS !== 'web' && Speech && ttsState.isInitialized) {
        Speech.stop().catch(console.warn);
      }
    };
  }, [ttsState.isInitialized]);

  const renderNetworkError = () => {
    if (!networkError) return null;

    return (
      <View style={styles.networkErrorContainer}>
        <WifiOff size={24} color={Colors.error} />
        <Text style={styles.networkErrorTitle}>Connection Issue</Text>
        <Text style={styles.networkErrorText}>{networkError}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={generateAIInsights}
          disabled={isGeneratingInsights}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTTSControls = () => {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.webTTSMessage}>
          <Volume2 size={20} color={Colors.textSecondary} />
          <Text style={styles.webTTSText}>
            🎧 Super enthusiastic audio coaching available on mobile app
          </Text>
        </View>
      );
    }

    if (ttsState.initializationFailed) {
      return (
        <View style={styles.webTTSMessage}>
          <Volume2 size={20} color={Colors.textSecondary} />
          <Text style={styles.webTTSText}>
            🎧 Audio coaching not available on this device
          </Text>
        </View>
      );
    }

    if (!ttsState.isInitialized) {
      return (
        <View style={styles.webTTSMessage}>
          <Volume2 size={20} color={Colors.textSecondary} />
          <Text style={styles.webTTSText}>
            🎧 Initializing audio coaching...
          </Text>
        </View>
      );
    }

    const isAnyTTSActive = ttsState.isPlaying || ttsState.isPaused;

    return (
      <View style={styles.ttsControls}>
        {/* Main Play Button - Always visible when not playing */}
        {!isAnyTTSActive && (
          <TouchableOpacity
            style={[styles.ttsButton, styles.ttsPlayButton]}
            onPress={speakFullInsights}
          >
            <Volume2 size={16} color="#fff" />
            <Text style={styles.ttsButtonText}>🎧 Listen to Your Super Coach</Text>
          </TouchableOpacity>
        )}

        {/* Control Buttons Row - Only visible when TTS is active */}
        {isAnyTTSActive && (
          <View style={styles.ttsControlsRow}>
            {/* Resume Button - Only when paused */}
            {ttsState.isPaused && (
              <TouchableOpacity
                style={[styles.ttsButton, styles.ttsResumeButton]}
                onPress={resumeTTS}
              >
                <Play size={16} color="#fff" />
                <Text style={styles.ttsButtonText}>Resume</Text>
              </TouchableOpacity>
            )}

            {/* Pause Button - Only when playing */}
            {ttsState.isPlaying && !ttsState.isPaused && (
              <TouchableOpacity
                style={[styles.ttsButton, styles.ttsPauseButton]}
                onPress={pauseTTS}
              >
                <Pause size={16} color="#fff" />
                <Text style={styles.ttsButtonText}>Pause</Text>
              </TouchableOpacity>
            )}

            {/* Stop Button - Always visible when TTS is active */}
            <TouchableOpacity
              style={[styles.ttsButton, styles.ttsStopButton]}
              onPress={stopTTS}
            >
              <Square size={16} color="#fff" />
              <Text style={styles.ttsButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status Indicator */}
        {isAnyTTSActive && (
          <View style={styles.ttsStatus}>
            <View style={[styles.ttsStatusIndicator, ttsState.isPlaying && !ttsState.isPaused && styles.ttsStatusPlaying]} />
            <Text style={styles.ttsStatusText}>
              {ttsState.isPaused ? '⏸️ Paused' : ttsState.isPlaying ? '🎵 Playing' : '⏹️ Stopped'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderSectionTTSButton = (sectionName: string, items: string[], title: string) => {
    if (Platform.OS === 'web' || !ttsState.isInitialized || ttsState.initializationFailed) {
      return null;
    }

    const isCurrentSection = ttsState.currentSection === sectionName;
    const isPlaying = isCurrentSection && ttsState.isPlaying && !ttsState.isPaused;

    return (
      <TouchableOpacity
        style={[styles.sectionTTSButton, isCurrentSection && styles.activeTTSButton]}
        onPress={() => speakSection(sectionName, items, title)}
        disabled={ttsState.isPlaying && !ttsState.isPaused && !isCurrentSection}
      >
        {isPlaying ? (
          <Pause size={14} color={isCurrentSection ? "#fff" : Colors.primary} />
        ) : (
          <Play size={14} color={isCurrentSection ? "#fff" : Colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  const renderLLMInfo = () => {
    if (!match.aiInsights?.llmUsed) return null;

    // Replace "Fallback Analysis" with "PointHit"
    const displayLLM = match.aiInsights.llmUsed === 'Fallback Analysis' ? 'PointHit' : match.aiInsights.llmUsed;

    return (
      <View style={styles.llmInfo}>
        <Text style={styles.llmInfoText}>
          🤖 Powered by: {displayLLM}
        </Text>
      </View>
    );
  };

  const renderOpeningStatement = (openingStatement: string) => {
    return (
      <View style={styles.openingStatement}>
        <View style={styles.openingStatementHeader}>
          <MessageCircle size={20} color={Colors.primary} />
          <Text style={styles.openingStatementTitle}>Your AI Coach Says</Text>
        </View>
        <Text style={styles.openingStatementText}>{openingStatement}</Text>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "🎾 AI Coach Insights" }} />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          {match.aiInsights && (
            <TouchableOpacity 
              style={styles.refreshButton} 
              onPress={generateAIInsights}
              disabled={isGeneratingInsights}
              activeOpacity={0.7}
            >
              {isGeneratingInsights ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <RefreshCw size={20} color={Colors.primary} />
              )}
              <Text style={styles.refreshText}>
                {isGeneratingInsights ? 'Generating...' : 'Refresh'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.matchSummary}>
          <Text style={styles.matchTitle}>
            {match.player.name} vs {match.opponent.name}
          </Text>
          <Text style={styles.matchResult}>
            Result: {getMatchResult()} ({getMatchScore()})
          </Text>
        </View>

        {networkError && renderNetworkError()}

        {match.aiInsights && renderTTSControls()}

        {isGeneratingInsights && !match.aiInsights ? (
          <View style={styles.loadingInsights}>
            <Brain size={60} color={Colors.primary} />
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 16 }} />
            <Text style={styles.loadingTitle}>🎾 Analyzing Your Amazing Performance</Text>
            <Text style={styles.loadingText}>
              Your super enthusiastic AI tennis coach is reviewing every incredible point, analyzing your fantastic strengths, and preparing the most exciting personalized insights just for you...
            </Text>
            <View style={styles.connectionStatus}>
              <Wifi size={16} color={Colors.textSecondary} />
              <Text style={styles.connectionText}>Connecting to AI coaching service...</Text>
            </View>
          </View>
        ) : match.aiInsights ? (
          <View style={styles.insightsContent}>
            {(() => {
              const displayInsights = getDisplayInsights();
              if (!displayInsights) return null;

              return (
                <>
                  {displayInsights.openingStatement && renderOpeningStatement(displayInsights.openingStatement)}
                  
                  <View style={styles.insightSection}>
                    <View style={styles.insightSectionHeader}>
                      <CheckCircle size={20} color={Colors.success} />
                      <Text style={styles.insightSectionTitle}>🌟 What You Absolutely Crushed</Text>
                      {renderSectionTTSButton('strengths', displayInsights.whatYouDidWell, 'What you absolutely crushed')}
                    </View>
                    <View style={styles.insightList}>
                      {displayInsights.whatYouDidWell.map((item, index) => (
                        <View key={index} style={styles.insightItem}>
                          <Text style={styles.insightBullet}>🎯</Text>
                          <Text style={styles.insightText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  
                  <View style={styles.insightSection}>
                    <View style={styles.insightSectionHeader}>
                      <Target size={20} color={Colors.error} />
                      <Text style={styles.insightSectionTitle}>🚀 Exciting Level Up Opportunities</Text>
                      {renderSectionTTSButton('improvements', displayInsights.areasToImprove, 'Exciting areas to improve')}
                    </View>
                    <View style={styles.insightList}>
                      {displayInsights.areasToImprove.map((item, index) => (
                        <View key={index} style={styles.insightItem}>
                          <Text style={styles.insightBullet}>💡</Text>
                          <Text style={styles.insightText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  
                  <View style={styles.insightSection}>
                    <View style={styles.insightSectionHeader}>
                      <TrendingUp size={20} color={Colors.primary} />
                      <Text style={styles.insightSectionTitle}>🏆 Amazing Training Roadmap</Text>
                      {renderSectionTTSButton('training', displayInsights.trainingRecommendations, 'Amazing training recommendations')}
                    </View>
                    <View style={styles.insightList}>
                      {displayInsights.trainingRecommendations.map((item, index) => (
                        <View key={index} style={styles.insightItem}>
                          <Text style={styles.insightBullet}>🎾</Text>
                          <Text style={styles.insightText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  
                  <View style={styles.overallAssessment}>
                    <View style={styles.overallAssessmentHeader}>
                      <Text style={styles.overallAssessmentTitle}>📊 Your Overall Performance Story</Text>
                      {renderSectionTTSButton('overall', [displayInsights.overallAssessment], 'Your incredible overall assessment')}
                    </View>
                    <Text style={styles.overallAssessmentText}>{displayInsights.overallAssessment}</Text>
                  </View>
                </>
              );
            })()}
            
            {renderLLMInfo()}
            
            <Text style={styles.generatedAt}>
              Generated on {new Date(match.aiInsights.generatedAt).toLocaleDateString()} ✨
            </Text>
          </View>
        ) : (
          <View style={styles.noInsightsContainer}>
            <Brain size={60} color={Colors.textSecondary} />
            <Text style={styles.noInsightsTitle}>No Insights Available</Text>
            <Text style={styles.noInsightsText}>
              Unable to generate AI insights for this match. Please try again.
            </Text>
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={generateAIInsights}
              disabled={isGeneratingInsights}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </>
  );
}

// Helper functions (same as in match details)
function getAllMatchPoints(match: Match): (Point | TiebreakPoint)[] {
  const regularPoints = match.sets
    .flatMap((set: Set) => set.games)
    .flatMap((game: Game) => game.points);
  
  const tiebreakPoints = match.sets
    .filter((set: Set) => set.tiebreak && Array.isArray(set.tiebreak.points))
    .flatMap((set: Set) => set.tiebreak?.points || []);
  
  return [...regularPoints, ...tiebreakPoints];
}

function countTotalPoints(match: Match): number {
  return getAllMatchPoints(match).length;
}

function countPlayerPoints(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  return allPoints.filter(point => point.isPlayerPoint === true).length;
}

// Helper function to check if a point is a regular Point (has serveData)
function isRegularPoint(point: Point | TiebreakPoint): point is Point {
  return 'serveData' in point;
}

function isPlayerServingPoint(point: Point | TiebreakPoint, match: Match): boolean {
  // For regular points, find the game they belong to
  if (isRegularPoint(point)) {
    const game = match.sets
      .flatMap(set => set.games)
      .find(game => game.points.includes(point));
    
    if (game) {
      return Boolean(game.isPlayerServing);
    }
  }
  
  // For tiebreak points, check if isPlayerServing is defined
  if ('isPlayerServing' in point && typeof point.isPlayerServing === 'boolean') {
    return point.isPlayerServing;
  }
  
  // Default fallback
  return false;
}

function getPointsPerSet(match: Match, setIndex: number): { player: number; opponent: number } {
  const set = match.sets[setIndex];
  if (!set) return { player: 0, opponent: 0 };
  
  const regularGamePoints = set.games.flatMap(game => game.points);
  const playerRegularPoints = regularGamePoints.filter(point => point.isPlayerPoint === true).length;
  const opponentRegularPoints = regularGamePoints.filter(point => point.isPlayerPoint === false).length;
  
  let playerTiebreakPoints = 0;
  let opponentTiebreakPoints = 0;
  
  if (set.tiebreak) {
    if (set.tiebreak.points && set.tiebreak.points.length > 0) {
      playerTiebreakPoints = set.tiebreak.points.filter(point => point.isPlayerPoint === true).length;
      opponentTiebreakPoints = set.tiebreak.points.filter(point => point.isPlayerPoint === false).length;
    } else {
      playerTiebreakPoints = set.tiebreak.playerPoints || 0;
      opponentTiebreakPoints = set.tiebreak.opponentPoints || 0;
    }
  }
  
  return {
    player: playerRegularPoints + playerTiebreakPoints,
    opponent: opponentRegularPoints + opponentTiebreakPoints
  };
}

function getMentalPhysicalStatesBreakdown(match: Match): { [key: string]: number } {
  const allPoints = getAllMatchPoints(match);
  const statesCount: { [key: string]: number } = {};
  
  allPoints.forEach(point => {
    if (point.mentalPhysicalStates && Array.isArray(point.mentalPhysicalStates)) {
      point.mentalPhysicalStates.forEach(state => {
        statesCount[state] = (statesCount[state] || 0) + 1;
      });
    }
  });
  
  return statesCount;
}

function calculateFirstServePercentage(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  const servingPoints = allPoints.filter(point => isPlayerServingPoint(point, match));
  const regularServingPoints = servingPoints.filter(isRegularPoint);
  const totalFirstServeAttempts = regularServingPoints.length;
  const successfulFirstServes = regularServingPoints.filter(point => point.serveData.isFirstServeIn === true).length;
  
  return totalFirstServeAttempts > 0 
    ? Math.round((successfulFirstServes / totalFirstServeAttempts) * 100) 
    : 0;
}

function calculateSecondServePercentage(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  const servingPoints = allPoints.filter(point => isPlayerServingPoint(point, match));
  const regularServingPoints = servingPoints.filter(isRegularPoint);
  const secondServeOpportunities = regularServingPoints.filter(point => point.serveData.isFirstServeIn === false).length;
  const successfulSecondServes = regularServingPoints.filter(point => 
    point.serveData.isFirstServeIn === false && point.serveData.isDoubleFault === false
  ).length;
  
  return secondServeOpportunities > 0 
    ? Math.round((successfulSecondServes / secondServeOpportunities) * 100) 
    : 0;
}

function countDoubleFaults(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  const servingPoints = allPoints.filter(point => isPlayerServingPoint(point, match));
  const regularServingPoints = servingPoints.filter(isRegularPoint);
  return regularServingPoints.filter(point => point.serveData.isDoubleFault === true).length;
}

function countWinners(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  return allPoints.filter(point => 
    point.isPlayerPoint === true && point.shotType !== undefined && point.shotType !== ShotType.NONE
  ).length;
}

function countUnforcedErrors(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  const regularPoints = allPoints.filter(isRegularPoint);
  const servingPoints = regularPoints.filter(point => isPlayerServingPoint(point, match));
  
  return allPoints.filter(point => {
    return point.isPlayerPoint === false && 
           ((point.errorType && (point.errorType.includes('UNFORCED') || point.errorType === ErrorType.FORCED_ERROR)) || 
           (isRegularPoint(point) && isPlayerServingPoint(point, match) && point.serveData.isDoubleFault === true));
  }).length;
}

function countAceWinners(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  return allPoints.filter(point => {
    return isPlayerServingPoint(point, match) && 
           point.isPlayerPoint === true && 
           point.shotType === ShotType.ACE;
  }).length;
}

function countForehandWinners(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  return allPoints.filter(point => 
    point.isPlayerPoint === true && point.shotType === ShotType.FOREHAND
  ).length;
}

function countBackhandWinners(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  return allPoints.filter(point => 
    point.isPlayerPoint === true && point.shotType === ShotType.BACKHAND
  ).length;
}

function countVolleyWinners(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  return allPoints.filter(point => 
    point.isPlayerPoint === true && point.shotType === ShotType.VOLLEY
  ).length;
}

function countDropshotWinners(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  return allPoints.filter(point => 
    point.isPlayerPoint === true && point.shotType === ShotType.DROPSHOT
  ).length;
}

function countOverheadWinners(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  return allPoints.filter(point => 
    point.isPlayerPoint === true && point.shotType === ShotType.OVERHEAD
  ).length;
}

function countLobWinners(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  return allPoints.filter(point => 
    point.isPlayerPoint === true && point.shotType === ShotType.LOB
  ).length;
}

function countSliceWinners(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  return allPoints.filter(point => 
    point.isPlayerPoint === true && point.shotType === ShotType.SLICE
  ).length;
}

function countForehandUnreturned(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  return allPoints.filter(point => 
    point.isPlayerPoint === true && point.shotType === ShotType.FOREHAND
  ).length;
}

function countBackhandUnreturned(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  return allPoints.filter(point => 
    point.isPlayerPoint === true && point.shotType === ShotType.BACKHAND
  ).length;
}

function countVolleyUnreturned(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  return allPoints.filter(point => 
    point.isPlayerPoint === true && point.shotType === ShotType.VOLLEY
  ).length;
}

function countDropshotUnreturned(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  return allPoints.filter(point => 
    point.isPlayerPoint === true && point.shotType === ShotType.DROPSHOT
  ).length;
}

function countOverheadUnreturned(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  return allPoints.filter(point => 
    point.isPlayerPoint === true && point.shotType === ShotType.OVERHEAD
  ).length;
}

function countLobUnreturned(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  return allPoints.filter(point => 
    point.isPlayerPoint === true && point.shotType === ShotType.LOB
  ).length;
}

function countSliceUnreturned(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  return allPoints.filter(point => 
    point.isPlayerPoint === true && point.shotType === ShotType.SLICE
  ).length;
}

function countServeUnreturned(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  return allPoints.filter(point => 
    point.isPlayerPoint === true && point.shotType === ShotType.SERVE_UNRETURNED
  ).length;
}

function countForehandUnforcedErrors(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  return allPoints.filter(point => 
    point.isPlayerPoint === false && point.errorType === ErrorType.FOREHAND_UNFORCED
  ).length;
}

function countBackhandUnforcedErrors(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  return allPoints.filter(point => 
    point.isPlayerPoint === false && point.errorType === ErrorType.BACKHAND_UNFORCED
  ).length;
}

function countVolleyUnforcedErrors(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  return allPoints.filter(point => 
    point.isPlayerPoint === false && point.errorType === ErrorType.VOLLEY_UNFORCED
  ).length;
}

function countDropshotUnforcedErrors(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  return allPoints.filter(point => 
    point.isPlayerPoint === false && point.errorType === ErrorType.DROPSHOT_UNFORCED
  ).length;
}

function countOverheadUnforcedErrors(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  return allPoints.filter(point => 
    point.isPlayerPoint === false && point.errorType === ErrorType.OVERHEAD_UNFORCED
  ).length;
}

function countSliceUnforcedErrors(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  return allPoints.filter(point => 
    point.isPlayerPoint === false && point.errorType === ErrorType.SLICE_UNFORCED
  ).length;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: Colors.primary,
    marginLeft: 4,
    fontSize: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  refreshText: {
    color: Colors.primary,
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  matchSummary: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  matchTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  matchResult: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  networkErrorContainer: {
    backgroundColor: Colors.error + '10',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  networkErrorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
    marginTop: 8,
    marginBottom: 4,
  },
  networkErrorText: {
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  webTTSMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  webTTSText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
  },
  ttsControls: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
    gap: 12,
  },
  ttsControlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  ttsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  ttsPlayButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
  },
  ttsPauseButton: {
    backgroundColor: Colors.warning,
  },
  ttsResumeButton: {
    backgroundColor: Colors.success,
  },
  ttsStopButton: {
    backgroundColor: Colors.error,
  },
  ttsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  ttsStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  ttsStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textSecondary,
  },
  ttsStatusPlaying: {
    backgroundColor: Colors.success,
  },
  ttsStatusText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  sectionTTSButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: Colors.primary + '15',
  },
  activeTTSButton: {
    backgroundColor: Colors.primary,
  },
  loadingInsights: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  connectionText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  insightsContent: {
    gap: 20,
  },
  openingStatement: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  openingStatementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  openingStatementTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  openingStatementText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  insightSection: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  insightSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  insightSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginLeft: 8,
  },
  insightList: {
    gap: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  insightBullet: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  insightText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    flex: 1,
  },
  overallAssessment: {
    backgroundColor: Colors.primary + '10',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  overallAssessmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  overallAssessmentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  overallAssessmentText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  llmInfo: {
    backgroundColor: Colors.textSecondary + '10',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  llmInfoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  generatedAt: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  noInsightsContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noInsightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  noInsightsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.card,
    fontSize: 16,
    fontWeight: '600',
  },
  notCompletedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  notCompletedText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
});