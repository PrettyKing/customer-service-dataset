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

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: Date;
  shipment?: Shipment;
  failed?: boolean;
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
        };
      };
    }>;
  }>;
}
