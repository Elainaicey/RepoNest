import { ProtectedShell } from "@/components/app-shell";

export default function ProductLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <ProtectedShell>{children}</ProtectedShell>;
}
