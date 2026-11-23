export type CustomerRow = {
  id: string;
  full_name: string;
  whatsapp: string;
  email: string | null;
  cycle: string | null;
  requested_cycle: string | null;
  confirmed: boolean;
  last_activity_date: string | null;
  dependents: string[];
};

export type CustomerFilter = "pendentes" | "aprovados" | "todos";

export function filterCustomers(rows: CustomerRow[], filter: CustomerFilter, term: string): CustomerRow[] {
  const t = term.trim().toLowerCase();
  const digits = t.replace(/\D/g, "");
  return rows.filter((c) => {
    if (filter === "pendentes" && c.confirmed) return false;
    if (filter === "aprovados" && !c.confirmed) return false;
    if (!t) return true;
    if (c.full_name.toLowerCase().includes(t)) return true;
    if ((c.email ?? "").toLowerCase().includes(t)) return true;
    if (digits.length >= 2 && c.whatsapp.replace(/\D/g, "").includes(digits)) return true;
    return false;
  });
}

export function countByApproval(rows: CustomerRow[]) {
  const approved = rows.filter((c) => c.confirmed).length;
  return { approved, pending: rows.length - approved };
}
