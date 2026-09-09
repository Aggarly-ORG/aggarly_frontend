"use client";

import React from "react";
import { ProfilePageView } from "../../components/profile/ProfilePageView";
import { AuthGuard } from "../../components/auth/AuthGuard";

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfilePageView />
    </AuthGuard>
  );
}
