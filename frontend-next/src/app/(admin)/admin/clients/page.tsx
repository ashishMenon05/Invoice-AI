"use client";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";

const AdminClients = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get("/admin/clients")
      .then((data: any) => setClients(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Navbar title="Clients" />
      <div className="p-6 space-y-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
            {loading ? "Loading..." : `${clients.length} organization${clients.length !== 1 ? "s" : ""} registered`}
          </h2>
        </div>
        <Card className="glass-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : clients.length === 0 ? (
              <p className="text-center text-muted-foreground py-12 text-sm">No client organizations yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right text-status-approved">Approved</TableHead>
                    <TableHead className="text-right text-status-rejected">Rejected</TableHead>
                    <TableHead className="text-right text-amber-500">Pending</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((c) => {
                    const initials = (c.full_name || c.email || "?")
                      .split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0 overflow-hidden">
                              {c.avatar_url
                                ? <img src={c.avatar_url} alt={c.full_name} className="h-8 w-8 object-cover" referrerPolicy="no-referrer" />
                                : initials}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{c.full_name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{c.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{c.org_name}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{c.total_invoices}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-status-approved">{c.approved}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-status-rejected">{c.rejected}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-amber-500">{c.pending}</TableCell>
                        <TableCell className="text-right">
                          <button
                            onClick={async () => {
                              if (!confirm(`Delete ${c.org_name} and ALL associated invoices? This action cannot be undone.`)) return;
                              try {
                                await apiClient.adminDeleteClient(c.id);
                                setClients(prev => prev.filter(org => org.id !== c.id));
                              } catch (e: any) {
                                alert(e.message || "Failed to delete client");
                              }
                            }}
                            className="p-2 text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                            title="Delete Client & Invoices"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminClients;
