import { z } from 'zod';
import { publicProcedure } from '../../../create-context';

// Define the input schema for match data
const MatchDataSchema = z.object({
  playerName: z.string(),
  opponentName: z.string(),
  matchResult: z.enum(['Won', 'Lost', 'Tied']),
  finalScore: z.string(),
  matchDuration: z.string(),
  totalPoints: z.number(),
  playerPoints: z.number(),
  opponentPoints: z.number(),
  firstServePercentage: z.number(),
  secondServePercentage: z.number(),
  aces: z.number(),
  doubleFaults: z.number(),
  winners: z.number(),
  unforcedErrors: z.number(),
  directWinners: z.object({
    forehand: z.number(),
    backhand: z.number(),
    volley: z.number(),
    dropshot: z.number(),
    overhead: z.number(),
    lob: z.number(),
    ace: z.number(),
    slice: z.number(),
  }),
  unreturnedShots: z.object({
    forehand: z.number(),
    backhand: z.number(),
    volley: z.number(),
    dropshot: z.number(),
    overhead: z.number(),
    lob: z.number(),
    serve: z.number(),
    slice: z.number(),
  }),
  errors: z.object({
    slice: z.number(),
    forehand: z.number(),
    backhand: z.number(),
    volley: z.number(),
    dropshot: z.number(),
    overhead: z.number(),
    doubleFault: z.number(),
  }),
  mentalPhysicalStates: z.record(z.number()),
  pointsPerSet: z.array(z.object({
    set: z.number(),
    player: z.number(),
    opponent: z.number(),
  })),
  rallyLengthStats: z.object({
    shortRallies: z.object({
      total: z.number(),
      won: z.number(),
      winPercentage: z.number(),
      averageLength: z.number(),
    }),
    mediumRallies: z.object({
      total: z.number(),
      won: z.number(),
      winPercentage: z.number(),
      averageLength: z.number(),
    }),
    longRallies: z.object({
      total: z.number(),
      won: z.number(),
      winPercentage: z.number(),
      averageLength: z.number(),
    }),
    averageLength: z.number(),
    totalPointsWithRallyData: z.number(),
  }).optional(),
  comments: z.string().optional(),
});

// Define the output schema for AI insights
const AIInsightsSchema = z.object({
  whatYouDidWell: z.array(z.string()),
  areasToImprove: z.array(z.string()),
  trainingRecommendations: z.array(z.string()),
  overallAssessment: z.string(),
  generatedAt: z.string(),
  llmUsed: z.string().optional(),
  rawResponse: z.string().optional(),
});

// Helper function to clean text content - removes all length restrictions
function cleanText(text: string): string {
  return text
    .replace(/\*\*/g, '') // Remove ** characters
    .replace(/Opening Statement:?\s*/gi, '') // Remove "Opening Statement" text
    .replace(/^\*\*Opening Statement\*\*:?\s*/gi, '') // Remove **Opening Statement**
    .replace(/\*\*Opening Statement\*\*$/gi, '') // Remove **Opening Statement** at the end
    .trim();
}

// Generate fallback insights based on match statistics - no text limits
function generateFallbackInsights(matchData: z.infer<typeof MatchDataSchema>) {
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

  // Analyze areas for improvement - no length limits
  if (matchData.doubleFaults >= 3) {
    insights.areasToImprove.push(`Work on second serve consistency. ${matchData.doubleFaults} double faults gave away free points to your opponent.`);
  }

  if (matchData.firstServePercentage < 55) {
    insights.areasToImprove.push(`First serve percentage of ${matchData.firstServePercentage}% needs improvement. Focus on rhythm and technique over power.`);
  }

  if (matchData.unforcedErrors > matchData.winners) {
    insights.areasToImprove.push('Reduce unforced errors by improving shot selection and maintaining better balance during rallies.');
  }

  // Error analysis - no length limits
  const totalErrors = Object.values(matchData.errors).reduce((sum, count) => sum + count, 0);
  if (totalErrors > 0) {
    const maxErrorType = Object.entries(matchData.errors).reduce((max, [type, count]) => 
      count > max.count ? { type, count } : max, { type: '', count: 0 });
    
    if (maxErrorType.count >= 3) {
      insights.areasToImprove.push(`Focus on ${maxErrorType.type} technique - this was your most frequent error type with ${maxErrorType.count} occurrences.`);
    }
  }

  // Training recommendations - no length limits
  if (matchData.doubleFaults >= 2) {
    insights.trainingRecommendations.push('Practice second serve placement drills. Focus on hitting to specific targets with consistent spin and depth.');
  }

  if (matchData.firstServePercentage < 60) {
    insights.trainingRecommendations.push('Work on serve rhythm with shadow serving and target practice. Start with 75% power and gradually increase.');
  }

  insights.trainingRecommendations.push('Practice point construction drills to improve shot selection and court positioning during rallies.');

  if (matchData.rallyLengthStats && matchData.rallyLengthStats.shortRallies.winPercentage < 50) {
    insights.trainingRecommendations.push('Work on aggressive return of serve and approach shot drills to improve short rally performance.');
  }

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
}

// Enhanced AI response parsing function that handles full content without limits
function parseAIResponse(rawResponse: string) {
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

    // Function to extract numbered items from a section - no length limits
    const extractNumberedItems = (sectionText: string): string[] => {
      const items: string[] = [];
      
      // Split by lines and look for numbered items
      const lines = sectionText.split('\n').map(line => line.trim());
      
      // Process each line using standard iteration
      lines.forEach((line) => {
        // Match patterns like "1.", "2.", "3.", "1)", "2)", "3)", etc.
        const numberedMatch = line.match(/^(\d+)[\.\)]\s*(.+)$/);
        if (numberedMatch && numberedMatch[2]) {
          const content = cleanText(numberedMatch[2].trim());
          // Accept any content length - no minimum requirements
          if (content.length > 0) {
            items.push(content);
          }
        }
        // Also handle bullet points that might not be numbered
        else if (line.match(/^[-•*]\s*(.+)$/)) {
          const bulletMatch = line.match(/^[-•*]\s*(.+)$/);
          if (bulletMatch && bulletMatch[1]) {
            const content = cleanText(bulletMatch[1].trim());
            // Accept any content length - no minimum requirements
            if (content.length > 0) {
              items.push(content);
            }
          }
        }
      });
      
      // Enhanced filtering to remove empty items and emoji-only content
      return items.filter(item => {
        const trimmed = item.trim();
        
        // More comprehensive regex to catch various emoji patterns
        const emojiOnlyPattern = /^[🎯💡🎾🚀🌟🏆\s\*\-\•\.\,\!\?\:]+$/;
        const punctuationOnlyPattern = /^[\s\*\-\•\.\,\!\?\:]+$/;
        const numberBulletPattern = /^[\d\.\)\s\-\•\*]+$/;
        
        return trimmed.length > 0 && 
               !emojiOnlyPattern.test(trimmed) && 
               !punctuationOnlyPattern.test(trimmed) &&
               !numberBulletPattern.test(trimmed);
      });
    };

    // Split the response into sections
    const sections = cleanedResponse.split(/(?=(?:What (?:Went )?Well|Areas? (?:to )?Improve|Suggested? Drills?|Training|Overall|Final|Opening Statement))/gi);
    
    // Process each section using standard iteration
    sections.forEach((section) => {
      const sectionLower = section.toLowerCase();
      
      if (sectionLower.includes('what went well') || sectionLower.includes('what you did well')) {
        const items = extractNumberedItems(section);
        insights.whatYouDidWell.push(...items);
      }
      else if (sectionLower.includes('areas to improve') || sectionLower.includes('areas for improvement')) {
        const items = extractNumberedItems(section);
        insights.areasToImprove.push(...items);
      }
      else if (sectionLower.includes('suggested drill') || sectionLower.includes('training') || sectionLower.includes('practice')) {
        const items = extractNumberedItems(section);
        insights.trainingRecommendations.push(...items);
      }
      else if (sectionLower.includes('overall') || sectionLower.includes('final') || sectionLower.includes('assessment') || sectionLower.includes('opening statement')) {
        // For overall assessment, take the first substantial paragraph and clean it - no length limits
        const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const validLine = lines.find(line => 
          line.length > 0 && 
          !line.toLowerCase().includes('overall') && 
          !line.toLowerCase().includes('final') && 
          !line.toLowerCase().includes('opening statement')
        );
        if (validLine) {
          insights.overallAssessment = cleanText(validLine);
        }
      }
    });

    // Alternative parsing if the structured approach didn't work - no length limits
    if (insights.whatYouDidWell.length === 0 && insights.areasToImprove.length === 0) {
      console.log('Structured parsing failed, trying alternative approach');
      
      // Look for any numbered items in the entire response
      const allLines = cleanedResponse.split('\n').map(line => line.trim());
      let currentSection = '';
      
      allLines.forEach((line) => {
        const lineLower = line.toLowerCase();
        
        // Detect section headers
        if (lineLower.includes('what went well') || lineLower.includes('what you did well')) {
          currentSection = 'well';
          return;
        } else if (lineLower.includes('areas to improve') || lineLower.includes('improvement')) {
          currentSection = 'improve';
          return;
        } else if (lineLower.includes('drill') || lineLower.includes('training') || lineLower.includes('practice')) {
          currentSection = 'training';
          return;
        } else if (lineLower.includes('overall') || lineLower.includes('final') || lineLower.includes('opening statement')) {
          currentSection = 'overall';
          return;
        }
        
        // Extract numbered or bulleted content
        const numberedMatch = line.match(/^(\d+)[\.\)]\s*(.+)$/);
        const bulletMatch = line.match(/^[-•*]\s*(.+)$/);
        
        if (numberedMatch && numberedMatch[2]) {
          const content = cleanText(numberedMatch[2].trim());
          // Enhanced filtering for empty content
          if (content.length > 0) {
            const emojiOnlyPattern = /^[🎯💡🎾🚀🌟🏆\s\*\-\•\.\,\!\?\:]+$/;
            const punctuationOnlyPattern = /^[\s\*\-\•\.\,\!\?\:]+$/;
            const numberBulletPattern = /^[\d\.\)\s\-\•\*]+$/;
            
            if (!emojiOnlyPattern.test(content) && 
                !punctuationOnlyPattern.test(content) &&
                !numberBulletPattern.test(content)) {
              switch (currentSection) {
                case 'well':
                  insights.whatYouDidWell.push(content);
                  break;
                case 'improve':
                  insights.areasToImprove.push(content);
                  break;
                case 'training':
                  insights.trainingRecommendations.push(content);
                  break;
              }
            }
          }
        } else if (bulletMatch && bulletMatch[1]) {
          const content = cleanText(bulletMatch[1].trim());
          // Enhanced filtering for empty content
          if (content.length > 0) {
            const emojiOnlyPattern = /^[🎯💡🎾🚀🌟🏆\s\*\-\•\.\,\!\?\:]+$/;
            const punctuationOnlyPattern = /^[\s\*\-\•\.\,\!\?\:]+$/;
            const numberBulletPattern = /^[\d\.\)\s\-\•\*]+$/;
            
            if (!emojiOnlyPattern.test(content) && 
                !punctuationOnlyPattern.test(content) &&
                !numberBulletPattern.test(content)) {
              switch (currentSection) {
                case 'well':
                  insights.whatYouDidWell.push(content);
                  break;
                case 'improve':
                  insights.areasToImprove.push(content);
                  break;
                case 'training':
                  insights.trainingRecommendations.push(content);
                  break;
              }
            }
          }
        } else if (currentSection === 'overall' && line.length > 0) {
          if (!insights.overallAssessment) {
            insights.overallAssessment = cleanText(line);
          }
        }
      });
    }

  } catch (error) {
    console.error('Error parsing AI response:', error);
  }

  return insights;
}

export const generateInsightsProcedure = publicProcedure
  .input(z.object({
    matchData: MatchDataSchema
  }))
  .mutation(async ({ input }: { input: { matchData: z.infer<typeof MatchDataSchema> } }) => {
    const { matchData } = input;
    
    console.log(`[${new Date().toISOString()}] Generating insights for match:`, matchData.playerName, 'vs', matchData.opponentName);
    
    // Log if match comments are included
    if (matchData.comments && matchData.comments.trim().length > 0) {
      console.log('Match comments included in AI analysis:', matchData.comments.substring(0, 100) + '...');
    } else {
      console.log('No match comments provided for AI analysis');
    }
    
    try {
      // Prepare the data payload in the format expected by the server
      // IMPORTANT: Match comments are included for comprehensive AI analysis
      const payload = {
        data: {
          playerName: matchData.playerName,
          opponentName: matchData.opponentName,
          matchResult: matchData.matchResult,
          finalScore: matchData.finalScore,
          matchDuration: matchData.matchDuration,
          totalPoints: matchData.totalPoints,
          playerPoints: matchData.playerPoints,
          opponentPoints: matchData.opponentPoints,
          firstServePercentage: matchData.firstServePercentage,
          secondServePercentage: matchData.secondServePercentage,
          aces: matchData.aces,
          doubleFaults: matchData.doubleFaults,
          winners: matchData.winners,
          unforcedErrors: matchData.unforcedErrors,
          directWinners: matchData.directWinners,
          unreturnedShots: matchData.unreturnedShots,
          errors: matchData.errors,
          mentalPhysicalStates: matchData.mentalPhysicalStates,
          pointsPerSet: matchData.pointsPerSet,
          rallyLengthStats: matchData.rallyLengthStats,
          // Include match comments for comprehensive AI analysis
          comments: matchData.comments || '', // Ensure comments are always included, even if empty
        }
      };

      console.log(`[${new Date().toISOString()}] Making request to AI service with payload including match comments`);

      // Enhanced fetch with better error handling for production
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for AI service

      const response = await fetch('https://pointhit.com/tennis-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'PointHit-App/1.3.3',
          'X-Client-Platform': 'mobile',
          'X-Request-Source': 'production',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`[${new Date().toISOString()}] AI service response status:`, response.status);
      console.log(`[${new Date().toISOString()}] AI service response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${new Date().toISOString()}] AI service responded with status: ${response.status}`, errorText);
        throw new Error(`AI service responded with status: ${response.status}: ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error(`[${new Date().toISOString()}] AI service returned non-JSON response:`, contentType, responseText.substring(0, 500));
        throw new Error(`AI service returned ${contentType} instead of JSON`);
      }

      const aiResult = await response.json();
      console.log(`[${new Date().toISOString()}] AI service response received:`, !!aiResult.insights);
      
      if (aiResult.insights) {
        // Parse the AI response using the enhanced parser - no length limits
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

        // Fallback to generated insights if parsing failed - no length restrictions
        if (insights.whatYouDidWell.length === 0 || insights.areasToImprove.length === 0) {
          console.log(`[${new Date().toISOString()}] AI parsing failed, using fallback insights`);
          const fallbackInsights = generateFallbackInsights(matchData);
          return {
            success: true,
            insights: {
              ...fallbackInsights,
              rawResponse: rawResponse,
              llmUsed: 'AI Coach + PointHit Fallback'
            }
          };
        }

        console.log(`[${new Date().toISOString()}] Successfully generated AI insights with match comments included`);
        return {
          success: true,
          insights
        };
      } else {
        throw new Error('No insights in AI response');
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] AI insights generation failed:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      });
      
      // Enhanced error handling for different types of failures
      let errorMessage = 'AI service unavailable, using PointHit analysis';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'AI service timeout, using PointHit analysis';
        } else if (error.message.includes('Network request failed')) {
          errorMessage = 'Network connection failed, using PointHit analysis';
        } else if (error.message.includes('JSON Parse error')) {
          errorMessage = 'AI service returned invalid response, using PointHit analysis';
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Unable to connect to AI service, using PointHit analysis';
        }
      }
      
      // Return fallback insights - no length restrictions
      const fallbackInsights = generateFallbackInsights(matchData);
      return {
        success: false,
        insights: fallbackInsights,
        error: errorMessage
      };
    }
  });