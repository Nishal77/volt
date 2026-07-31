export type Message = {
  thread_id: string;
  subject: string;
  from: string;
  snippet: string;
  unread: boolean;
  starred: boolean;
  awaiting_reply: boolean;
  date: string;
  message_count: number;
};
