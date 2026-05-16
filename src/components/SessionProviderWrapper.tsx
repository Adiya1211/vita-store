"use client";

import { SessionProvider } from "next-auth/react";
import { AppProgressBar } from "next-nprogress-bar";
import { Toaster } from "sonner";

export default function SessionProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      {children}
      <Toaster position="top-right" richColors closeButton />
      <AppProgressBar
        height="3px"
        color="#3b82f6"
        options={{ showSpinner: false, trickleSpeed: 200 }}
        shallowRouting
        style={`
          #nprogress .bar {
            background: linear-gradient(90deg, #6366f1, #3b82f6, #06b6d4);
            box-shadow: 0 0 10px #3b82f6, 0 0 5px #6366f1;
          }
        `}
      />
    </SessionProvider>
  );
}
