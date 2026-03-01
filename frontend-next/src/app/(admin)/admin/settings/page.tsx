"use client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { LogOut, Mail, Building2, ShieldCheck, Key, Users } from "lucide-react";

const AdminSettingsPage = () => {
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    const initials = user?.name
        ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
        : user?.email?.charAt(0).toUpperCase() || "A";

    return (
        <div>
            <Navbar title="Settings" />
            <div className="p-6 max-w-3xl mx-auto space-y-6">

                {/* Profile Card */}
                <Card className="glass-card overflow-hidden">
                    <div className="h-24 bg-gradient-to-r from-amber-500/30 via-amber-500/10 to-transparent" />
                    <CardContent className="px-6 pb-6 -mt-10">
                        <div className="flex items-end gap-4">
                            <div className="h-20 w-20 rounded-2xl bg-amber-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-background shadow-lg shrink-0 overflow-hidden">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt={user?.name} className="h-20 w-20 object-cover" referrerPolicy="no-referrer" />
                                ) : initials}
                            </div>
                            <div className="mb-1 flex-1 min-w-0">
                                <h2 className="text-xl font-bold truncate">{user?.name || "Admin"}</h2>
                                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                            </div>
                            <Badge variant="outline" className="mb-1 shrink-0 border-amber-500 text-amber-500 font-semibold">
                                Administrator
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Account Info */}
                <Card className="glass-card">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-sm tracking-tight text-muted-foreground uppercase">Account Information</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-5 space-y-5">
                        <Row icon={<Mail className="h-4 w-4" />} label="Email Address" value={user?.email || "—"} />
                        <Row icon={<ShieldCheck className="h-4 w-4" />} label="Role" value="Administrator" highlight />
                        <Row icon={<Building2 className="h-4 w-4" />} label="Organization" value={user?.company || "Global Admin"} />
                    </CardContent>
                </Card>

                {/* Admin Info */}
                <Card className="glass-card border-amber-500/20">
                    <CardHeader className="pb-3 border-b border-amber-500/20">
                        <CardTitle className="text-sm tracking-tight text-amber-500 uppercase">Admin Access</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-5 space-y-4">
                        <div className="flex items-center gap-3 text-sm">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="font-medium">Cross-organization access</p>
                                <p className="text-xs text-muted-foreground">You can review invoices from all registered organizations</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Key className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="font-medium">Role enforcement</p>
                                <p className="text-xs text-muted-foreground">Admin role is system-managed and enforced on every login</p>
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

const Row = ({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) => (
    <div className="flex items-center gap-4">
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-sm font-medium truncate ${highlight ? "text-amber-500" : ""}`}>{value}</p>
        </div>
    </div>
);

export default AdminSettingsPage;
