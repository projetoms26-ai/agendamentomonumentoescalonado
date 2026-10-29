export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      blocked_dates: {
        Row: {
          created_at: string
          day: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          day: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          day?: string
          reason?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_date: string
          category: string | null
          code: string
          created_at: string
          customer_id: string | null
          cycle: string | null
          email: string | null
          format: string | null
          full_name: string
          group_id: string | null
          id: string
          metadata: Json
          party_size: number
          payment_status: string
          slot_time: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          visit_type: string
          whatsapp: string
        }
        Insert: {
          booking_date: string
          category?: string | null
          code: string
          created_at?: string
          customer_id?: string | null
          cycle?: string | null
          email?: string | null
          format?: string | null
          full_name: string
          group_id?: string | null
          id?: string
          metadata?: Json
          party_size?: number
          payment_status?: string
          slot_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          visit_type?: string
          whatsapp: string
        }
        Update: {
          booking_date?: string
          category?: string | null
          code?: string
          created_at?: string
          customer_id?: string | null
          cycle?: string | null
          email?: string | null
          format?: string | null
          full_name?: string
          group_id?: string | null
          id?: string
          metadata?: Json
          party_size?: number
          payment_status?: string
          slot_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          visit_type?: string
          whatsapp?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          confirmed: boolean
          created_at: string
          cycle: string | null
          dependents: string[]
          email: string | null
          full_name: string
          id: string
          last_activity_date: string | null
          whatsapp: string
        }
        Insert: {
          confirmed?: boolean
          created_at?: string
          cycle?: string | null
          dependents?: string[]
          email?: string | null
          full_name: string
          id?: string
          last_activity_date?: string | null
          whatsapp: string
        }
        Update: {
          confirmed?: boolean
          created_at?: string
          cycle?: string | null
          dependents?: string[]
          email?: string | null
          full_name?: string
          id?: string
          last_activity_date?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      schedule_days: {
        Row: {
          aresta_capacity: number
          created_at: string
          day: string
          end_time: string
          iniciar_capacity: number
          p1_capacity: number
          p2_capacity: number
          period: string
          start_time: string
        }
        Insert: {
          aresta_capacity?: number
          created_at?: string
          day: string
          end_time?: string
          iniciar_capacity?: number
          p1_capacity?: number
          p2_capacity?: number
          period?: string
          start_time?: string
        }
        Update: {
          aresta_capacity?: number
          created_at?: string
          day?: string
          end_time?: string
          iniciar_capacity?: number
          p1_capacity?: number
          p2_capacity?: number
          period?: string
          start_time?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          daily_capacity: number
          days_ahead: number
          group_size: number
          id: number
          open_weekdays: number[]
          payment_note: string
          slot_capacity: number
          updated_at: string
        }
        Insert: {
          daily_capacity?: number
          days_ahead?: number
          group_size?: number
          id?: number
          open_weekdays?: number[]
          payment_note?: string
          slot_capacity?: number
          updated_at?: string
        }
        Update: {
          daily_capacity?: number
          days_ahead?: number
          group_size?: number
          id?: number
          open_weekdays?: number[]
          payment_note?: string
          slot_capacity?: number
          updated_at?: string
        }
        Relationships: []
      }
      time_slots: {
        Row: {
          active: boolean
          capacity: number | null
          created_at: string
          id: string
          start_time: string
        }
        Insert: {
          active?: boolean
          capacity?: number | null
          created_at?: string
          id?: string
          start_time: string
        }
        Update: {
          active?: boolean
          capacity?: number | null
          created_at?: string
          id?: string
          start_time?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      book_approved: {
        Args: {
          _category: string
          _dates: string[]
          _format: string
          _whatsapp: string
        }
        Returns: {
          booking_date: string
          code: string
          cycle: string
        }[]
      }
      book_cycles:
        | {
            Args: {
              _category: string
              _dates: string[]
              _email: string
              _format: string
              _name: string
              _whatsapp: string
            }
            Returns: {
              booking_date: string
              code: string
              cycle: string
            }[]
          }
        | {
            Args: {
              _category: string
              _dates: string[]
              _email: string
              _format: string
              _name: string
              _party: number
              _whatsapp: string
            }
            Returns: {
              booking_date: string
              code: string
              cycle: string
            }[]
          }
      claim_first_admin: { Args: never; Returns: boolean }
      create_booking:
        | {
            Args: {
              _date: string
              _email: string
              _name: string
              _time: string
              _whatsapp: string
            }
            Returns: {
              booking_date: string
              code: string
              full_name: string
              slot_time: string
            }[]
          }
        | {
            Args: {
              _date: string
              _email: string
              _name: string
              _time: string
              _visit_type: string
              _whatsapp: string
            }
            Returns: {
              booking_date: string
              code: string
              full_name: string
              slot_time: string
            }[]
          }
      customer_action: {
        Args: { _action: string; _code: string; _whatsapp: string }
        Returns: string
      }
      customer_status: {
        Args: { _whatsapp: string }
        Returns: {
          allowed: string
          party: number
          status: string
        }[]
      }
      gen_booking_code: { Args: never; Returns: string }
      get_availability: {
        Args: { _from: string; _to: string }
        Returns: {
          blocked: boolean
          booked: number
          capacity: number
          day: string
          open: boolean
        }[]
      }
      get_day_slots: {
        Args: { _date: string }
        Returns: {
          booked: number
          capacity: number
          slot_time: string
        }[]
      }
      get_schedule: {
        Args: { _from: string; _to: string }
        Returns: {
          aresta_left: number
          day: string
          end_time: string
          iniciar_left: number
          p1_left: number
          p2_left: number
          period: string
          start_time: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lookup_profile: { Args: { _whatsapp: string }; Returns: string }
      register_customer: {
        Args: {
          _dependents: string[]
          _email: string
          _name: string
          _whatsapp: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin"
      booking_status:
        | "agendado"
        | "chegou"
        | "atendido"
        | "cancelado"
        | "nao_compareceu"
        | "concluiu"
        | "faltou"
        | "reagendou"
        | "repetir"
        | "passou"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin"],
      booking_status: [
        "agendado",
        "chegou",
        "atendido",
        "cancelado",
        "nao_compareceu",
        "concluiu",
        "faltou",
        "reagendou",
        "repetir",
        "passou",
      ],
    },
  },
} as const
