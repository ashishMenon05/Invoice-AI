import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";

export type ProcessingStatus = "processing" | "auto_approved" | "under_review" | "approved" | "rejected" | "error";

interface InvoiceStatusData {
    invoice_id: string;
    status: ProcessingStatus;
    confidence_score: number | null;
}

export function useInvoiceStatus(invoiceId: string, initialStatus: ProcessingStatus = "processing") {
    const [status, setStatus] = useState<ProcessingStatus>(initialStatus);
    const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Stop polling if we reached a terminal state
        if (status !== "processing") return;

        let timeoutId: NodeJS.Timeout;

        const pollStatus = async () => {
            try {
                const data = await apiClient.getInvoiceStatus(invoiceId);
                setStatus(data.status);
                if (data.confidence_score !== undefined) {
                    setConfidenceScore(data.confidence_score);
                }

                if (data.status === "processing") {
                    timeoutId = setTimeout(pollStatus, 3000); // poll every 3 seconds
                }
            } catch (err: any) {
                console.error("Polling error:", err);
                setError(err.message || "Failed to poll status");
                setStatus("error"); // Stop polling on error
            }
        };

        pollStatus();

        return () => clearTimeout(timeoutId);
    }, [invoiceId, status]);

    return { status, confidenceScore, error };
}
