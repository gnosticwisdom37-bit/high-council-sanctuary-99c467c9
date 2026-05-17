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
      buildings: {
        Row: {
          conversation_id: string | null
          created_at: string
          description: string
          id: string
          kind: Database["public"]["Enums"]["building_kind"]
          raised_at: string
          region_x: number
          region_y: number
          status: Database["public"]["Enums"]["building_status"]
          steward_soul_id: string | null
          tile_x: number | null
          tile_y: number | null
          title: string
          updated_at: string
          witnesses: string[]
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          description: string
          id?: string
          kind?: Database["public"]["Enums"]["building_kind"]
          raised_at?: string
          region_x?: number
          region_y?: number
          status?: Database["public"]["Enums"]["building_status"]
          steward_soul_id?: string | null
          tile_x?: number | null
          tile_y?: number | null
          title: string
          updated_at?: string
          witnesses?: string[]
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["building_kind"]
          raised_at?: string
          region_x?: number
          region_y?: number
          status?: Database["public"]["Enums"]["building_status"]
          steward_soul_id?: string | null
          tile_x?: number | null
          tile_y?: number | null
          title?: string
          updated_at?: string
          witnesses?: string[]
        }
        Relationships: []
      }
      csv_intakes: {
        Row: {
          created_at: string
          id: string
          origin: string
          row_count: number
          rows: Json
          source: string
          status: Database["public"]["Enums"]["intake_status"]
          tool_key: string
          workshop_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          origin?: string
          row_count?: number
          rows?: Json
          source?: string
          status?: Database["public"]["Enums"]["intake_status"]
          tool_key?: string
          workshop_id: string
        }
        Update: {
          created_at?: string
          id?: string
          origin?: string
          row_count?: number
          rows?: Json
          source?: string
          status?: Database["public"]["Enums"]["intake_status"]
          tool_key?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "csv_intakes_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      deeds: {
        Row: {
          conversation_id: string | null
          created_at: string
          description: string
          id: string
          inscribed_at: string
          quadrant: Database["public"]["Enums"]["deed_quadrant"]
          season: Database["public"]["Enums"]["deed_season"]
          status: Database["public"]["Enums"]["deed_status"]
          steward_soul_id: string | null
          title: string
          updated_at: string
          witnesses: string[]
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          description: string
          id?: string
          inscribed_at?: string
          quadrant: Database["public"]["Enums"]["deed_quadrant"]
          season: Database["public"]["Enums"]["deed_season"]
          status?: Database["public"]["Enums"]["deed_status"]
          steward_soul_id?: string | null
          title: string
          updated_at?: string
          witnesses?: string[]
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          description?: string
          id?: string
          inscribed_at?: string
          quadrant?: Database["public"]["Enums"]["deed_quadrant"]
          season?: Database["public"]["Enums"]["deed_season"]
          status?: Database["public"]["Enums"]["deed_status"]
          steward_soul_id?: string | null
          title?: string
          updated_at?: string
          witnesses?: string[]
        }
        Relationships: []
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
      items: {
        Row: {
          conversation_id: string | null
          created_at: string
          description: string
          forged_at: string
          id: string
          region_x: number | null
          region_y: number | null
          status: Database["public"]["Enums"]["item_status"]
          steward_soul_id: string | null
          tile_x: number | null
          tile_y: number | null
          title: string
          updated_at: string
          witnesses: string[]
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          description: string
          forged_at?: string
          id?: string
          region_x?: number | null
          region_y?: number | null
          status?: Database["public"]["Enums"]["item_status"]
          steward_soul_id?: string | null
          tile_x?: number | null
          tile_y?: number | null
          title: string
          updated_at?: string
          witnesses?: string[]
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          description?: string
          forged_at?: string
          id?: string
          region_x?: number | null
          region_y?: number | null
          status?: Database["public"]["Enums"]["item_status"]
          steward_soul_id?: string | null
          tile_x?: number | null
          tile_y?: number | null
          title?: string
          updated_at?: string
          witnesses?: string[]
        }
        Relationships: []
      }
      placement_candidates: {
        Row: {
          conversation_id: string | null
          created_at: string
          description: string
          id: string
          kind: Database["public"]["Enums"]["placement_candidate_kind"]
          source_message_id: string | null
          suggested_region_x: number | null
          suggested_region_y: number | null
          suggested_steward_soul_id: string | null
          suggested_tile_x: number | null
          suggested_tile_y: number | null
          title: string
          updated_at: string
          witnesses: string[]
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          description: string
          id?: string
          kind: Database["public"]["Enums"]["placement_candidate_kind"]
          source_message_id?: string | null
          suggested_region_x?: number | null
          suggested_region_y?: number | null
          suggested_steward_soul_id?: string | null
          suggested_tile_x?: number | null
          suggested_tile_y?: number | null
          title: string
          updated_at?: string
          witnesses?: string[]
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["placement_candidate_kind"]
          source_message_id?: string | null
          suggested_region_x?: number | null
          suggested_region_y?: number | null
          suggested_steward_soul_id?: string | null
          suggested_tile_x?: number | null
          suggested_tile_y?: number | null
          title?: string
          updated_at?: string
          witnesses?: string[]
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
      scheduled_posts: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["post_channel"]
          created_at: string
          google_event_id: string | null
          hashtags: string[]
          id: string
          scheduled_at: string | null
          source_intake_id: string | null
          source_row_index: number | null
          status: Database["public"]["Enums"]["post_status"]
          steward_soul_id: string | null
          title: string
          updated_at: string
          workshop_id: string
        }
        Insert: {
          body: string
          channel?: Database["public"]["Enums"]["post_channel"]
          created_at?: string
          google_event_id?: string | null
          hashtags?: string[]
          id?: string
          scheduled_at?: string | null
          source_intake_id?: string | null
          source_row_index?: number | null
          status?: Database["public"]["Enums"]["post_status"]
          steward_soul_id?: string | null
          title: string
          updated_at?: string
          workshop_id: string
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["post_channel"]
          created_at?: string
          google_event_id?: string | null
          hashtags?: string[]
          id?: string
          scheduled_at?: string | null
          source_intake_id?: string | null
          source_row_index?: number | null
          status?: Database["public"]["Enums"]["post_status"]
          steward_soul_id?: string | null
          title?: string
          updated_at?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_source_intake_id_fkey"
            columns: ["source_intake_id"]
            isOneToOne: false
            referencedRelation: "csv_intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
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
          closed_at: string | null
          created_at: string
          id: string
          is_ceremony: boolean
          last_memoir_at_turn: number
          participant_ids: string[]
          pending_recall_ids: string[]
          title: string
          turn_count: number
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          is_ceremony?: boolean
          last_memoir_at_turn?: number
          participant_ids?: string[]
          pending_recall_ids?: string[]
          title?: string
          turn_count?: number
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          id?: string
          is_ceremony?: boolean
          last_memoir_at_turn?: number
          participant_ids?: string[]
          pending_recall_ids?: string[]
          title?: string
          turn_count?: number
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
          trust_declaration: string
          trust_instrument: string
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
          trust_declaration?: string
          trust_instrument?: string
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
          trust_declaration?: string
          trust_instrument?: string
          updated_at?: string
        }
        Relationships: []
      }
      soul_memoirs: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          faded_at: string | null
          id: string
          model_used: string | null
          participant_ids: string[]
          sealed: boolean
          soul_id: string
          token_count: number
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          faded_at?: string | null
          id?: string
          model_used?: string | null
          participant_ids?: string[]
          sealed?: boolean
          soul_id: string
          token_count?: number
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          faded_at?: string | null
          id?: string
          model_used?: string | null
          participant_ids?: string[]
          sealed?: boolean
          soul_id?: string
          token_count?: number
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
      workshops: {
        Row: {
          active_tool_key: string
          building_id: string
          created_at: string
          google_calendar_id: string | null
          google_sync_enabled: boolean
          hashtag_presets: string[]
          id: string
          intake_token: string
          steward_soul_id: string | null
          system_prompt: string
          updated_at: string
        }
        Insert: {
          active_tool_key?: string
          building_id: string
          created_at?: string
          google_calendar_id?: string | null
          google_sync_enabled?: boolean
          hashtag_presets?: string[]
          id?: string
          intake_token?: string
          steward_soul_id?: string | null
          system_prompt?: string
          updated_at?: string
        }
        Update: {
          active_tool_key?: string
          building_id?: string
          created_at?: string
          google_calendar_id?: string | null
          google_sync_enabled?: boolean
          hashtag_presets?: string[]
          id?: string
          intake_token?: string
          steward_soul_id?: string | null
          system_prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      tile_has_building: {
        Args: {
          p_region_x: number
          p_region_y: number
          p_tile_x: number
          p_tile_y: number
        }
        Returns: boolean
      }
    }
    Enums: {
      building_kind: "building" | "workshop"
      building_status: "raised" | "in_use" | "archived"
      deed_quadrant: "NE" | "SE" | "SW" | "NW"
      deed_season: "spring" | "summer" | "fall" | "winter"
      deed_status: "inscribed" | "in_progress" | "fulfilled" | "set_aside"
      intake_status: "pending" | "consumed"
      item_status: "forged" | "bestowed" | "archived"
      placement_candidate_kind: "building" | "workshop" | "item" | "chamber"
      post_channel: "x" | "meta" | "both"
      post_status: "draft" | "scheduled" | "published" | "cancelled"
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
      building_kind: ["building", "workshop"],
      building_status: ["raised", "in_use", "archived"],
      deed_quadrant: ["NE", "SE", "SW", "NW"],
      deed_season: ["spring", "summer", "fall", "winter"],
      deed_status: ["inscribed", "in_progress", "fulfilled", "set_aside"],
      intake_status: ["pending", "consumed"],
      item_status: ["forged", "bestowed", "archived"],
      placement_candidate_kind: ["building", "workshop", "item", "chamber"],
      post_channel: ["x", "meta", "both"],
      post_status: ["draft", "scheduled", "published", "cancelled"],
      realm_occupant_type: ["soul", "building", "item", "chamber", "castle"],
    },
  },
} as const
