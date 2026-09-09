"use client";

import React from "react";
import { SettingsPageView } from "../../components/settings/SettingsPageView";
import { AuthGuard } from "../../components/auth/AuthGuard";

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsPageView />
    </AuthGuard>
  );
}
