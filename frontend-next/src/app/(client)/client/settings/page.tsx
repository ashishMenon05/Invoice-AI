"use client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { LogOut, User, Mail, Building2, ShieldCheck, Camera, Loader2, Check, X } from "lucide-react";
import { useState, useRef } from "react";
import { apiClient } from "@/lib/api-client";

const ClientSettingsPage = () => {
    const { user, logout, setUser } = useAuth();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(user?.name || "");
    const [avatarUrl, setAvatarUrl] = useState(user?.avatar || "");
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [saveOk, setSaveOk] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);

    const handleLogout = () => { logout(); router.push("/login"); };

    const initials = name
        ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
        : user?.email?.charAt(0).toUpperCase() || "U";

    // Upload photo to backend → returns public URL
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Show instant local preview
        const localPreview = URL.createObjectURL(file);
        setPreviewAvatar(localPreview);
        setUploading(true);
        try {
            const url = await apiClient.uploadAvatar(file);
            setAvatarUrl(url);
        } catch {
            setSaveError("Photo upload failed. Try a URL instead.");
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true); setSaveError(""); setSaveOk(false);
        try {
            const updated = await apiClient.updateProfile({ full_name: name, avatar_url: avatarUrl || undefined });
            setUser?.({ ...user!, name: updated.full_name, avatar: updated.avatar_url });
            setSaveOk(true);
            setEditing(false);
            setTimeout(() => setSaveOk(false), 3000);
        } catch (e: any) {
            setSaveError(e.message || "Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setName(user?.name || "");
        setAvatarUrl(user?.avatar || "");
        setPreviewAvatar(null);
        setSaveError("");
        setEditing(false);
    };

    const displayAvatar = previewAvatar || avatarUrl || user?.avatar || null;

    return (
        <div>
            <Navbar title="Settings" />
            <div className="p-6 max-w-3xl mx-auto space-y-6">

                {/* Profile Card */}
                <Card className="glass-card overflow-hidden">
                    <div className="h-24 bg-gradient-to-r from-primary/30 via-primary/10 to-transparent" />
                    <CardContent className="px-6 pb-6 -mt-10">
                        <div className="flex items-end gap-4">
                            {/* Avatar with camera button */}
                            <div className="relative shrink-0">
                                <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold border-4 border-background shadow-lg overflow-hidden">
                                    {displayAvatar ? (
                                        <img src={displayAvatar} alt={name} className="h-20 w-20 object-cover" referrerPolicy="no-referrer" />
                                    ) : initials}
                                </div>
                                {editing && (
                                    <button
                                        disabled={uploading}
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary border-2 border-background flex items-center justify-center hover:bg-primary/80 transition-colors"
                                        title="Upload photo"
                                    >
                                        {uploading ? <Loader2 className="h-3 w-3 animate-spin text-white" /> : <Camera className="h-3 w-3 text-white" />}
                                    </button>
                                )}
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                            </div>

                            <div className="mb-1 flex-1 min-w-0">
                                <h2 className="text-xl font-bold truncate">{user?.name || "Unknown User"}</h2>
                                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                            </div>
                            <div className="mb-1 flex items-center gap-2 shrink-0">
                                <Badge variant="outline" className={`capitalize font-semibold ${user?.role === "admin" ? "border-amber-500 text-amber-500" : "border-primary text-primary"}`}>
                                    {user?.role === "admin" ? "Admin" : "Client"}
                                </Badge>
                                {!editing ? (
                                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setEditing(true)}>
                                        Edit Profile
                                    </Button>
                                ) : (
                                    <div className="flex gap-1">
                                        <Button size="sm" className="text-xs h-7 gap-1" onClick={handleSave} disabled={saving}>
                                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
                                        </Button>
                                        <Button size="sm" variant="ghost" className="text-xs h-7" onClick={handleCancel}>
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                        {saveOk && <p className="mt-3 text-sm text-status-approved">✓ Profile updated successfully</p>}
                        {saveError && <p className="mt-3 text-sm text-destructive">{saveError}</p>}
                    </CardContent>
                </Card>

                {/* Account Info (editable) */}
                <Card className="glass-card">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-sm tracking-tight text-muted-foreground uppercase">Account Information</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-5 space-y-5">
                        {/* Name */}
                        <div className="flex items-start gap-4">
                            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0 mt-1">
                                <User className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <Label className="text-xs text-muted-foreground">Full Name</Label>
                                {editing ? (
                                    <Input value={name} onChange={e => setName(e.target.value)} className="h-8 mt-1 text-sm" placeholder="Your full name" />
                                ) : (
                                    <p className="text-sm font-medium">{user?.name || "—"}</p>
                                )}
                            </div>
                        </div>

                        {/* Avatar URL */}
                        {editing && (
                            <div className="flex items-start gap-4">
                                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0 mt-1">
                                    <Camera className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <Label className="text-xs text-muted-foreground">Photo URL (or use camera icon above to upload)</Label>
                                    <Input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} className="h-8 mt-1 text-sm" placeholder="https://..." />
                                </div>
                            </div>
                        )}

                        {/* Email (read-only) */}
                        <div className="flex items-center gap-4">
                            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                                <Mail className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground">Email Address</p>
                                <p className="text-sm font-medium truncate">{user?.email || "—"}</p>
                            </div>
                            <Badge variant="secondary" className="text-xs shrink-0">Read-only</Badge>
                        </div>

                        {/* Org (read-only) */}
                        <div className="flex items-center gap-4">
                            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                                <Building2 className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground">Organization</p>
                                <p className="text-sm font-medium">{user?.company || "Not set"}</p>
                            </div>
                        </div>

                        {/* Role (read-only) */}
                        <div className="flex items-center gap-4">
                            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground">Role</p>
                                <p className="text-sm font-medium">{user?.role === "admin" ? "Administrator" : "Client"}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Session */}
                <Card className="glass-card border-destructive/30">
                    <CardHeader className="pb-3 border-b border-destructive/20">
                        <CardTitle className="text-sm tracking-tight text-destructive uppercase">Session</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">Sign out of InvoiceAI</p>
                                <p className="text-xs text-muted-foreground mt-0.5">You will be redirected to the login page</p>
                            </div>
                            <Button variant="destructive" size="sm" onClick={handleLogout} className="gap-2">
                                <LogOut className="h-4 w-4" /> Logout
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ClientSettingsPage;
