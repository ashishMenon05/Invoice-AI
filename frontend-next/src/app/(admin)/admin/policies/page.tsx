"use client";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, ShieldCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────
interface Policy {
    organization_id: string;
    auto_approve_confidence_threshold: number;
    max_auto_approve_amount: number;
    high_value_escalation_threshold: number;
    require_review_if_duplicate: boolean;
    require_review_if_fraud_flag: boolean;
    ai_auto_review_enabled: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

const NumberField = ({
    label,
    description,
    value,
    onChange,
    min,
    max,
    step = 1,
    prefix = "",
    suffix = "",
}: {
    label: string;
    description: string;
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    step?: number;
    prefix?: string;
    suffix?: string;
}) => (
    <div className="space-y-1.5">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
        <div className="flex items-center gap-2 mt-2">
            {prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}
            <Input
                type="number"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    if (!isNaN(parsed)) onChange(clamp(parsed, min, max));
                }}
                className="max-w-[160px] font-mono"
            />
            {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
        </div>
    </div>
);

const ToggleField = ({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) => (
    <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
            <Label className="text-sm font-medium">{label}</Label>
            <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Switch checked={checked} onCheckedChange={onChange} />
    </div>
);

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────
const AdminPoliciesPage = () => {
    const [clients, setClients] = useState<any[]>([]);
    const [orgId, setOrgId] = useState("");
    const [policy, setPolicy] = useState<Policy | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    // ── Load available orgs on mount ────────────────────────────────────────
    useEffect(() => {
        apiClient.get("/admin/clients")
            .then((data: any) => setClients(data))
            .catch(console.error);
    }, []);

    // ── Load policy for an org ──────────────────────────────────────────────
    const fetchPolicy = async (targetOrgId: string) => {
        if (!targetOrgId.trim()) return;
        setOrgId(targetOrgId);
        setLoading(true);
        try {
            const data = await apiClient.getPolicy(targetOrgId.trim());
            setPolicy(data);
            setDirty(false);
        } catch {
            toast.error("Failed to load policy.");
        } finally {
            setLoading(false);
        }
    };

    // ── Save policy to backend ──────────────────────────────────────────────
    const savePolicy = async () => {
        if (!policy) return;
        setSaving(true);
        try {
            await apiClient.updatePolicy(policy.organization_id, {
                auto_approve_confidence_threshold: policy.auto_approve_confidence_threshold,
                max_auto_approve_amount: policy.max_auto_approve_amount,
                high_value_escalation_threshold: policy.high_value_escalation_threshold,
                require_review_if_duplicate: policy.require_review_if_duplicate,
                require_review_if_fraud_flag: policy.require_review_if_fraud_flag,
                ai_auto_review_enabled: policy.ai_auto_review_enabled,
            });
            toast.success("Policy saved successfully.");
            setDirty(false);
        } catch {
            toast.error("Failed to save policy.");
        } finally {
            setSaving(false);
        }
    };

    const update = (field: keyof Policy) => (value: any) => {
        setPolicy((p) => p ? { ...p, [field]: value } : p);
        setDirty(true);
    };

    // ────────────────────────────────────────────────────────────────────────
    return (
        <div>
            <Navbar title="Policy Management" />
            <div className="p-6 max-w-7xl mx-auto flex flex-col md:flex-row gap-8">

                {/* Left Sidebar: Organization List */}
                <div className="w-full md:w-80 shrink-0 space-y-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" /> Available Organizations
                    </h2>

                    {clients.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-4 bg-muted/20 border border-border rounded-lg">Loading organizations...</p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {clients.map(client => (
                                <div
                                    key={client.organization_id}
                                    onClick={() => fetchPolicy(client.organization_id)}
                                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${orgId === client.organization_id ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:border-primary/50 hover:bg-muted/50'}`}
                                >
                                    <h3 className="text-sm font-medium">{client.org_name || "Unnamed Org"}</h3>
                                    <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Panel: Policy Settings */}
                <div className="flex-1 space-y-6">
                    {!policy && !loading && (
                        <div className="h-64 flex flex-col items-center justify-center border border-dashed border-border rounded-xl bg-card/30">
                            <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                            <p className="text-muted-foreground">Select an organization from the list to view its policy.</p>
                        </div>
                    )}

                    {loading && (
                        <div className="h-64 flex items-center justify-center border border-border rounded-xl bg-card/30">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}

                    {policy && !loading && (
                        <>
                            {/* Form Header */}
                            <div>
                                <h1 className="text-2xl font-bold">Policy Rules Matrix</h1>
                                <p className="text-muted-foreground text-sm">Configuring autonomous verification rules for <span className="font-mono text-primary">{policy.organization_id}</span></p>
                            </div>

                            {/* Approval Thresholds */}
                            <Card className="glass-card">
                                <CardHeader>
                                    <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">
                                        Approval Thresholds
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <NumberField
                                        label="Auto-Approve Confidence Threshold"
                                        description="Minimum AI extraction confidence (0–1) required to bypass manual review."
                                        value={policy.auto_approve_confidence_threshold}
                                        onChange={update("auto_approve_confidence_threshold")}
                                        min={0.5}
                                        max={1.0}
                                        step={0.01}
                                        suffix="(0 – 1)"
                                    />
                                    <NumberField
                                        label="Maximum Auto-Approve Amount"
                                        description="Invoices above this amount will always be sent to UNDER_REVIEW regardless of confidence."
                                        value={policy.max_auto_approve_amount}
                                        onChange={update("max_auto_approve_amount")}
                                        min={0}
                                        max={10000000}
                                        step={500}
                                        prefix="$"
                                    />
                                    <NumberField
                                        label="High-Value Escalation Threshold"
                                        description="Invoices above this amount trigger an escalation event flag for senior review."
                                        value={policy.high_value_escalation_threshold}
                                        onChange={update("high_value_escalation_threshold")}
                                        min={0}
                                        max={10000000}
                                        step={1000}
                                        prefix="$"
                                    />
                                </CardContent>
                            </Card>

                            {/* Enforcement Toggles */}
                            <Card className="glass-card">
                                <CardHeader>
                                    <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">
                                        Intelligence Enforcement
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <ToggleField
                                        label="Require Review if Duplicate"
                                        description="When the system detects a potential duplicate invoice, always route to UNDER_REVIEW."
                                        checked={policy.require_review_if_duplicate}
                                        onChange={update("require_review_if_duplicate")}
                                    />
                                    <div className="border-t border-border pt-4">
                                        <ToggleField
                                            label="Require Review if Fraud Flag"
                                            description="When fraud heuristics trigger, always route to UNDER_REVIEW regardless of confidence."
                                            checked={policy.require_review_if_fraud_flag}
                                            onChange={update("require_review_if_fraud_flag")}
                                        />
                                    </div>
                                    <div className="border-t border-border pt-4">
                                        <ToggleField
                                            label="Autonomous AI Auditor"
                                            description="When UNDER_REVIEW is triggered, spawn a secondary AI agent to explicitly approve legitimate invoices or reject fraudulent ones automatically."
                                            checked={policy.ai_auto_review_enabled}
                                            onChange={update("ai_auto_review_enabled")}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Save Bar */}
                            <div className="flex justify-end sticky bottom-6 z-10 p-4 border rounded-lg bg-card/80 backdrop-blur shadow-lg">
                                <Button
                                    onClick={savePolicy}
                                    disabled={saving || !dirty}
                                    className="min-w-[160px] shadow-lg shadow-primary/20"
                                >
                                    {saving ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Save className="h-4 w-4 mr-2" />
                                    )}
                                    {saving ? "Deploying Policy…" : dirty ? "Save & Apply Changes" : "Policies Saved"}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div >
    );
};

export default AdminPoliciesPage;
