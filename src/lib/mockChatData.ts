import {
  Conversation,
  ChatMessage,
  UserMemoryItem,
  PropertySnippet,
} from "./types";

export const SAMPLE_PROPERTIES: Record<string, PropertySnippet> = {};
export const INITIAL_CONVERSATIONS: Conversation[] = [];
export const INITIAL_LUMEN_MESSAGES: ChatMessage[] = [];
export const INITIAL_HOST_MESSAGES: Record<string, ChatMessage[]> = {};
export const INITIAL_USER_MEMORIES: UserMemoryItem[] = [];
