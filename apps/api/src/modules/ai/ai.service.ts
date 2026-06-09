import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AiService {
  private client: Anthropic;
  private readonly logger = new Logger(AiService.name);

  constructor(private config: ConfigService) {
    this.client = new Anthropic({ apiKey: this.config.get('app.anthropic.apiKey') });
  }

  async generateCourseOutline(topic: string, level: string, targetAudience: string) {
    const message = await this.client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Create a course outline for: "${topic}"
Level: ${level}
Target Audience: ${targetAudience}

Return ONLY a JSON object (no extra text) with exactly this structure — keep it concise with 4-6 sections and 3-5 lessons each:
{
  "title": "...",
  "subtitle": "...",
  "description": "...",
  "outcomes": ["outcome1", "outcome2", "outcome3"],
  "requirements": ["req1", "req2"],
  "sections": [
    {
      "title": "Section Title",
      "lessons": [
        { "title": "Lesson Title", "type": "VIDEO", "description": "brief description", "estimatedMinutes": 10 }
      ]
    }
  ]
}`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI did not return valid JSON');
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Try to extract just the valid part
      const trimmed = jsonMatch[0].replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(trimmed);
    }
  }

  async generateQuizQuestions(topic: string, lessonContent: string, count: number, difficulty: string) {
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [
        {
          role: 'user',
          content: `Generate ${count} ${difficulty} quiz questions about: "${topic}"
Based on content: ${lessonContent.slice(0, 2000)}

Return JSON array:
[
  {
    "type": "MCQ|MULTI_SELECT|TRUE_FALSE|FILL_BLANK",
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "A",
    "explanation": "...",
    "points": 1
  }
]`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '[]';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  }

  async generateAssignment(topic: string, level: string, objectives: string[]) {
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `Create a practical assignment for: "${topic}"
Level: ${level}
Learning Objectives: ${objectives.join(', ')}

Return JSON:
{
  "title": "...",
  "description": "...",
  "instructions": "...",
  "rubric": [
    { "criterion": "...", "maxPoints": 0, "description": "..." }
  ],
  "dueInDays": 7,
  "maxScore": 100
}`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  }

  async generateCourseSummary(courseTitle: string, sections: any[]) {
    const outline = sections.map((s) => `${s.title}: ${s.lessons?.map((l: any) => l.title).join(', ')}`).join('\n');
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: `Write a compelling 2-paragraph course summary for: "${courseTitle}"\n\nCourse structure:\n${outline}\n\nMake it engaging and highlight what students will learn.`,
        },
      ],
    });
    return message.content[0].type === 'text' ? message.content[0].text : '';
  }

  async chatTutor(messages: { role: 'user' | 'assistant'; content: string }[], context: string) {
    const systemPrompt = `You are an expert AI tutor for an online learning platform. You help students understand course material, answer questions, and guide their learning.

Course context: ${context}

Be helpful, encouraging, and provide clear explanations. Use examples when possible. If a student struggles, break down concepts into simpler steps.`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  async generateTranscript(videoContent: string) {
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Format this transcript with proper punctuation, paragraphs and speaker labels:\n\n${videoContent}`,
        },
      ],
    });
    return message.content[0].type === 'text' ? message.content[0].text : '';
  }

  async getRecommendations(userId: string, enrolledCourseIds: string[], interests: string[]) {
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `A student has completed courses in: ${enrolledCourseIds.join(', ')}
Their interests: ${interests.join(', ')}

Suggest 5 types of courses they should take next. Return as JSON array of strings.`,
        },
      ],
    });
    const text = message.content[0].type === 'text' ? message.content[0].text : '[]';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  }
}
