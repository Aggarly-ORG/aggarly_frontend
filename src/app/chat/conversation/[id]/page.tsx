"use client";

import React, { use, Suspense } from "react";
import { LumenChatWorkspace } from "../../../../components/chat/LumenChatWorkspace";
import { AuthGuard } from "../../../../components/auth/AuthGuard";

interface ConversationPageProps {
  params: Promise<{ id: string }>;
}

function ConversationContent({ params }: ConversationPageProps) {
  const resolvedParams = use(params);
  const conversationId = resolvedParams?.id || "";

  return (
    <LumenChatWorkspace
      initialConversationId={conversationId || undefined}
      singleChatMode={true}
    />
  );
}

export default function ChatConversationPage({ params }: ConversationPageProps) {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="p-8 text-center text-sm text-zinc-500">Loading conversation...</div>}>
        <ConversationContent params={params} />
      </Suspense>
    </AuthGuard>
  );
}
