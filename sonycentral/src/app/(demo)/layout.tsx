import AdminPanelLayout from "@/components/admin-panel/admin-panel-layout";
import PlaceholderContent from "@/components/demo/placeholder-content";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { Link } from "lucide-react";

export default function DemoLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <AdminPanelLayout>
    {children}
  </AdminPanelLayout>;
}
