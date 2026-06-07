import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../config/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AiMediaService {
  private anthropic: Anthropic;

  constructor(private config: ConfigService, private prisma: PrismaService) {
    this.anthropic = new Anthropic({ apiKey: this.config.get('app.anthropic.apiKey') });
  }

  // AI Voice-over: Text → Speech via ElevenLabs / AWS Polly / Azure TTS
  async generateVoiceOver(dto: {
    text: string;
    voice?: string;
    language?: string;
    speed?: number;
    courseId?: string;
    lessonId?: string;
  }): Promise<{ audioUrl: string; duration: number; jobId: string }> {
    const provider = this.config.get('app.tts.provider') || 'elevenlabs';

    if (provider === 'elevenlabs') {
      return this.generateWithElevenLabs(dto);
    } else if (provider === 'aws_polly') {
      return this.generateWithPolly(dto);
    } else if (provider === 'azure') {
      return this.generateWithAzureTts(dto);
    }

    throw new BadRequestException('No TTS provider configured');
  }

  private async generateWithElevenLabs(dto: any): Promise<{ audioUrl: string; duration: number; jobId: string }> {
    const apiKey = this.config.get('app.elevenlabs.apiKey');
    const voiceId = dto.voice || this.config.get('app.elevenlabs.defaultVoiceId') || 'EXAVITQu4vr4xnSDxMaL';

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: dto.text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: dto.speed || 1.0 },
      }),
    });

    if (!response.ok) throw new BadRequestException('ElevenLabs TTS failed: ' + await response.text());

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const jobId = uuidv4();
    const audioUrl = await this.uploadAudioToS3(audioBuffer, `voiceover/${jobId}.mp3`);
    const duration = Math.ceil(dto.text.split(' ').length / 150 * 60); // rough estimate

    return { audioUrl, duration, jobId };
  }

  private async generateWithPolly(dto: any): Promise<{ audioUrl: string; duration: number; jobId: string }> {
    const { PollyClient, SynthesizeSpeechCommand } = await import('@aws-sdk/client-polly');
    const polly = new PollyClient({ region: this.config.get('app.aws.region') });

    const command = new SynthesizeSpeechCommand({
      Text: dto.text,
      OutputFormat: 'mp3',
      VoiceId: dto.voice || 'Joanna',
      LanguageCode: dto.language || 'en-US',
      Engine: 'neural',
      TextType: dto.text.startsWith('<speak>') ? 'ssml' : 'text',
    });

    const result = await polly.send(command);
    const chunks: Uint8Array[] = [];
    for await (const chunk of result.AudioStream as any) chunks.push(chunk);
    const audioBuffer = Buffer.concat(chunks);

    const jobId = uuidv4();
    const audioUrl = await this.uploadAudioToS3(audioBuffer, `voiceover/${jobId}.mp3`);
    const duration = Math.ceil(dto.text.split(' ').length / 150 * 60);

    return { audioUrl, duration, jobId };
  }

  private async generateWithAzureTts(dto: any): Promise<{ audioUrl: string; duration: number; jobId: string }> {
    const key = this.config.get('app.azure.ttsKey');
    const region = this.config.get('app.azure.region');
    const voice = dto.voice || 'en-US-JennyNeural';
    const lang = dto.language || 'en-US';

    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}">
      <voice name="${voice}">${dto.text}</voice>
    </speak>`;

    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      },
      body: ssml,
    });

    if (!res.ok) throw new BadRequestException('Azure TTS failed');
    const audioBuffer = Buffer.from(await res.arrayBuffer());
    const jobId = uuidv4();
    const audioUrl = await this.uploadAudioToS3(audioBuffer, `voiceover/${jobId}.mp3`);
    const duration = Math.ceil(dto.text.split(' ').length / 150 * 60);

    return { audioUrl, duration, jobId };
  }

  // Generate lecture script from topic using Claude
  async generateLectureScript(dto: {
    topic: string;
    duration: number; // minutes
    level: string;
    style?: 'formal' | 'conversational' | 'engaging';
    includeExamples?: boolean;
  }): Promise<{ script: string; wordCount: number; estimatedDuration: number }> {
    const wordsPerMinute = 150;
    const targetWords = dto.duration * wordsPerMinute;
    const style = dto.style || 'engaging';

    const msg = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Generate a complete ${style} lecture script for a ${dto.level} level lesson on "${dto.topic}".
Target length: approximately ${targetWords} words (${dto.duration} minutes at speaking pace).
${dto.includeExamples ? 'Include practical examples and analogies.' : ''}
The script should be ready to read aloud as a voice-over.
Format: Plain text, natural speech patterns, no stage directions.`,
      }],
    });

    const script = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const wordCount = script.split(/\s+/).length;
    const estimatedDuration = Math.ceil(wordCount / wordsPerMinute);

    return { script, wordCount, estimatedDuration };
  }

  // AI Slide generation using Claude (returns HTML/presentation data)
  async generateSlides(dto: {
    topic: string;
    slideCount: number;
    level: string;
    includeCode?: boolean;
  }): Promise<Array<{ title: string; content: string; speakerNotes: string; type: string }>> {
    const msg = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Generate ${dto.slideCount} presentation slides for a ${dto.level} course on "${dto.topic}".
Return JSON array with structure:
[{"title": "...", "content": "bullet points or text", "speakerNotes": "what to say", "type": "title|content|code|diagram"}]
${dto.includeCode ? 'Include code slides where relevant.' : ''}
Return ONLY the JSON array, no markdown.`,
      }],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]';
    const match = text.match(/\[[\s\S]*\]/);
    return JSON.parse(match ? match[0] : '[]');
  }

  // AI Image generation for course thumbnails via DALL-E 3
  async generateCourseThumbnail(dto: {
    courseTitle: string;
    category: string;
    style?: string;
  }): Promise<{ imageUrl: string }> {
    const openAiKey = this.config.get('app.openai.apiKey');
    if (!openAiKey) throw new BadRequestException('OpenAI not configured for image generation');

    const prompt = `Professional e-learning course thumbnail for "${dto.courseTitle}" in ${dto.category} category.
Style: ${dto.style || 'modern, clean, vibrant, digital art'}.
Include relevant visual elements. No text overlay. 16:9 aspect ratio composition.`;

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1792x1024',
        quality: 'standard',
      }),
    });

    if (!res.ok) throw new BadRequestException('Image generation failed');
    const data = await res.json();
    return { imageUrl: data.data[0].url };
  }

  // AI Video generation job (async — actual rendering via external service)
  async createVideoJob(dto: {
    slides: Array<{ content: string; speakerNotes: string }>;
    voiceUrl?: string;
    style?: string;
    courseId: string;
    userId: string;
  }): Promise<{ jobId: string; status: string; estimatedMinutes: number }> {
    const jobId = uuidv4();

    await this.prisma.aiVideoJob.create({
      data: {
        id: jobId,
        courseId: dto.courseId,
        createdBy: dto.userId,
        status: 'QUEUED',
        inputData: dto as any,
        estimatedMinutes: Math.ceil(dto.slides.length * 1.5),
      },
    });

    // In production: enqueue to Bull/BullMQ job queue for video rendering
    // Providers: Synthesia, D-ID, HeyGen, or custom FFmpeg pipeline
    return { jobId, status: 'QUEUED', estimatedMinutes: Math.ceil(dto.slides.length * 1.5) };
  }

  async getVideoJobStatus(jobId: string) {
    const job = await this.prisma.aiVideoJob.findUnique({ where: { id: jobId } });
    if (!job) throw new BadRequestException('Job not found');
    return { jobId: job.id, status: job.status, outputUrl: job.outputUrl, progress: job.progress };
  }

  private async uploadAudioToS3(buffer: Buffer, key: string): Promise<string> {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const s3 = new S3Client({
      region: this.config.get('app.aws.region'),
      credentials: {
        accessKeyId: this.config.get('app.aws.accessKeyId') || '',
        secretAccessKey: this.config.get('app.aws.secretAccessKey') || '',
      },
    });
    const bucket = this.config.get('app.aws.bucket') || 'lms-platform';

    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: 'audio/mpeg' }));
    return `https://${bucket}.s3.amazonaws.com/${key}`;
  }
}
