import { Configuration, PipelinesApi } from "@vectorize-io/vectorize-client";

export interface VectorizeDocument {
  id: string;
  text: string;
  source: string;
  source_display_name?: string;
  relevancy?: number;
  similarity?: number;
}

export class VectorizeService {
  private pipelinesApi: any;
  private organizationId: string;
  private pipelineId: string;

  constructor() {
    if (!process.env.VECTORIZE_ACCESS_TOKEN) {
      throw new Error('VECTORIZE_ACCESS_TOKEN environment variable is required');
    }
    if (!process.env.VECTORIZE_ORG_ID) {
      throw new Error('VECTORIZE_ORG_ID environment variable is required');
    }
    if (!process.env.VECTORIZE_PIPELINE_ID) {
      throw new Error('VECTORIZE_PIPELINE_ID environment variable is required');
    }

    const config = new Configuration({
      accessToken: process.env.VECTORIZE_ACCESS_TOKEN,
      basePath: "https://api.vectorize.io/v1",
    });

    this.pipelinesApi = new PipelinesApi(config);
    this.organizationId = process.env.VECTORIZE_ORG_ID;
    this.pipelineId = process.env.VECTORIZE_PIPELINE_ID;
  }

  async retrieveDocuments(
    question: string,
    numResults: number = 3 // Default to 3 for faster responses
  ): Promise<VectorizeDocument[]> {
    try {
      const response = await this.pipelinesApi.retrieveDocuments({
        organizationId: this.organizationId,
        pipelineId: this.pipelineId,
        retrieveDocumentsRequest: {
          question,
          numResults,
        },
      });

      return response.documents || [];
    } catch (error: any) {
      console.error("Vectorize API Error:", error);
      throw new Error(
        `Failed to retrieve documents from Vectorize: ${error?.message || "Unknown error"}`
      );
    }
  }

  formatDocumentsForContext(documents: VectorizeDocument[]): string {
    if (!documents.length) {
      return "No relevant historical weather information found.";
    }

    return documents
      .map((doc, index) => {
        const source = doc.source_display_name || doc.source;
        const cleanedText = this.cleanDocumentText(doc.text);
        return `Source ${index + 1} (${source}):\n${cleanedText}`;
      })
      .join("\n\n---\n\n");
  }

  private cleanDocumentText(text: string): string {
    if (!text) return '';

    let cleaned = text;

    // Remove HTML tags and fragments
    cleaned = cleaned.replace(/<[^>]*>/g, ' ');
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Convert markdown links to text

    // Clean up navigation elements and URL fragments
    cleaned = cleaned.replace(/eatherspark\.com[^\s]*/g, '');
    cleaned = cleaned.replace(/https?:\/\/[^\s)]+/g, '');

    // Remove repetitive navigation elements
    cleaned = cleaned.replace(/\[(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\]/g, '');

    // Clean up excessive whitespace and special characters
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/[*#]+/g, '');
    cleaned = cleaned.replace(/\n\s*\n/g, '\n');

    // Remove lines that are mostly navigation or metadata
    const lines = cleaned.split('\n');
    const meaningfulLines = lines.filter(line => {
      const trimmed = line.trim();
      // Keep lines that contain actual weather information
      return trimmed.length > 10 &&
             !trimmed.match(/^[\[\]()]+$/) &&
             !trimmed.match(/^\s*[*-]+\s*$/) &&
             (trimmed.includes('temperature') ||
              trimmed.includes('weather') ||
              trimmed.includes('°F') ||
              trimmed.includes('precipitation') ||
              trimmed.includes('Miami') ||
              trimmed.includes('season') ||
              trimmed.includes('month') ||
              trimmed.includes('average') ||
              trimmed.includes('climate') ||
              trimmed.length > 30);
    });

    return meaningfulLines.join('\n').trim();
  }
}