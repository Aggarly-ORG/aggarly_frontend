"use client";

import React, { Suspense } from "react";
import { LumenChatWorkspace } from "../../components/chat/LumenChatWorkspace";
import { AuthGuard } from "../../components/auth/AuthGuard";

export default function DedicatedChatPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="p-8 text-center text-sm text-zinc-500">Loading Lumen Workspace...</div>}>
        <LumenChatWorkspace />
      </Suspense>
    </AuthGuard>
  );
}
