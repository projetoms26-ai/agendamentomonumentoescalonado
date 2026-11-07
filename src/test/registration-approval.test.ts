import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("drizzle/migrations/0013_require_approval_login_flow.sql", "utf8");
const booking = sql.split("CREATE FUNCTION public.book_periods(")[1]?.split("END $$;")[0] ?? "";

describe("Booking requires administrative approval", () => {
  it("blocks pending registrations", () => {
    expect(booking).toContain("IF NOT ok THEN RAISE EXCEPTION 'Aguarde a aprovação do seu cadastro'");
  });
  it("reports pending status at login", () => {
    expect(sql).toContain("when c.confirmed then 'aprovado' else 'pendente'");
  });
});
