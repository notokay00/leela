import type { ReactNode } from "react";
import { notFound } from "next/navigation";

/**
 * DEVELOPMENT-ONLY Correspondence harness layout.
 * Strictly returns 404 in production (`NODE_ENV !== "development"`).
 */
export default function CorrespondenceDevHarnessLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="correspondence-stage correspondence-ground-enter">
      <div className="correspondence-content-enter">{children}</div>
    </div>
  );
}
