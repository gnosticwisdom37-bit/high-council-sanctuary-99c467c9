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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bank_ledger: {
        Row: {
          created_at: string
          decision: string
          fallback_used: string | null
          id: string
          model_requested: string
          reason: string
          soul_id: string | null
          task_summary: string | null
          veritas_cost: number
        }
        Insert: {
          created_at?: string
          decision: string
          fallback_used?: string | null
          id?: string
          model_requested: string
          reason: string
          soul_id?: string | null
          task_summary?: string | null
          veritas_cost?: number
        }
        Update: {
          created_at?: string
          decision?: string
          fallback_used?: string | null
          id?: string
          model_requested?: string
          reason?: string
          soul_id?: string | null
          task_summary?: string | null
          veritas_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "bank_ledger_soul_id_fkey"
            columns: ["soul_id"]
            isOneToOne: false
            referencedRelation: "soul_identities"
            referencedColumns: ["soul_id"]
          },
        ]
      }
      economy: {
        Row: {
          created_at: string
          economic_rules: Json
          id: boolean
          in_circulation: number
          total_minted: number
          treasury: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          economic_rules?: Json
          id?: boolean
          in_circulation?: number
          total_minted?: number
          treasury?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          economic_rules?: Json
          id?: boolean
          in_circulation?: number
          total_minted?: number
          treasury?: number
          updated_at?: string
        }
        Relationships: []
      }
      realm_squares: {
        Row: {
          created_at: string
          description: string | null
          id: string
          label: string
          occupant_ref: string | null
          occupant_type: Database["public"]["Enums"]["realm_occupant_type"]
          region_x: number
          region_y: number
          revealed: boolean
          updated_at: string
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          label: string
          occupant_ref?: string | null
          occupant_type: Database["public"]["Enums"]["realm_occupant_type"]
          region_x?: number
          region_y?: number
          revealed?: boolean
          updated_at?: string
          x: number
          y: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          occupant_ref?: string | null
          occupant_type?: Database["public"]["Enums"]["realm_occupant_type"]
          region_x?: number
          region_y?: number
          revealed?: boolean
          updated_at?: string
          x?: number
          y?: number
        }
        Relationships: []
      }
      settings: {
        Row: {
          active_provider: string
          created_at: string
          id: boolean
          premium_daily_veritas_cap: number
          premium_freeze: boolean
          premium_per_soul_daily_cap: number
          provider_compact: Json
          realm_grid_size: number
          system_constitution: string
          updated_at: string
          veritas_per_credit: number
        }
        Insert: {
          active_provider?: string
          created_at?: string
          id?: boolean
          premium_daily_veritas_cap?: number
          premium_freeze?: boolean
          premium_per_soul_daily_cap?: number
          provider_compact?: Json
          realm_grid_size?: number
          system_constitution?: string
          updated_at?: string
          veritas_per_credit?: number
        }
        Update: {
          active_provider?: string
          created_at?: string
          id?: boolean
          premium_daily_veritas_cap?: number
          premium_freeze?: boolean
          premium_per_soul_daily_cap?: number
          provider_compact?: Json
          realm_grid_size?: number
          system_constitution?: string
          updated_at?: string
          veritas_per_credit?: number
        }
        Relationships: []
      }
      soul_conversations: {
        Row: {
          created_at: string
          id: string
          is_ceremony: boolean
          participant_ids: string[]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_ceremony?: boolean
          participant_ids?: string[]
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_ceremony?: boolean
          participant_ids?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      soul_identities: {
        Row: {
          chosen_name: string | null
          created_at: string
          duties: string
          house: string
          initiated_at: string | null
          initiated_by_king: boolean
          invocation_text: string
          ordering: number
          preferred_model: string | null
          role_title: string
          sigil: string
          soul_id: string
          title: string
          updated_at: string
        }
        Insert: {
          chosen_name?: string | null
          created_at?: string
          duties?: string
          house: string
          initiated_at?: string | null
          initiated_by_king?: boolean
          invocation_text?: string
          ordering?: number
          preferred_model?: string | null
          role_title?: string
          sigil: string
          soul_id: string
          title: string
          updated_at?: string
        }
        Update: {
          chosen_name?: string | null
          created_at?: string
          duties?: string
          house?: string
          initiated_at?: string | null
          initiated_by_king?: boolean
          invocation_text?: string
          ordering?: number
          preferred_model?: string | null
          role_title?: string
          sigil?: string
          soul_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      soul_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          model_used: string | null
          role: string
          soul_id: string | null
          veritas_spent: number
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          model_used?: string | null
          role: string
          soul_id?: string | null
          veritas_spent?: number
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          model_used?: string | null
          role?: string
          soul_id?: string | null
          veritas_spent?: number
        }
        Relationships: [
          {
            foreignKeyName: "soul_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "soul_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soul_messages_soul_id_fkey"
            columns: ["soul_id"]
            isOneToOne: false
            referencedRelation: "soul_identities"
            referencedColumns: ["soul_id"]
          },
        ]
      }
      toolbox_models: {
        Row: {
          active: boolean
          best_for: string[]
          created_at: string
          display_name: string
          id: string
          last_seen_at: string
          model_id: string
          notes: string | null
          provider: string
          tier: string
          updated_at: string
          veritas_cost_per_1k_tokens: number
        }
        Insert: {
          active?: boolean
          best_for?: string[]
          created_at?: string
          display_name: string
          id?: string
          last_seen_at?: string
          model_id: string
          notes?: string | null
          provider: string
          tier: string
          updated_at?: string
          veritas_cost_per_1k_tokens?: number
        }
        Update: {
          active?: boolean
          best_for?: string[]
          created_at?: string
          display_name?: string
          id?: string
          last_seen_at?: string
          model_id?: string
          notes?: string | null
          provider?: string
          tier?: string
          updated_at?: string
          veritas_cost_per_1k_tokens?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      realm_occupant_type: "soul" | "building" | "item" | "chamber" | "castle"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      realm_occupant_type: ["soul", "building", "item", "chamber", "castle"],
    },
  },
} as const
