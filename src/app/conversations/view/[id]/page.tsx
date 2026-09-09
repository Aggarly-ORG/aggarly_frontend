"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ConversationViewPageProps {
  params: Promise<{ id: string }>;
}

export default function ConversationViewPage({ params }: ConversationViewPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const conversationId = resolvedParams?.id || "conv-lumen";

  useEffect(() => {
    router.replace(`/chat/conversation/${conversationId}`);
  }, [router, conversationId]);

  return (
    <div className="p-8 text-center text-sm text-zinc-500">
      Navigating to chat...
    </div>
  );
}
