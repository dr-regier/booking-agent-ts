import { tool } from 'ai';
import { z } from 'zod';
import { VectorizeService, type VectorizeDocument } from '@/lib/services/vectorize-service';

export const vectorizeTool = tool({
  description: 'Get historical weather patterns and climate data for Miami to provide insights about seasonal trends and best times to visit.',
  inputSchema: z.object({
    question: z.string().describe('The weather or climate question about Miami (e.g., "rain patterns in November", "best time to visit Miami")'),
  }),
  execute: async ({ question }) => {
    try {
      // Create service instance on demand to avoid module load issues
      const vectorizeService = new VectorizeService();
      const documents = await vectorizeService.retrieveDocuments(question, 3);

      if (!documents.length) {
        return {
          success: false,
          message: 'No historical weather data found for this question.',
          error: 'No relevant documents retrieved',
        };
      }

      // Format the context for the AI
      const context = vectorizeService.formatDocumentsForContext(documents);

      const result = {
        success: true,
        message: `Found ${documents.length} relevant historical weather sources`,
        context: context,
        documents: documents.map(doc => ({
          source: doc.source_display_name || doc.source,
          snippet: doc.text.substring(0, 200) + (doc.text.length > 200 ? '...' : ''),
          relevancy: doc.relevancy,
        })),
      };

      return result;
    } catch (error: any) {
      // Return graceful fallback instead of throwing
      return {
        success: false,
        message: 'Historical weather data is temporarily unavailable.',
        error: error?.message || 'Unknown error occurred',
      };
    }
  },
});

export type VectorizeToolResult = {
  success: true;
  message: string;
  context: string;
  documents: Array<{
    source: string;
    snippet: string;
    relevancy?: number;
  }>;
} | {
  success: false;
  message: string;
  error: string;
};