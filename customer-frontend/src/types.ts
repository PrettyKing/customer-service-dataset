export type Role = "user" | "assistant";

export interface TimelineEvent {
  time: string;
  location: string;
  description: string;
}

export interface Shipment {
  orderId: string;
  trackingNumber: string | null;
  carrier: string | null;
  status: string;
  statusText: string;
  estimatedDelivery: string | null;
  receiver: string;
  receiverPhone: string;
  latestEvent: string;
  events: TimelineEvent[];
}

export interface KnowledgeSource {
  documentId: string;
  title: string;
  filename: string;
  chunkIndex: number;
  content: string;
  vectorScore: number;
  rerankScore: number | null;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  filename: string;
  content_type: string;
  chunk_count: number;
  character_count: number;
  created_at: string;
}

export interface KnowledgeSearchResult {
  document_id: string;
  title: string;
  filename: string;
  chunk_index: number;
  content: string;
  vector_score: number;
  rerank_score: number | null;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: Date;
  shipment?: Shipment;
  sources?: KnowledgeSource[];
  failed?: boolean;
}

export interface ConversationSummary {
  id: string;
  resourceId: string;
  title: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDetail {
  conversation: Omit<ConversationSummary, "preview">;
  messages: Array<{
    id: string;
    role: Role;
    content: string;
    createdAt: string;
    shipment?: Shipment;
    sources?: KnowledgeSource[];
  }>;
}

export interface MastraResponse {
  text?: string;
  steps?: Array<{
    toolResults?: Array<{
      payload?: {
        toolName?: string;
        result?: {
          found?: boolean;
          shipment?: Shipment;
          sources?: KnowledgeSource[];
        };
      };
    }>;
  }>;
}
