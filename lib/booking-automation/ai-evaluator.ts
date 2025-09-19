import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { BookingSearchParams, RawPropertyData, PropertyEvaluation, ProgressCallback } from './types';

export class AIPropertyEvaluator {
  private progressCallback: ProgressCallback;

  constructor(progressCallback: ProgressCallback) {
    this.progressCallback = progressCallback;
  }

  async evaluateProperties(
    properties: RawPropertyData[],
    searchParams: BookingSearchParams
  ): Promise<PropertyEvaluation[]> {
    this.progressCallback('Starting AI-powered property evaluation...');

    const evaluations: PropertyEvaluation[] = [];

    // First, apply rule-based filtering for efficiency
    const filteredProperties = this.applyRuleBasedFilter(properties, searchParams);

    this.progressCallback(`Filtered to ${filteredProperties.length} properties for AI evaluation...`);

    // Then, use AI to evaluate and rank the remaining properties
    for (let i = 0; i < filteredProperties.length; i++) {
      const property = filteredProperties[i];
      this.progressCallback(`AI evaluating property ${i + 1} of ${filteredProperties.length}: "${property.name}"...`);

      try {
        const evaluation = await this.evaluateProperty(property, searchParams);
        evaluations.push(evaluation);

        // Simulate thorough AI evaluation time
        await this.delay(2000, 4000);
      } catch (error) {
        console.error(`Error evaluating property ${property.name}:`, error);
        // Add property with default evaluation if AI fails
        evaluations.push({
          property,
          matchScore: 50,
          aiReasoning: 'Unable to complete AI evaluation, using basic scoring'
        });
      }
    }

    // Sort by match score (highest first)
    evaluations.sort((a, b) => b.matchScore - a.matchScore);

    this.progressCallback('AI evaluation complete. Ranking properties by match score...');

    return evaluations;
  }

  private applyRuleBasedFilter(
    properties: RawPropertyData[],
    searchParams: BookingSearchParams
  ): RawPropertyData[] {
    return properties.filter(property => {
      // Budget filtering
      if (searchParams.budget?.max && property.price > searchParams.budget.max) {
        return false;
      }
      if (searchParams.budget?.min && property.price < searchParams.budget.min) {
        return false;
      }

      // Basic quality filtering
      if (property.rating && property.rating < 3.0) {
        return false;
      }

      // Must have basic information
      if (!property.name || property.price <= 0) {
        return false;
      }

      return true;
    });
  }

  private async evaluateProperty(
    property: RawPropertyData,
    searchParams: BookingSearchParams
  ): Promise<PropertyEvaluation> {
    const prompt = this.buildEvaluationPrompt(property, searchParams);

    try {
      const { text } = await generateText({
        model: openai('gpt-3.5-turbo'),
        temperature: 0.3,
        prompt,
      });

      const evaluation = this.parseAIResponse(text, property);
      return evaluation;

    } catch (error) {
      console.error('AI evaluation failed:', error);
      return {
        property,
        matchScore: this.calculateFallbackScore(property, searchParams),
        aiReasoning: 'AI evaluation failed, using fallback scoring based on price and rating'
      };
    }
  }

  private buildEvaluationPrompt(
    property: RawPropertyData,
    searchParams: BookingSearchParams
  ): string {
    return `You are an expert travel accommodation evaluator. Analyze this property and provide a match score (0-100) and reasoning.

SEARCH CRITERIA:
- Destination: ${searchParams.destination}
- Budget: ${searchParams.budget?.min || 'No min'} - ${searchParams.budget?.max || 'No max'} per night
- Guests: ${searchParams.guests || 'Not specified'}
- Check-in: ${searchParams.checkIn || 'Flexible'}
- Check-out: ${searchParams.checkOut || 'Flexible'}

PROPERTY TO EVALUATE:
- Name: ${property.name}
- Price: $${property.price} per night
- Rating: ${property.rating || 'Not available'}
- Location: ${property.location}
- Description: ${property.description || 'No description available'}
- Amenities: ${property.amenities.join(', ') || 'No amenities listed'}
- Source: ${property.source}

EVALUATION CRITERIA:
1. Price-value ratio (25%): How well does the price match the value offered?
2. Location convenience (20%): How well-located is the property for the destination?
3. Guest ratings/reviews (20%): Quality indicated by ratings and reputation
4. Amenities match (15%): How well do amenities match traveler needs?
5. Property type suitability (10%): Appropriateness for the trip type
6. Overall appeal (10%): General attractiveness and uniqueness

Provide your response in this EXACT format:
SCORE: [number 0-100]
REASONING: [2-3 sentences explaining why this property is a good/poor match for the criteria, focusing on the most important factors]

Be objective and consider both strengths and weaknesses. Higher scores (80-100) for exceptional matches, 60-79 for good matches, 40-59 for average, 20-39 for poor matches, 0-19 for very poor matches.`;
  }

  private parseAIResponse(response: string, property: RawPropertyData): PropertyEvaluation {
    try {
      // Extract score
      const scoreMatch = response.match(/SCORE:\s*(\d+)/i);
      const score = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1]))) : 50;

      // Extract reasoning
      const reasoningMatch = response.match(/REASONING:\s*(.+)/is);
      const reasoning = reasoningMatch ? reasoningMatch[1].trim() : 'No reasoning provided';

      return {
        property,
        matchScore: score,
        aiReasoning: reasoning
      };

    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {
        property,
        matchScore: 50,
        aiReasoning: 'Error parsing AI evaluation response'
      };
    }
  }

  private calculateFallbackScore(
    property: RawPropertyData,
    searchParams: BookingSearchParams
  ): number {
    let score = 50; // Base score

    // Price scoring
    if (searchParams.budget?.max) {
      const priceRatio = property.price / searchParams.budget.max;
      if (priceRatio <= 0.7) score += 20; // Great value
      else if (priceRatio <= 0.9) score += 10; // Good value
      else if (priceRatio <= 1.0) score += 5; // Fair value
      else score -= 15; // Over budget
    }

    // Rating scoring
    if (property.rating) {
      if (property.rating >= 4.5) score += 20;
      else if (property.rating >= 4.0) score += 15;
      else if (property.rating >= 3.5) score += 10;
      else if (property.rating >= 3.0) score += 5;
      else score -= 10;
    }

    // Amenity bonus
    if (property.amenities.length > 3) score += 5;

    return Math.min(100, Math.max(0, score));
  }

  private delay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}