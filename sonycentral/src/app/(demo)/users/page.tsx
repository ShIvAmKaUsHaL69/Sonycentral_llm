'use client';

import Link from "next/link";
import PlaceholderContent from "@/components/demo/placeholder-content";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { useRequireAuth } from "@/hooks/use-require-auth";

export default function UsersPage() {
  useRequireAuth();
  return (
    <ContentLayout title="Users">
      <PlaceholderContent />
    </ContentLayout>
  );
}
