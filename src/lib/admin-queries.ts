import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
