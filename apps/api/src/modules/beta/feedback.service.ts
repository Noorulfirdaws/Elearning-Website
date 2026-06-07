import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

export type FeedbackType = 'bug' | 'feature' | 'ux' | 'performance' | 'general';
export type FeedbackSentiment = 'positive' | 'neutral' | 'negative';

export interface FeedbackItem {
  id:          string;
  userId:      string;
  type:        FeedbackType;
  sentiment:   FeedbackSentiment;
  title:       string;
  description: string;
  feature:     string;       // Which beta feature this relates to
  url:         string;       // Page URL where feedback was given
  userAgent:   string;
  rating:      number;       // 1–5
  screenshot:  string | null; // Base64 or S3 URL
  metadata:    Record<string, unknown>;
  createdAt:   Date;
  resolved:    boolean;
  resolution:  string | null;
}

// In-memory store (replace with DB in prod)
const feedbackStore: FeedbackItem[] = [];

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  async submit(data: Omit<FeedbackItem, 'id' | 'createdAt' | 'resolved' | 'resolution'>): Promise<FeedbackItem> {
    const item: FeedbackItem = {
      ...data,
      id:         crypto.randomUUID(),
      createdAt:  new Date(),
      resolved:   false,
      resolution: null,
    };
    feedbackStore.push(item);
    this.logger.log(`Feedback [${item.type}/${item.sentiment}] from user ${item.userId}: "${item.title}"`);
    return item;
  }

  list(filters: { type?: FeedbackType; resolved?: boolean; feature?: string } = {}): FeedbackItem[] {
    return feedbackStore.filter(f => {
      if (filters.type     && f.type    !== filters.type)    return false;
      if (filters.feature  && f.feature !== filters.feature) return false;
      if (filters.resolved !== undefined && f.resolved !== filters.resolved) return false;
      return true;
    });
  }

  resolve(id: string, resolution: string): FeedbackItem | null {
    const item = feedbackStore.find(f => f.id === id);
    if (!item) return null;
    item.resolved   = true;
    item.resolution = resolution;
    return item;
  }

  stats() {
    const total     = feedbackStore.length;
    const byType     = feedbackStore.reduce((acc, f) => { acc[f.type] = (acc[f.type] || 0) + 1; return acc; }, {} as Record<string, number>);
    const bySentiment = feedbackStore.reduce((acc, f) => { acc[f.sentiment] = (acc[f.sentiment] || 0) + 1; return acc; }, {} as Record<string, number>);
    const avgRating  = total ? feedbackStore.reduce((s, f) => s + f.rating, 0) / total : 0;
    const resolved   = feedbackStore.filter(f => f.resolved).length;
    return { total, byType, bySentiment, avgRating: Math.round(avgRating * 10) / 10, resolved, open: total - resolved };
  }
}
