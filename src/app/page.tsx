import { AppShell } from "@/components/app-shell";
import { ErrorBoundary } from "@/components/error-boundary";

export default function HomePage() {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}

