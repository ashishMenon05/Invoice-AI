"use client";

// Real API Client communicating with FastAPI
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/v1";

const getHeaders = (isFormData = false) => {
    // Helper to get cookies across environments (Client side only)
    if (typeof document === 'undefined') return {};
    const match = document.cookie.match(new RegExp('(^| )auth_token=([^;]+)'));
    const token = match ? match[2] : null;

    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (!isFormData) headers["Content-Type"] = "application/json";

    return headers;
}

export const apiClient = {
    uploadInvoice: async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`${API_URL}/invoices/upload`, {
            method: "POST",
            headers: getHeaders(true),
            body: formData
        });
        if (!res.ok) throw new Error("Upload failed");
        return res.json();
    },

    listInvoices: async (role: "admin" | "client", limit?: number) => {
        let endpoint = role === "admin" ? `${API_URL}/admin/invoices` : `${API_URL}/invoices/my`;
        if (limit && role === "admin") endpoint += `?limit=${limit}`;
        const res = await fetch(endpoint, { headers: getHeaders() });
        if (!res.ok) throw new Error("Failed to fetch invoices");
        return res.json();
    },

    getInvoiceDetails: async (id: string, role: "admin" | "client" = "client") => {
        const endpoint = role === "admin" ? `${API_URL}/admin/invoices` : `${API_URL}/invoices/${id}`;
        // If admin, we fetch all and find it since admin GET single wasn't rigidly built yet, 
        // OR we can rely on standard routing if it gets added. For now, hitting /invoices/{id} may fail for admin if not in org,
        // Wait, actually let's assume client route for details if we just need it.
        // Actually, backend admin routes doesn't have `GET /admin/invoices/{id}`. Lets fetch all and filter for Admin.
        if (role === "admin") {
            const all = await apiClient.listInvoices("admin");
            return all.find((i: any) => i.id === id);
        }

        const res = await fetch(endpoint, {
            headers: getHeaders()
        });
        if (!res.ok) throw new Error("Failed to fetch invoice details");
        return res.json();
    },

    getInvoiceStatus: async (id: string) => {
        const res = await fetch(`${API_URL}/invoices/${id}/status`, {
            headers: getHeaders()
        });
        if (!res.ok) throw new Error("Failed to fetch invoice status");
        return res.json();
    },

    updateInvoiceStatus: async (id: string, status: "approved" | "rejected", reason?: string) => {
        const formData = new URLSearchParams();
        if (reason) formData.append("reason", reason);
        else formData.append("reason", "Approved by Admin");

        const res = await fetch(`${API_URL}/admin/invoices/${id}/${status}`, {
            method: "POST",
            headers: {
                ...getHeaders(true),
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: formData.toString()
        });
        if (!res.ok) throw new Error(`Failed to ${status} invoice`);
        return res.json();
    },

    getAnalytics: async () => {
        const res = await fetch(`${API_URL}/admin/analytics`, {
            headers: getHeaders()
        });
        if (!res.ok) throw new Error("Failed to fetch analytics");
        return res.json();
    },

    getPolicy: async (orgId: string) => {
        const res = await fetch(`${API_URL}/admin/policies/${orgId}`, {
            headers: getHeaders()
        });
        if (!res.ok) throw new Error("Failed to fetch policy");
        return res.json();
    },

    updatePolicy: async (orgId: string, updates: Record<string, any>) => {
        const res = await fetch(`${API_URL}/admin/policies/${orgId}`, {
            method: "PUT",
            headers: getHeaders(),
            body: JSON.stringify(updates)
        });
        if (!res.ok) throw new Error("Failed to update policy");
        return res.json();
    },

    triggerAutoReviewBatch: async () => {
        const res = await fetch(`${API_URL}/admin/invoices/auto-review-batch`, {
            method: "POST",
            headers: getHeaders()
        });
        if (!res.ok) throw new Error("Failed to trigger auto review batch");
        return res.json();
    },

    autoReviewSingleInvoice: async (id: string) => {
        const res = await fetch(`${API_URL}/admin/invoices/${id}/auto-review`, {
            method: "POST",
            headers: getHeaders()
        });
        if (!res.ok) throw new Error("Failed to auto-review single invoice");
        return res.json();
    },

    getFileBlob: async (id: string, role: "client" | "admin" = "client") => {
        const res = await fetch(`${API_URL}/${role === "admin" ? "admin/invoices" : "invoices"}/${id}/file`, {
            method: "GET",
            headers: getHeaders(true)
        });
        if (!res.ok) throw new Error("Failed to fetch file blob");
        const blob = await res.blob();
        return window.URL.createObjectURL(blob);
    },

    /** Generic authenticated GET — use for admin endpoints */
    get: async (path: string) => {
        const res = await fetch(`${API_URL}${path}`, {
            method: "GET",
            headers: getHeaders()
        });
        if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
        return res.json();
    },

    deleteInvoice: async (id: string) => {
        const res = await fetch(`${API_URL}/invoices/${id}`, {
            method: "DELETE",
            headers: getHeaders()
        });
        if (!res.ok) throw new Error("Delete failed");
    },

    reprocessInvoice: async (id: string) => {
        const res = await fetch(`${API_URL}/invoices/${id}/reprocess`, {
            method: "POST",
            headers: getHeaders()
        });
        if (!res.ok) throw new Error("Reprocess failed");
        return res.json();
    },

    reprocessFailedBatch: async () => {
        const res = await fetch(`${API_URL}/admin/invoices/reprocess-failed`, {
            method: "POST",
            headers: getHeaders()
        });
        if (!res.ok) throw new Error("Batch reprocess failed");
        return res.json();
    },

    adminApproveInvoice: async (id: string) => {
        const res = await fetch(`${API_URL}/admin/invoices/${id}/approve`, {
            method: "POST",
            headers: getHeaders()
        });
        if (!res.ok) throw new Error("Approval failed");
        return res.json();
    },

    adminRejectInvoice: async (id: string, reason: string) => {
        const formData = new FormData();
        formData.append("reason", reason);
        const res = await fetch(`${API_URL}/admin/invoices/${id}/reject`, {
            method: "POST",
            headers: getHeaders(true),
            body: formData
        });
        if (!res.ok) throw new Error("Rejection failed");
        return res.json();
    },

    adminDeleteClient: async (orgId: string) => {
        const res = await fetch(`${API_URL}/admin/clients/${orgId}`, {
            method: "DELETE",
            headers: getHeaders()
        });
        if (!res.ok) throw new Error("Failed to delete client organization");
    },

    getNotifications: async () => {
        const res = await fetch(`${API_URL}/invoices/notifications`, { headers: getHeaders() });
        if (!res.ok) throw new Error("Failed to load notifications");
        return res.json();
    },

    clearNotifications: async () => {
        // Notifications are derived from invoice state — no server-side clear needed
        // This is a no-op placeholder so the UI can dismiss them locally
        return;
    },

    updateProfile: async (data: { full_name?: string; avatar_url?: string }) => {
        const res = await fetch(`${API_URL}/auth/me`, {
            method: "PATCH",
            headers: { ...getHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Profile update failed");
        return res.json();
    },

    uploadAvatar: async (file: File): Promise<string> => {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`${API_URL}/auth/me/avatar`, {
            method: "POST",
            headers: { Authorization: getHeaders().Authorization },
            body: form,
        });
        if (!res.ok) throw new Error("Avatar upload failed");
        const data = await res.json();
        return data.avatar_url;
    }
};
