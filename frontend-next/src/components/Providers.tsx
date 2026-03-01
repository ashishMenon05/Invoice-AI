"use client";
"use client";

import React from "react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { GoogleOAuthProvider } from "@react-oauth/google";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <GoogleOAuthProvider clientId="381484014678-vn48s1hcno7gr09lm473tji1t200acmg.apps.googleusercontent.com">
            <ThemeProvider
                attribute="class"
                defaultTheme="dark"
                enableSystem
                disableTransitionOnChange
            >
                <QueryClientProvider client={queryClient}>
                    <TooltipProvider>
                        <AuthProvider>
                            {children}
                            <Toaster />
                            <Sonner />
                        </AuthProvider>
                    </TooltipProvider>
                </QueryClientProvider>
            </ThemeProvider>
        </GoogleOAuthProvider>
    );
}
