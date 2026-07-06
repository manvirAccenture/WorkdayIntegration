import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';

export interface AiAnalysisResult {
  detectedRootCause: string;
  suggestedFix: string;
}

export class AiService {
  private isPlaceholder(apiKey: string): boolean {
    return !apiKey || apiKey.includes('YOUR_');
  }

  async analyzeErrorLogs(
    integrationName: string,
    errorMessage: string,
    logs: string
  ): Promise<AiAnalysisResult> {
    const apiKey = env.GEMINI_API_KEY;

    if (this.isPlaceholder(apiKey)) {
      throw new Error('Gemini API key is not configured. Please set a valid GEMINI_API_KEY in your env configuration.');
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      // Using gemini-1.5-flash which is ideal for log analysis and speedy tasks
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: { responseMimeType: 'application/json' },
      });

      const prompt = `
        You are an operations troubleshooter for Workday integrations.
        Analyze the following failure details:
        - Integration Name: ${integrationName}
        - Error Message: ${errorMessage}
        - Log Trace:
        ${logs}

        Please diagnose the issue and return a JSON object with exactly two string fields:
        1. "detectedRootCause": A concise diagnosis explaining why the integration failed.
        2. "suggestedFix": Clear, step-by-step markdown guidelines/troubleshooting steps to fix the issue.

        Format:
        {
          "detectedRootCause": "Brief analysis of the issue...",
          "suggestedFix": "### Troubleshooting Steps\\n1. Step one...\\n2. Step two..."
        }
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      try {
        const parsed = JSON.parse(text);
        return {
          detectedRootCause: parsed.detectedRootCause || 'Unresolved root cause.',
          suggestedFix: parsed.suggestedFix || 'No instructions provided.',
        };
      } catch (jsonErr) {
        console.error('[AiService] Failed to parse JSON response from Gemini:', text);
        return {
          detectedRootCause: errorMessage || 'Execution aborted due to unexpected failure.',
          suggestedFix: `### Review Logs\nGemini responded with text:\n\n${text}`,
        };
      }
    } catch (error: any) {
      console.error('[AiService] Gemini API failure:', error.message);
      return {
        detectedRootCause: `AI analysis failed: ${error.message}`,
        suggestedFix: '### Troubleshooting Steps\n1. Double-check your GEMINI_API_KEY configuration.\n2. Manual log inspection is required.',
      };
    }
  }

  private generateMockAnalysis(
    integrationName: string,
    errorMessage: string,
    logs: string
  ): AiAnalysisResult {
    // Return structured troubleshooting details for the mock fail logs
    if (logs.includes('Account_Code')) {
      return {
        detectedRootCause: 'Workday web service validation rejected the invoice line item due to a short account code string.',
        suggestedFix: `### Troubleshooting Steps
1. Locate record code line \`324\` in input mapping configuration.
2. Pad value to satisfy field validation lengths (> 4 chars).
3. Re-run integration.`,
      };
    }

    return {
      detectedRootCause: `Failed execution matching: "${errorMessage || 'Runtime error'}".`,
      suggestedFix: `### Troubleshooting Steps
1. Check credentials associated with API endpoint.
2. Verify schema payload matches current endpoint properties.
3. Consult the execution log for stack traces.`,
    };
  }
}
