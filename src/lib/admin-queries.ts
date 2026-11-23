import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildApprovalIndex, type ApprovalCustomer, type ApprovalIndex } from "@/lib/customer-approval";

export function useDayBookings(date: string) {
  return useQuery({
    queryKey: ["bookings", date],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*").eq("booking_date", date).order("slot_time").order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

/** Situação do cadastro (aprovado ou não) de quem aparece na agenda. */
export function useCustomerApprovals() {
  return useQuery<ApprovalIndex>({
    queryKey: ["customers", "approvals"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id, whatsapp, email, confirmed");
      if (error) throw error;
      return buildApprovalIndex((data ?? []) as ApprovalCustomer[]);
    },
  });
}
