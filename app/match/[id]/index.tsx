import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Share, Alert, Platform } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useMatchStore } from '@/store/matchStore';
import Button from '@/components/Button';
import PlayerAvatar from '@/components/PlayerAvatar';
import Colors from '@/constants/colors';
import { Calendar, MapPin, Share2, Clock, Brain, Target, MessageSquare } from 'lucide-react-native';
import { Match, Point, Game, Set, ErrorType, ShotType, TiebreakPoint, formatEnumValue, calculateRallyLengthStats } from '@/types/tennis';
import HorizontalBarChart from '@/components/charts/HorizontalBarChart';
import GroupedBarChart from '@/components/charts/GroupedBarChart';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function MatchDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { matches, setCurrentMatch } = useMatchStore();
  
  const match = matches.find(m => m.id === id);
  
  useEffect(() => {
    if (id) {
      setCurrentMatch(id);
    }
  }, [id, setCurrentMatch]);
  
  if (!match) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Match not found</Text>
        <Button
          title="Go Back"
          variant="primary"
          onPress={() => router.back()}
          style={{ marginTop: 16 }}
        />
      </View>
    );
  }
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  const formatDateForFilename = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
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
  
  const handleContinueMatch = () => {
    router.push(`/match/${id}/track`);
  };

  const handleViewAIInsights = () => {
    router.push(`/match/${id}/insights`);
  };
  
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

  const generatePDFContent = () => {
    const matchResult = getMatchResult();
    const matchScore = getMatchScore();
    const playerPoints = countPlayerPoints(match);
    const totalPoints = countTotalPoints(match);
    const opponentPoints = totalPoints - playerPoints;
    const matchDuration = formatMatchDuration(match);
    
    // Collect all statistics
    const firstServePercentage = calculateFirstServePercentage(match);
    const secondServePercentage = calculateSecondServePercentage(match);
    const aces = countAces(match);
    const doubleFaults = countDoubleFaults(match);
    const totalWinners = countWinners(match);
    const unforcedErrors = countUnforcedErrors(match);
    
    // Winners breakdown - excluding Opponent Unforced Error
    const winners = {
      forehand: countForehandWinners(match),
      backhand: countBackhandWinners(match),
      volley: countVolleyWinners(match),
      slice: countSliceWinners(match),
      dropshot: countDropshotWinners(match),
      lob: countLobWinners(match),
      overhead: countOverheadWinners(match),
      ace: countAces(match),
      serveUnreturned: countServeUnreturnedWinners(match),
    };
    
    // Unforced Errors breakdown - excluding Forced Error
    const errors = {
      forehand: countForehandUnforcedErrors(match),
      backhand: countBackhandUnforcedErrors(match),
      volley: countVolleyUnforcedErrors(match),
      slice: countSliceUnforcedErrors(match),
      dropshot: countDropshotUnforcedErrors(match),
      lob: countLobUnforcedErrors(match),
      overhead: countOverheadUnforcedErrors(match),
      doubleFault: countDoubleFaults(match),
    };

    // Rally Length Analysis
    const allMatchPoints = getAllMatchPoints(match);
    const rallyLengthStats = calculateRallyLengthStats(allMatchPoints);
    
    // Points per set breakdown (including tiebreak points)
    const pointsPerSet = match.sets.map((set, index) => {
      const setPoints = getPointsPerSet(match, index);
      return {
        set: index + 1,
        player: setPoints.player,
        opponent: setPoints.opponent
      };
    });

    // Enhanced PDF bar chart generator with different colors for each bar
    const generatePDFBarChart = (data: { [key: string]: number }, title: string, baseColor: string = '#4CAF50') => {
      const maxValue = Math.max(...Object.values(data));
      if (maxValue === 0) return '';
      
      // Define different colors for each bar
      const colors = [
        '#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#F44336', 
        '#607D8B', '#009688', '#795548', '#E91E63', '#00BCD4'
      ];
      
      const bars = Object.entries(data)
        .filter(([_, value]) => value > 0)
        .map(([key, value], index) => {
          const percentage = Math.round((value / maxValue) * 100);
          const barWidth = Math.max(percentage * 2.5, 15); // Better scaling
          const barColor = colors[index % colors.length]; // Cycle through colors
          
          return `
            <tr style="border-bottom: 1px solid #f5f5f5;">
              <td style="width: 140px; padding: 14px 12px; font-size: 15px; color: #2c3e50; text-transform: capitalize; vertical-align: middle; font-weight: 600;">
                ${key.replace(/([A-Z])/g, ' $1').trim()}
              </td>
              <td style="padding: 14px 12px; vertical-align: middle; width: 320px;">
                <div style="position: relative; background: #f8f9fa; height: 36px; border-radius: 8px; border: 1px solid #dee2e6; overflow: hidden;">
                  <div style="position: absolute; top: 0; left: 0; height: 100%; width: ${barWidth}px; background: ${barColor}; border-radius: 7px;"></div>
                  <div style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 15px; font-weight: bold; color: #2c3e50; z-index: 10;">
                    ${value}
                  </div>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      
      return `
        <div style="margin-bottom: 45px; page-break-inside: avoid;">
          <h3 style="color: #2c3e50; margin-bottom: 24px; font-size: 20px; border-bottom: 4px solid ${baseColor}; padding-bottom: 12px; font-weight: 700; letter-spacing: -0.5px;">${title}</h3>
          <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid #e9ecef;">
            ${bars}
          </table>
        </div>
      `;
    };

    // Enhanced points per set chart with better visual design
    const generatePointsPerSetChart = () => {
      const maxPoints = Math.max(...pointsPerSet.flatMap(set => [set.player, set.opponent]));
      if (maxPoints === 0) return '';
      
      const chartRows = pointsPerSet.map(set => {
        const playerHeight = Math.round((set.player / maxPoints) * 100) + 15; // Better scaling
        const opponentHeight = Math.round((set.opponent / maxPoints) * 100) + 15;
        
        return `
          <td style="text-align: center; padding: 20px 12px; vertical-align: bottom; width: ${100/pointsPerSet.length}%; position: relative;">
            <div style="display: flex; justify-content: center; align-items: flex-end; gap: 6px; height: 140px;">
              <div style="display: flex; flex-direction: column; align-items: center;">
                <div style="font-size: 14px; margin-bottom: 6px; font-weight: bold; color: #27ae60;">${set.player}</div>
                <div style="background: #27ae60; width: 32px; height: ${playerHeight}px; border-radius: 6px 6px 0 0;"></div>
              </div>
              <div style="display: flex; flex-direction: column; align-items: center;">
                <div style="font-size: 14px; margin-bottom: 6px; font-weight: bold; color: #3498db;">${set.opponent}</div>
                <div style="background: #3498db; width: 32px; height: ${opponentHeight}px; border-radius: 6px 6px 0 0;"></div>
              </div>
            </div>
            <div style="font-size: 14px; margin-top: 16px; color: #34495e; font-weight: 700;">Set ${set.set}</div>
          </td>
        `;
      }).join('');
      
      return `
        <div style="margin-bottom: 45px; page-break-inside: avoid;">
          <h3 style="color: #2c3e50; margin-bottom: 24px; font-size: 20px; border-bottom: 4px solid #3498db; padding-bottom: 12px; font-weight: 700; letter-spacing: -0.5px;">Points Per Set</h3>
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid #e9ecef;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="height: 180px; background: #ffffff;">
                ${chartRows}
              </tr>
            </table>
            <div style="text-align: center; padding: 20px; background: #f8f9fa; border-top: 1px solid #dee2e6;">
              <span style="display: inline-block; margin: 0 20px;">
                <span style="display: inline-block; width: 18px; height: 18px; background: #27ae60; border-radius: 4px; margin-right: 8px; vertical-align: middle;"></span>
                <span style="font-size: 15px; font-weight: 700; color: #2c3e50;">${match.player.name}</span>
              </span>
              <span style="display: inline-block; margin: 0 20px;">
                <span style="display: inline-block; width: 18px; height: 18px; background: #3498db; border-radius: 4px; margin-right: 8px; vertical-align: middle;"></span>
                <span style="font-size: 15px; font-weight: 700; color: #2c3e50;">${match.opponent.name}</span>
              </span>
            </div>
          </div>
        </div>
      `;
    };

    // Rally Length Analysis for PDF
    const generateRallyLengthAnalysis = () => {
      if (rallyLengthStats.totalPointsWithRallyData === 0) return '';
      
      const rallyData = {
        'Short Rallies (< 4 shots)': rallyLengthStats.shortRallies.total,
        'Medium Rallies (4-9 shots)': rallyLengthStats.mediumRallies.total,
        'Long Rallies (> 9 shots)': rallyLengthStats.longRallies.total,
      };

      const rallyWinPercentages = {
        'Short Rallies': rallyLengthStats.shortRallies.winPercentage,
        'Medium Rallies': rallyLengthStats.mediumRallies.winPercentage,
        'Long Rallies': rallyLengthStats.longRallies.winPercentage,
      };

      return `
        <div style="margin-bottom: 45px; page-break-inside: avoid;">
          <h3 style="color: #2c3e50; margin-bottom: 24px; font-size: 20px; border-bottom: 4px solid #e67e22; padding-bottom: 12px; font-weight: 700; letter-spacing: -0.5px;">🎯 Rally Length Analysis</h3>
          
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid #e9ecef; padding: 28px;">
            
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 32px;">
              <div style="text-align: center; background: #f8f9fa; padding: 20px; border-radius: 12px; border: 2px solid #4CAF50;">
                <div style="font-size: 28px; font-weight: 800; color: #4CAF50; margin-bottom: 8px;">${rallyLengthStats.shortRallies.winPercentage.toFixed(1)}%</div>
                <div style="font-size: 16px; font-weight: 700; color: #2c3e50; margin-bottom: 4px;">Short Rallies</div>
                <div style="font-size: 14px; color: #7f8c8d; margin-bottom: 8px;">< 4 shots</div>
                <div style="font-size: 14px; color: #7f8c8d;">${rallyLengthStats.shortRallies.won}/${rallyLengthStats.shortRallies.total} won</div>
              </div>
              
              <div style="text-align: center; background: #f8f9fa; padding: 20px; border-radius: 12px; border: 2px solid #FF9800;">
                <div style="font-size: 28px; font-weight: 800; color: #FF9800; margin-bottom: 8px;">${rallyLengthStats.mediumRallies.winPercentage.toFixed(1)}%</div>
                <div style="font-size: 16px; font-weight: 700; color: #2c3e50; margin-bottom: 4px;">Medium Rallies</div>
                <div style="font-size: 14px; color: #7f8c8d; margin-bottom: 8px;">4-9 shots</div>
                <div style="font-size: 14px; color: #7f8c8d;">${rallyLengthStats.mediumRallies.won}/${rallyLengthStats.mediumRallies.total} won</div>
              </div>
              
              <div style="text-align: center; background: #f8f9fa; padding: 20px; border-radius: 12px; border: 2px solid #F44336;">
                <div style="font-size: 28px; font-weight: 800; color: #F44336; margin-bottom: 8px;">${rallyLengthStats.longRallies.winPercentage.toFixed(1)}%</div>
                <div style="font-size: 16px; font-weight: 700; color: #2c3e50; margin-bottom: 4px;">Long Rallies</div>
                <div style="font-size: 14px; color: #7f8c8d; margin-bottom: 8px;">> 9 shots</div>
                <div style="font-size: 14px; color: #7f8c8d;">${rallyLengthStats.longRallies.won}/${rallyLengthStats.longRallies.total} won</div>
              </div>
            </div>
            
            <div style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); padding: 20px; border-radius: 12px; border-left: 4px solid #e67e22;">
              <h4 style="color: #2c3e50; font-size: 16px; margin-bottom: 12px; font-weight: 700;">Key Insights</h4>
              <p style="margin: 0; color: #2c3e50; line-height: 1.6; font-size: 15px;">
                Average rally length: <strong>${rallyLengthStats.averageLength.toFixed(1)} shots</strong><br>
                Total points with rally data: <strong>${rallyLengthStats.totalPointsWithRallyData}</strong><br>
                ${rallyLengthStats.shortRallies.winPercentage > rallyLengthStats.mediumRallies.winPercentage && rallyLengthStats.shortRallies.winPercentage > rallyLengthStats.longRallies.winPercentage 
                  ? 'Strongest in short rallies - excellent at finishing points quickly!' 
                  : rallyLengthStats.longRallies.winPercentage > rallyLengthStats.shortRallies.winPercentage && rallyLengthStats.longRallies.winPercentage > rallyLengthStats.mediumRallies.winPercentage
                  ? 'Excels in long rallies - great endurance and patience!'
                  : 'Most effective in medium-length rallies - good tactical balance!'}
              </p>
            </div>
          </div>
        </div>
      `;
    };

    // AI Insights section for PDF - using the same content as the insights view
    const generateAIInsightsSection = () => {
      if (!match.aiInsights) return '';
      
      // Get the same display insights used in the insights view
      const getDisplayInsights = () => {
        if (!match.aiInsights) return null;
        
        // Enhanced text cleaning function to remove all markdown formatting
        const cleanMarkdownText = (text) => {
          if (!text) return '';
          
          return text
            // Remove all ** characters (bold markdown)
            .replace(/\*\*/g, '')
            // Remove all * characters (italic markdown) but be careful not to remove bullet points
            .replace(/(?<!\s)\*(?!\s)/g, '')
            // Remove other markdown formatting
            .replace(/_{2,}/g, '') // Remove __ (underline)
            .replace(/`{1,3}/g, '') // Remove ` and ``` (code)
            .replace(/#{1,6}\s*/g, '') // Remove # headers
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert [text](link) to just text
            // Clean up extra whitespace
            .replace(/\s+/g, ' ')
            .trim();
        };
        
        // Enhanced helper function to clean and filter insight items
        const cleanInsightItems = (items) => {
          return items
            .map(item => cleanMarkdownText(item.trim()))
            .filter(item => item.length > 0)
            .filter(item => {
              const emojiOnlyPattern = /^[🎯💡🎾🚀🌟🏆\s\*\-\•\.\,\!\?\:]+$/;
              return !emojiOnlyPattern.test(item);
            })
            .filter(item => {
              const punctuationOnlyPattern = /^[\s\*\-\•\.\,\!\?\:]+$/;
              return !punctuationOnlyPattern.test(item);
            })
            .filter(item => {
              const numberBulletPattern = /^[\d\.\)\s\-\•\*]+$/;
              return !numberBulletPattern.test(item);
            })
            .filter(item => {
              const headerPattern = /^(what|areas?|suggested?|training|drill|recommendation|practice|exercise|overall|final|opening|strength|weakness|improvement)/i;
              const isJustHeader = headerPattern.test(item) && item.split(' ').length <= 3;
              return !isJustHeader;
            });
        };
        
        if (match.aiInsights.rawResponse) {
          // Enhanced AI response parsing function
          const parseAIResponse = (rawResponse) => {
            const insights = {
              whatYouDidWell: [],
              areasToImprove: [],
              trainingRecommendations: [],
              overallAssessment: '',
            };
        
            try {
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
        
              // Enhanced section detection
              const detectSectionInText = (text, sectionKeywords) => {
                const lines = text.split('\n');
                let startIndex = -1;
                let endIndex = lines.length;
                
                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i].toLowerCase().trim();
                  if (sectionKeywords.some(keyword => line.includes(keyword))) {
                    startIndex = i;
                    break;
                  }
                }
                
                if (startIndex === -1) return null;
                
                const allSectionKeywords = [
                  'what went well', 'what you did well', 'strengths', 'positives',
                  'areas to improve', 'areas for improvement', 'improvement', 'weaknesses', 'areas to work on',
                  'suggested drill', 'suggested drall', 'training', 'practice', 'recommendations', 'drills', 'dralls', 'exercises',
                  'overall', 'final', 'assessment', 'summary', 'conclusion', 'opening statement', 'final comments'
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
              
              const extractItemsFromSection = (sectionText) => {
                const items = [];
                const lines = sectionText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                
                let currentItem = '';
                
                for (const line of lines) {
                  const isLikelySectionHeader = (line) => {
                    const headerPatterns = [
                      /^(what|areas?|suggested?|training|drill|recommendation|practice|exercise|overall|final|opening|strength|weakness|improvement)/i,
                      /^(what\s+went\s+well|areas?\s+to\s+improve|suggested?\s+drill|training\s+recommendation)/i,
                      /^\*\*(what|areas?|suggested?|training|drill|recommendation|practice|exercise|overall|final|opening|strength|weakness|improvement)/i
                    ];
                    return headerPatterns.some(pattern => pattern.test(line.trim())) && line.split(' ').length <= 5;
                  };
                  
                  if (isLikelySectionHeader(line)) {
                    continue;
                  }
                  
                  const numberedMatch = line.match(/^(\d+[\.\)]\s*|[-•*]\s*|[a-zA-Z][\.\)]\s*)(.+)$/);
                  if (numberedMatch && numberedMatch[2]) {
                    if (currentItem.trim()) {
                      items.push(cleanMarkdownText(currentItem.trim()));
                    }
                    currentItem = numberedMatch[2].trim();
                  } else if (line.length > 0 && !isLikelySectionHeader(line)) {
                    if (currentItem) {
                      currentItem += ' ' + line;
                    } else {
                      currentItem = line;
                    }
                  }
                }
                
                if (currentItem.trim()) {
                  items.push(cleanMarkdownText(currentItem.trim()));
                }
                
                return items.filter(item => {
                  const cleaned = item.trim();
                  return cleaned.length > 10 && 
                         !/^[🎯💡🎾🚀🌟🏆\s\*\-\•\.\,\!\?\:\(\)]+$/.test(cleaned) &&
                         !isLikelySectionHeader(cleaned);
                });
              };
              
              const extractTextFromSection = (sectionText) => {
                const lines = sectionText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                let content = '';
                
                for (const line of lines) {
                  const isLikelySectionHeader = (line) => {
                    const headerPatterns = [
                      /^(what|areas?|suggested?|training|drill|recommendation|practice|exercise|overall|final|opening|strength|weakness|improvement)/i,
                      /^(what\s+went\s+well|areas?\s+to\s+improve|suggested?\s+drill|training\s+recommendation)/i,
                      /^\*\*(what|areas?|suggested?|training|drill|recommendation|practice|exercise|overall|final|opening|strength|weakness|improvement)/i
                    ];
                    return headerPatterns.some(pattern => pattern.test(line.trim())) && line.split(' ').length <= 5;
                  };
                  
                  if (isLikelySectionHeader(line)) {
                    continue;
                  }
                  
                  if (line.length > 0) {
                    content += (content ? ' ' : '') + line;
                  }
                }
                
                return cleanMarkdownText(content.trim());
              };
        
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
              
              // Training recommendations section
              const trainingKeywords = ['suggested drill', 'suggested drall', 'training', 'practice', 'recommendations', 'drills', 'dralls', 'exercises', 'training roadmap', 'amazing training'];
              const trainingSection = detectSectionInText(cleanedResponse, trainingKeywords);
              if (trainingSection) {
                const sectionText = lines.slice(trainingSection.start, trainingSection.end).join('\n');
                insights.trainingRecommendations = extractItemsFromSection(sectionText);
              }
              
              // Overall assessment section - prioritize "Final Comments"
              const finalCommentsKeywords = ['final comments', 'final comment'];
              const finalCommentsSection = detectSectionInText(cleanedResponse, finalCommentsKeywords);
              
              if (finalCommentsSection) {
                const sectionText = lines.slice(finalCommentsSection.start, finalCommentsSection.end).join('\n');
                insights.overallAssessment = extractTextFromSection(sectionText);
              } else {
                const overallKeywords = ['overall', 'final', 'assessment', 'summary', 'conclusion', 'opening statement', 'performance story'];
                const overallSection = detectSectionInText(cleanedResponse, overallKeywords);
                if (overallSection) {
                  const sectionText = lines.slice(overallSection.start, overallSection.end).join('\n');
                  insights.overallAssessment = extractTextFromSection(sectionText);
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
          
          const aiParsed = parseAIResponse(match.aiInsights.rawResponse);
          
          return {
            whatYouDidWell: cleanInsightItems(match.aiInsights.whatYouDidWell),
            areasToImprove: cleanInsightItems(match.aiInsights.areasToImprove).slice(0, 3),
            trainingRecommendations: cleanInsightItems(match.aiInsights.trainingRecommendations).slice(0, 3),
            overallAssessment: aiParsed.overallAssessment || cleanMarkdownText(match.aiInsights.overallAssessment),
          };
        }
        
        return {
          whatYouDidWell: cleanInsightItems(match.aiInsights.whatYouDidWell),
          areasToImprove: cleanInsightItems(match.aiInsights.areasToImprove).slice(0, 3),
          trainingRecommendations: cleanInsightItems(match.aiInsights.trainingRecommendations).slice(0, 3),
          overallAssessment: cleanMarkdownText(match.aiInsights.overallAssessment),
        };
      };
      
      const displayInsights = getDisplayInsights();
      if (!displayInsights) return '';
      
      return `
        <div style="margin-bottom: 45px; page-break-inside: avoid;">
          <h3 style="color: #2c3e50; margin-bottom: 24px; font-size: 20px; border-bottom: 4px solid #9b59b6; padding-bottom: 12px; font-weight: 700; letter-spacing: -0.5px;">🧠 AI Coach Insights</h3>
          
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid #e9ecef; padding: 28px;">
            
            <div style="margin-bottom: 32px;">
              <h4 style="color: #27ae60; font-size: 18px; margin-bottom: 16px; display: flex; align-items: center;">
                <span style="margin-right: 8px;">🌟</span> What You Crushed
              </h4>
              <ul style="margin: 0; padding-left: 20px; color: #2c3e50; line-height: 1.6;">
                ${displayInsights.whatYouDidWell.map(item => `<li style="margin-bottom: 8px;">${item}</li>`).join('')}
              </ul>
            </div>
            
            <div style="margin-bottom: 32px;">
              <h4 style="color: #e74c3c; font-size: 18px; margin-bottom: 16px; display: flex; align-items: center;">
                <span style="margin-right: 8px;">🚀</span> Level Up Opportunities
              </h4>
              <ul style="margin: 0; padding-left: 20px; color: #2c3e50; line-height: 1.6;">
                ${displayInsights.areasToImprove.map(item => `<li style="margin-bottom: 8px;">${item}</li>`).join('')}
              </ul>
            </div>
            
            <div style="margin-bottom: 32px;">
              <h4 style="color: #3498db; font-size: 18px; margin-bottom: 16px; display: flex; align-items: center;">
                <span style="margin-right: 8px;">🏆</span> Training Roadmap
              </h4>
              <ul style="margin: 0; padding-left: 20px; color: #2c3e50; line-height: 1.6;">
                ${displayInsights.trainingRecommendations.map(item => `<li style="margin-bottom: 8px;">${item}</li>`).join('')}
              </ul>
            </div>
            
            <div style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); padding: 20px; border-radius: 12px; border-left: 4px solid #9b59b6;">
              <h4 style="color: #2c3e50; font-size: 16px; margin-bottom: 12px; font-weight: 700;">Your Overall Performance Story</h4>
              <p style="margin: 0; color: #2c3e50; line-height: 1.6; font-size: 15px;">${displayInsights.overallAssessment}</p>
            </div>
          </div>
        </div>
      `;
    };

    // Comments section for PDF
    const generateCommentsSection = () => {
      if (!match.comments || match.comments.trim() === '') return '';
      
      return `
        <div style="margin-bottom: 45px; page-break-inside: avoid;">
          <h3 style="color: #2c3e50; margin-bottom: 24px; font-size: 20px; border-bottom: 4px solid #34495e; padding-bottom: 12px; font-weight: 700; letter-spacing: -0.5px;">💭 Match Comments</h3>
          
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid #e9ecef; padding: 28px;">
            <div style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); padding: 20px; border-radius: 12px; border-left: 4px solid #34495e;">
              <p style="margin: 0; color: #2c3e50; line-height: 1.6; font-size: 15px; white-space: pre-wrap;">${match.comments}</p>
            </div>
          </div>
        </div>
      `;
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Tennis Match Report</title>
        <style>
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 28px;
            background: #f8f9fa;
            color: #2c3e50;
            line-height: 1.7;
          }
          .header {
            text-align: center;
            margin-bottom: 45px;
            padding: 45px 28px 28px 28px;
            background: linear-gradient(135deg, #27ae60, #2ecc71, #58d68d);
            color: white;
            border-radius: 16px;
            box-shadow: 0 8px 24px rgba(39, 174, 96, 0.4);
            position: relative;
            overflow: hidden;
          }
          .title {
            font-size: 36px;
            font-weight: 800;
            margin-bottom: 16px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
            letter-spacing: -1px;
          }
          .subtitle {
            font-size: 20px;
            opacity: 0.95;
            margin-bottom: 10px;
            font-weight: 500;
          }
          .match-info {
            background: white;
            padding: 36px;
            border-radius: 16px;
            margin-bottom: 36px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
            border: 1px solid #e9ecef;
          }
          .players {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 28px;
          }
          .player {
            text-align: center;
            flex: 1;
          }
          .player-name {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 10px;
            color: #2c3e50;
            letter-spacing: -0.5px;
          }
          .vs {
            font-size: 22px;
            color: #7f8c8d;
            margin: 0 36px;
            display: flex;
            flex-direction: column;
            align-items: center;
            font-weight: 600;
          }
          .result {
            background: ${matchResult === 'Won' ? 'linear-gradient(135deg, #27ae60, #2ecc71)' : matchResult === 'Lost' ? 'linear-gradient(135deg, #e74c3c, #ec7063)' : 'linear-gradient(135deg, #f39c12, #f7dc6f)'};
            color: white;
            padding: 12px 24px;
            border-radius: 30px;
            font-size: 18px;
            font-weight: 700;
            margin-top: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            text-shadow: 0 1px 2px rgba(0,0,0,0.2);
          }
          .score {
            font-size: 32px;
            font-weight: 800;
            color: #27ae60;
            text-align: center;
            margin: 28px 0;
            padding: 24px;
            background: linear-gradient(135deg, #e8f8f5, #d5f4e6);
            border-radius: 16px;
            border: 3px solid #27ae60;
            box-shadow: 0 4px 12px rgba(39, 174, 96, 0.2);
          }
          .match-duration {
            text-align: center;
            margin: 20px 0;
            padding: 16px;
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border-radius: 12px;
            border: 2px solid #dee2e6;
          }
          .duration-label {
            font-size: 16px;
            color: #7f8c8d;
            margin-bottom: 8px;
            font-weight: 600;
          }
          .duration-value {
            font-size: 24px;
            font-weight: 700;
            color: #2c3e50;
          }
          .sets-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 36px;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          }
          .sets-table th,
          .sets-table td {
            padding: 20px 24px;
            text-align: center;
            border-bottom: 1px solid #ecf0f1;
          }
          .sets-table th {
            background: linear-gradient(135deg, #27ae60, #2ecc71);
            color: white;
            font-weight: 700;
            font-size: 18px;
            text-shadow: 0 1px 2px rgba(0,0,0,0.2);
          }
          .sets-table tr:nth-child(even) {
            background: #f8f9fa;
          }
          .sets-table tr:hover {
            background: #e8f8f5;
          }
          .sets-table td {
            font-size: 16px;
            font-weight: 600;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 28px;
            margin-bottom: 36px;
          }
          .stat-item {
            display: flex;
            justify-content: space-between;
            padding: 18px 0;
            border-bottom: 1px solid #ecf0f1;
          }
          .stat-label {
            color: #7f8c8d;
            font-size: 17px;
            font-weight: 600;
          }
          .stat-value {
            font-weight: 700;
            color: #27ae60;
            font-size: 20px;
          }
          .section {
            margin-bottom: 45px;
            page-break-inside: avoid;
            background: white;
            border-radius: 16px;
            padding: 28px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
            border: 1px solid #e9ecef;
          }
          .section-title {
            font-size: 24px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 28px;
            padding-bottom: 16px;
            border-bottom: 4px solid #27ae60;
            letter-spacing: -0.5px;
          }
          .footer {
            text-align: center;
            margin-top: 60px;
            padding: 28px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
            color: #7f8c8d;
            font-size: 15px;
            border: 1px solid #e9ecef;
          }
          @media print {
            body { 
              margin: 0; 
              background: white;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header { 
              margin: 0 0 45px 0; 
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">🎾 Tennis Match Report</div>
          <div class="subtitle">${formatDate(match.date)}</div>
          ${match.location ? `<div class="subtitle">📍 ${match.location}</div>` : ''}
        </div>

        <div class="match-info">
          <div class="players">
            <div class="player">
              <div class="player-name">${match.player.name}</div>
            </div>
            <div class="vs">
              vs
              <div class="result">${matchResult}</div>
            </div>
            <div class="player">
              <div class="player-name">${match.opponent.name}</div>
            </div>
          </div>
          <div class="score">Final Score: ${matchScore}</div>
          <div class="match-duration">
            <div class="duration-label">⏱️ Match Duration</div>
            <div class="duration-value">${matchDuration}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Match Score Breakdown</div>
          <table class="sets-table">
            <thead>
              <tr>
                <th>Set</th>
                <th>${match.player.name}</th>
                <th>${match.opponent.name}</th>
              </tr>
            </thead>
            <tbody>
              ${match.sets.map((set, index) => `
                <tr>
                  <td><strong>Set ${index + 1}</strong></td>
                  <td><strong>${set.playerGames}</strong></td>
                  <td><strong>${set.opponentGames}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${generateCommentsSection()}

        ${totalPoints > 0 ? `
          ${generatePointsPerSetChart()}

          ${generateRallyLengthAnalysis()}

          <div class="section">
            <div class="section-title">${match.player.name}'s Performance Statistics</div>
            <div style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); padding: 28px; border-radius: 16px; border: 1px solid #dee2e6;">
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="stat-label">Points Won</span>
                  <span class="stat-value">${playerPoints}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Point Win %</span>
                  <span class="stat-value">${totalPoints > 0 ? Math.round((playerPoints / totalPoints) * 100) : 0}%</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">First Serve %</span>
                  <span class="stat-value">${firstServePercentage}%</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Second Serve %</span>
                  <span class="stat-value">${secondServePercentage}%</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Aces</span>
                  <span class="stat-value">${aces}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Double Faults</span>
                  <span class="stat-value">${doubleFaults}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Winners</span>
                  <span class="stat-value">${totalWinners}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Unforced Errors</span>
                  <span class="stat-value">${unforcedErrors}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">${match.player.name}'s Shot Analysis</div>
            ${generatePDFBarChart(winners, 'Winners', '#27ae60')}
            ${generatePDFBarChart(errors, 'Unforced Errors', '#e74c3c')}
          </div>
        ` : ''}

        ${generateAIInsightsSection()}

        <div class="footer">
          <strong>Generated by PointHit</strong><br>
          ${new Date().toLocaleDateString()} • Professional Tennis Statistics
        </div>
      </body>
      </html>
    `;
  };

  const generatePDF = async () => {
    try {
      const htmlContent = generatePDFContent();
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
        width: 612,
        height: 792,
        margins: {
          left: 20,
          top: 20,
          right: 20,
          bottom: 20,
        },
      });
      return uri;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  };
  
  const generatePDFFilename = () => {
    const date = formatDateForFilename(match.date);
    const playerName = match.player.name.replace(/[^a-zA-Z0-9]/g, '_');
    const opponentName = match.opponent.name.replace(/[^a-zA-Z0-9]/g, '_');
    const location = match.location ? `_${match.location.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
    
    return `${playerName}_vs_${opponentName}${location}_${date}.pdf`;
  };
  
  const handleShare = async () => {
    try {
      // Show action sheet for sharing options
      Alert.alert(
        'Share Match Details',
        'Choose how you would like to share this match:',
        [
          {
            text: 'PDF',
            onPress: async () => {
              try {
                Alert.alert('Generating PDF...', 'Please wait while we create your match report.');
                const pdfUri = await generatePDF();
                const filename = generatePDFFilename();
                
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(pdfUri, {
                    mimeType: 'application/pdf',
                    dialogTitle: `Tennis Match: ${match.player.name} vs ${match.opponent.name}`,
                    UTI: 'com.adobe.pdf',
                  });
                } else {
                  Alert.alert('Error', 'Sharing is not available on this device.');
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to generate PDF report. Please try again.');
                console.error('PDF generation error:', error);
              }
            }
          },
          {
            text: 'Social Media',
            onPress: () => shareTextSummary()
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to share match details. Please try again.');
      console.error('Share error:', error);
    }
  };

  const shareTextSummary = async () => {
    try {
      const matchResult = getMatchResult();
      const matchScore = getMatchScore();
      const playerPoints = countPlayerPoints(match);
      const totalPoints = countTotalPoints(match);
      const opponentPoints = totalPoints - playerPoints;
      const matchDuration = formatMatchDuration(match);
      
      const firstServePercentage = calculateFirstServePercentage(match);
      const aces = countAces(match);
      const doubleFaults = countDoubleFaults(match);
      const totalWinners = countWinners(match);
      const unforcedErrors = countUnforcedErrors(match);

      // Rally length stats
      const allMatchPoints = getAllMatchPoints(match);
      const rallyLengthStats = calculateRallyLengthStats(allMatchPoints);
      
      const shareText = `🎾 TENNIS MATCH RESULT

📅 ${formatDateShort(match.date)}${match.location ? `
📍 ${match.location}` : ''}

👥 ${match.player.name} vs ${match.opponent.name}

${matchResult === 'Won' ? '🏆' : matchResult === 'Lost' ? '😔' : '🤝'} RESULT: ${matchResult.toUpperCase()}
📊 SCORE: ${matchScore}
⏱️ DURATION: ${matchDuration}

🎯 KEY STATS
• Points: ${playerPoints} - ${opponentPoints}
• Point Win %: ${totalPoints > 0 ? Math.round((playerPoints / totalPoints) * 100) : 0}%
• First Serve: ${firstServePercentage}%
• Aces: ${aces} | Double Faults: ${doubleFaults}
• Winners: ${totalWinners} | Errors: ${unforcedErrors}

${rallyLengthStats.totalPointsWithRallyData > 0 ? `🎯 RALLY ANALYSIS
• Short (< 4): ${rallyLengthStats.shortRallies.winPercentage.toFixed(1)}% win rate
• Medium (4-9): ${rallyLengthStats.mediumRallies.winPercentage.toFixed(1)}% win rate  
• Long (> 9): ${rallyLengthStats.longRallies.winPercentage.toFixed(1)}% win rate
• Avg Length: ${rallyLengthStats.averageLength.toFixed(1)} shots

` : ''}📱 Tracked with PointHit
#Tennis #TennisMatch #TennisStats`;

      const result = await Share.share({
        message: shareText,
        title: `🎾 Tennis Match: ${match.player.name} vs ${match.opponent.name}`,
      });

      if (result.action === Share.sharedAction) {
        console.log('Match shared successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share match details. Please try again.');
      console.error('Share error:', error);
    }
  };
  
  // Prepare data for winners chart - excluding Opponent Unforced Error
  const winnersData = [
    { label: 'Forehand', value: countForehandWinners(match), color: '#4CAF50' },
    { label: 'Backhand', value: countBackhandWinners(match), color: '#2196F3' },
    { label: 'Volley', value: countVolleyWinners(match), color: '#9C27B0' },
    { label: 'Slice', value: countSliceWinners(match), color: '#FF9800' },
    { label: 'Dropshot', value: countDropshotWinners(match), color: '#F44336' },
    { label: 'Lob', value: countLobWinners(match), color: '#607D8B' },
    { label: 'Overhead', value: countOverheadWinners(match), color: '#009688' },
    { label: 'Ace', value: countAces(match), color: '#795548' },
    { label: 'Serve Unreturned', value: countServeUnreturnedWinners(match), color: '#E91E63' },
  ].filter(item => item.value > 0);
  
  // Include unforced errors and double faults - excluding Forced Error
  const errorData = [
    { label: 'Forehand', value: countForehandUnforcedErrors(match), color: '#4CAF50' },
    { label: 'Backhand', value: countBackhandUnforcedErrors(match), color: '#2196F3' },
    { label: 'Volley', value: countVolleyUnforcedErrors(match), color: '#9C27B0' },
    { label: 'Slice', value: countSliceUnforcedErrors(match), color: '#FF9800' },
    { label: 'Dropshot', value: countDropshotUnforcedErrors(match), color: '#F44336' },
    { label: 'Lob', value: countLobUnforcedErrors(match), color: '#607D8B' },
    { label: 'Overhead', value: countOverheadUnforcedErrors(match), color: '#009688' },
    { label: 'Double Fault', value: countDoubleFaults(match), color: '#E91E63' },
  ].filter(item => item.value > 0);

  // Rally Length Analysis
  const allMatchPoints = getAllMatchPoints(match);
  const rallyLengthStats = calculateRallyLengthStats(allMatchPoints);
  
  // Prepare data for grouped bar chart (points per set) - now includes tiebreak points
  const pointsPerSetData = match.sets.map((set, index) => {
    const setPoints = getPointsPerSet(match, index);
    
    return {
      label: `Set ${index + 1}`,
      values: [
        {
          label: match.player.name,
          value: setPoints.player,
          color: '#4CAF50' // Green for player
        },
        {
          label: match.opponent.name,
          value: setPoints.opponent,
          color: '#2196F3' // Blue for opponent
        }
      ]
    };
  });
  
  return (
    <>
      <Stack.Screen options={{ title: "Match Details" }} />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.shareButton} 
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Share2 size={20} color={Colors.primary} />
            <Text style={styles.shareText}>Share</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.matchInfo}>
          <View style={styles.dateContainer}>
            <Calendar size={16} color={Colors.textSecondary} />
            <Text style={styles.date}>{formatDate(match.date)}</Text>
          </View>
          
          {match.location && (
            <View style={styles.locationContainer}>
              <MapPin size={16} color={Colors.textSecondary} />
              <Text style={styles.location}>{match.location}</Text>
            </View>
          )}
          
          {match.totalDuration && (
            <View style={styles.durationContainer}>
              <Clock size={16} color={Colors.textSecondary} />
              <Text style={styles.duration}>{formatMatchDuration(match)}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.playersContainer}>
          <View style={styles.playerCard}>
            <PlayerAvatar player={match.player} size={50} />
            <Text style={styles.playerName}>{match.player.name}</Text>
          </View>
          
          <View style={styles.vsContainer}>
            <Text style={styles.vsText}>vs</Text>
            <View style={styles.resultBadge}>
              <Text style={[
                styles.resultText,
                getMatchResult() === 'Won' && styles.wonText,
                getMatchResult() === 'Lost' && styles.lostText,
              ]}>
                {getMatchResult()}
              </Text>
            </View>
          </View>
          
          <View style={styles.playerCard}>
            <PlayerAvatar player={match.opponent} size={50} />
            <Text style={styles.playerName}>{match.opponent.name}</Text>
          </View>
        </View>
        
        <View style={styles.scoreContainer}>
          <Text style={styles.sectionTitle}>Match Score</Text>
          
          {match.sets.map((set, index) => (
            <View key={set.id} style={styles.setContainer}>
              <Text style={styles.setLabel}>Set {index + 1}</Text>
              <View style={styles.setScore}>
                <Text style={styles.scoreNumber}>{set.playerGames}</Text>
                <Text style={styles.scoreDivider}>-</Text>
                <Text style={styles.scoreNumber}>{set.opponentGames}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Match Comments Section */}
        {match.comments && match.comments.trim() !== '' && (
          <View style={styles.commentsContainer}>
            <View style={styles.commentsHeader}>
              <MessageSquare size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Match Comments</Text>
            </View>
            <View style={styles.commentsContent}>
              <Text style={styles.commentsText}>{match.comments}</Text>
            </View>
          </View>
        )}

        {/* AI Insights Button - Only show for completed matches */}
        {match.isCompleted && (
          <View style={styles.aiInsightsContainer}>
            <View style={styles.aiInsightsHeader}>
              <Brain size={20} color={Colors.primary} />
              <Text style={styles.aiInsightsTitle}>Get AI Coach Insights</Text>
            </View>
            <Text style={styles.aiInsightsDescription}>
              Get personalized coaching insights powered by AI. Our AI coach will analyze your match performance and provide specific recommendations for improvement.
            </Text>
            <Button
              title="View AI Insights"
              variant="primary"
              onPress={handleViewAIInsights}
              style={styles.aiInsightsButton}
            />
          </View>
        )}
        
        {countTotalPoints(match) > 0 && (
          <>
            <View style={styles.chartContainer}>
              <Text style={styles.sectionTitle}>Points Per Set</Text>
              <GroupedBarChart 
                data={pointsPerSetData}
                height={180}
                showValues={true}
              />
            </View>
            
            {winnersData.length > 0 && (
              <View style={styles.chartContainer}>
                <Text style={styles.sectionTitle}>Your Winners</Text>
                <HorizontalBarChart 
                  data={winnersData}
                  width={300}
                />
              </View>
            )}
            
            {errorData.length > 0 && (
              <View style={styles.chartContainer}>
                <Text style={styles.sectionTitle}>Unforced Errors</Text>
                <HorizontalBarChart 
                  data={errorData}
                  width={300}
                />
              </View>
            )}
          </>
        )}
        
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Your Statistics</Text>
          
          {countTotalPoints(match) > 0 ? (
            <>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Points Won</Text>
                <Text style={styles.statValue}>
                  {countPlayerPoints(match)}
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>First Serve %</Text>
                <Text style={styles.statValue}>
                  {calculateFirstServePercentage(match)}%
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Second Serve %</Text>
                <Text style={styles.statValue}>
                  {calculateSecondServePercentage(match)}%
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Aces</Text>
                <Text style={styles.statValue}>
                  {countAces(match)}
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Double Faults</Text>
                <Text style={styles.statValue}>
                  {countDoubleFaults(match)}
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Winners</Text>
                <Text style={styles.statValue}>
                  {countWinners(match)}
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Unforced Errors</Text>
                <Text style={styles.statValue}>
                  {countUnforcedErrors(match)}
                </Text>
              </View>

              {rallyLengthStats.totalPointsWithRallyData > 0 && (
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Average Rally Length</Text>
                  <Text style={styles.statValue}>
                    {rallyLengthStats.averageLength.toFixed(1)} shots
                  </Text>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.noStatsText}>No statistics available for this match.</Text>
          )}
        </View>

        {/* Rally Length Win Percentage - moved to bottom */}
        {countTotalPoints(match) > 0 && rallyLengthStats.totalPointsWithRallyData > 0 && (
          <View style={styles.chartContainer}>
            <View style={styles.rallyTitleContainer}>
              <Target size={20} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Rally Length Win Percentage</Text>
            </View>
            
            <View style={styles.rallyStatsGrid}>
              <View style={styles.rallyStatItem}>
                <Text style={styles.rallyStatValue}>{rallyLengthStats.shortRallies.winPercentage.toFixed(1)}%</Text>
                <Text style={styles.rallyStatLabel}>Short Rallies</Text>
                <Text style={styles.rallyStatSubLabel}>{"< 4 shots"}</Text>
                <Text style={styles.rallyStatCount}>
                  {rallyLengthStats.shortRallies.won}/{rallyLengthStats.shortRallies.total}
                </Text>
              </View>
              
              <View style={styles.rallyStatItem}>
                <Text style={styles.rallyStatValue}>{rallyLengthStats.mediumRallies.winPercentage.toFixed(1)}%</Text>
                <Text style={styles.rallyStatLabel}>Medium Rallies</Text>
                <Text style={styles.rallyStatSubLabel}>4-9 shots</Text>
                <Text style={styles.rallyStatCount}>
                  {rallyLengthStats.mediumRallies.won}/{rallyLengthStats.mediumRallies.total}
                </Text>
              </View>
              
              <View style={styles.rallyStatItem}>
                <Text style={styles.rallyStatValue}>{rallyLengthStats.longRallies.winPercentage.toFixed(1)}%</Text>
                <Text style={styles.rallyStatLabel}>Long Rallies</Text>
                <Text style={styles.rallyStatSubLabel}>{"> 9 shots"}</Text>
                <Text style={styles.rallyStatCount}>
                  {rallyLengthStats.longRallies.won}/{rallyLengthStats.longRallies.total}
                </Text>
              </View>
            </View>
          </View>
        )}
        
        {!match.isCompleted && (
          <Button
            title="Continue Match"
            variant="primary"
            size="large"
            onPress={handleContinueMatch}
            style={styles.continueButton}
          />
        )}
      </ScrollView>
    </>
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

// Helper function to get all points (regular + tiebreak) for a specific set
function getPointsPerSet(match: Match, setIndex: number): { player: number; opponent: number } {
  const set = match.sets[setIndex];
  if (!set) return { player: 0, opponent: 0 };
  
  // Count points from regular games
  const regularGamePoints = set.games.flatMap(game => game.points);
  const playerRegularPoints = regularGamePoints.filter(point => point.isPlayerPoint).length;
  const opponentRegularPoints = regularGamePoints.filter(point => !point.isPlayerPoint).length;
  
  // Count points from tiebreak if it exists
  let playerTiebreakPoints = 0;
  let opponentTiebreakPoints = 0;
  
  if (set.tiebreak) {
    // Count from tiebreak points array if it exists
    if (set.tiebreak.points && set.tiebreak.points.length > 0) {
      playerTiebreakPoints = set.tiebreak.points.filter(point => point.isPlayerPoint).length;
      opponentTiebreakPoints = set.tiebreak.points.filter(point => !point.isPlayerPoint).length;
    } else {
      // Fallback to tiebreak score if points array is empty
      playerTiebreakPoints = set.tiebreak.playerPoints || 0;
      opponentTiebreakPoints = set.tiebreak.opponentPoints || 0;
    }
  }
  
  return {
    player: playerRegularPoints + playerTiebreakPoints,
    opponent: opponentRegularPoints + opponentTiebreakPoints
  };
}

// Helper function to get all points from a match (regular + tiebreak) - FIXED VERSION
function getAllMatchPoints(match: Match): (Point | TiebreakPoint)[] {
  const regularPoints = match.sets
    .flatMap((set: Set) => set.games)
    .flatMap((game: Game) => game.points);
  
  const tiebreakPoints = match.sets
    .filter((set: Set) => set.tiebreak && Array.isArray(set.tiebreak.points))
    .flatMap((set: Set) => set.tiebreak?.points || []);
  
  return [...regularPoints, ...tiebreakPoints];
}

// Helper function to count total points in a match (regular + tiebreak)
function countTotalPoints(match: Match): number {
  return getAllMatchPoints(match).length;
}

// Helper functions for statistics
function calculateFirstServePercentage(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  
  // Filter to serving points only
  const servingPoints = allPoints.filter(point => isPlayerServingPoint(point, match));
  
  const totalFirstServeAttempts = servingPoints.length;
  
  // Count successful first serves (isFirstServeIn = true)
  const successfulFirstServes = servingPoints.filter(point => {
    return point.serveData.isFirstServeIn;
  }).length;
  
  return totalFirstServeAttempts > 0 
    ? Math.round((successfulFirstServes / totalFirstServeAttempts) * 100) 
    : 0;
}

function calculateSecondServePercentage(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  
  // Filter to serving points only
  const servingPoints = allPoints.filter(point => isPlayerServingPoint(point, match));
  
  // Count second serve opportunities (when first serve is out)
  const secondServeOpportunities = servingPoints.filter(point => {
    return !point.serveData.isFirstServeIn;
  }).length;
  
  // Count successful second serves (not double fault)
  const successfulSecondServes = servingPoints.filter(point => {
    return !point.serveData.isFirstServeIn && !point.serveData.isDoubleFault;
  }).length;
  
  return secondServeOpportunities > 0 
    ? Math.round((successfulSecondServes / secondServeOpportunities) * 100) 
    : 0;
}

function countDoubleFaults(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  
  return allPoints.filter(point => {
    // Count double faults only on player's serve
    return isPlayerServingPoint(point, match) && point.serveData.isDoubleFault;
  }).length;
}

function countWinners(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  
  return allPoints.filter(point => 
    point.isPlayerPoint && // Only count player's winners
    point.shotType && 
    point.shotType !== ShotType.NONE &&
    point.shotType !== ShotType.OPPONENT_UNFORCED_ERROR // Exclude opponent unforced errors
  ).length;
}

// FIXED: Count unforced errors excluding double faults
function countUnforcedErrors(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  
  return allPoints.filter(point => {
    return !point.isPlayerPoint && // Count points lost by player
           point.errorType && 
           point.errorType !== ErrorType.FORCED_ERROR; // Exclude forced errors
  }).length;
}

// Updated winner counting functions for simplified shot types
function countForehandWinners(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  
  return allPoints.filter(point => 
    point.isPlayerPoint && 
    point.shotType === ShotType.FOREHAND
  ).length;
}

function countBackhandWinners(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  
  return allPoints.filter(point => 
    point.isPlayerPoint && 
    point.shotType === ShotType.BACKHAND
  ).length;
}

function countVolleyWinners(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  
  return allPoints.filter(point => 
    point.isPlayerPoint && 
    point.shotType === ShotType.VOLLEY
  ).length;
}

function countSliceWinners(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  
  return allPoints.filter(point => 
    point.isPlayerPoint && 
    point.shotType === ShotType.SLICE
  ).length;
}

function countDropshotWinners(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  
  return allPoints.filter(point => 
    point.isPlayerPoint && 
    point.shotType === ShotType.DROPSHOT
  ).length;
}

function countLobWinners(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  
  return allPoints.filter(point => 
    point.isPlayerPoint && 
    point.shotType === ShotType.LOB
  ).length;
}

function countOverheadWinners(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  
  return allPoints.filter(point => 
    point.isPlayerPoint && 
    point.shotType === ShotType.OVERHEAD
  ).length;
}

function countAces(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  
  return allPoints.filter(point => {
    return isPlayerServingPoint(point, match) && // Only count player's service points
           point.isPlayerPoint && // Only count player's winners
           point.shotType === ShotType.ACE;
  }).length;
}

function countServeUnreturnedWinners(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  
  return allPoints.filter(point => 
    point.isPlayerPoint && 
    point.shotType === ShotType.SERVE_UNRETURNED
  ).length;
}

function countOpponentUnforcedErrorWinners(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  
  return allPoints.filter(point => 
    point.isPlayerPoint && 
    point.shotType === ShotType.OPPONENT_UNFORCED_ERROR
  ).length;
}

function countForehandUnforcedErrors(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  
  return allPoints.filter(point => 
    !point.isPlayerPoint && 
    point.errorType === ErrorType.FOREHAND_UNFORCED
  ).length;
}

function countBackhandUnforcedErrors(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  
  return allPoints.filter(point => 
    !point.isPlayerPoint && 
    point.errorType === ErrorType.BACKHAND_UNFORCED
  ).length;
}

function countVolleyUnforcedErrors(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  
  return allPoints.filter(point => 
    !point.isPlayerPoint && 
    point.errorType === ErrorType.VOLLEY_UNFORCED
  ).length;
}

function countSliceUnforcedErrors(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  
  return allPoints.filter(point => 
    !point.isPlayerPoint && 
    point.errorType === ErrorType.SLICE_UNFORCED
  ).length;
}

function countDropshotUnforcedErrors(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  
  return allPoints.filter(point => 
    !point.isPlayerPoint && 
    point.errorType === ErrorType.DROPSHOT_UNFORCED
  ).length;
}

function countLobUnforcedErrors(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  
  return allPoints.filter(point => 
    !point.isPlayerPoint && 
    point.errorType === ErrorType.LOB_UNFORCED
  ).length;
}

function countOverheadUnforcedErrors(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  
  return allPoints.filter(point => 
    !point.isPlayerPoint && 
    point.errorType === ErrorType.OVERHEAD_UNFORCED
  ).length;
}

function countForcedErrors(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  
  return allPoints.filter(point => 
    !point.isPlayerPoint && 
    point.errorType === ErrorType.FORCED_ERROR
  ).length;
}

function countPlayerPoints(match: Match): number {
  const allPoints = getAllMatchPoints(match);
  return allPoints.filter(point => point.isPlayerPoint).length;
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
    marginBottom: 16,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  shareText: {
    color: Colors.primary,
    marginLeft: 4,
    fontSize: 16,
    fontWeight: '600',
  },
  matchInfo: {
    gap: 8,
    marginBottom: 20,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  date: {
    fontSize: 16,
    color: Colors.text,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  location: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  duration: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  playersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  playerCard: {
    alignItems: 'center',
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
    marginTop: 8,
  },
  vsContainer: {
    alignItems: 'center',
    marginHorizontal: 12,
  },
  vsText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  resultBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  wonText: {
    color: Colors.success,
  },
  lostText: {
    color: Colors.error,
  },
  scoreContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  commentsContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 8,
  },
  commentsContent: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  commentsText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  aiInsightsContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  aiInsightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  aiInsightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  aiInsightsDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  aiInsightsButton: {
    marginTop: 8,
  },
  chartContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 8,
  },
  rallyTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 8,
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
  rallyStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
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
  },
  setContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '30', // 30% opacity
  },
  setLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  setScore: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    width: 30,
    textAlign: 'center',
  },
  scoreDivider: {
    fontSize: 20,
    color: Colors.textSecondary,
    marginHorizontal: 4,
  },
  statsContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '30', // 30% opacity
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
  noStatsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    padding: 16,
  },
  continueButton: {
    marginBottom: 40,
  },
});