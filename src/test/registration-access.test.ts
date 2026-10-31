import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Guard the deployed SQL rule, not UI copy: approval must not become an access gate again.
const migration = readFileSync("drizzle/migrations/0011_open_booking_without_admin_approval.sql", "utf8");
const booking = migration.split("CREATE OR REPLACE FUNCTION public.book_approved")[1]?.split("end $$;")[0] ?? "";
const status = migration.split("CREATE OR REPLACE FUNCTION public.customer_status")[1]?.split("$$;")[0] ?? "";

describe("Registration without administrative approval", () => {
  it("allows existing registrations regardless of the confirmation flag", () => {
    expect(status).toContain("when c.id is null then 'nao_cadastrado' else 'aprovado'");
    expect(status).not.toMatch(/c\.confirmed/);
    expect(booking).toContain("return query select * from public.book_cycles");
    expect(booking).not.toMatch(/c\.confirmed/);
  });

  it("still requires registration before booking", () => {
    expect(booking).toContain("if not found then raise exception 'Faça seu cadastro primeiro'");
  });

  it("retains named dependents in the booked party size", () => {
    expect(booking).toContain("1 + cardinality(c.dependents)");
  });
});