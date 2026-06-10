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
      blog_archive: {
        Row: {
          categories: string[]
          comments: number | null
          created_at: string
          excerpt: string
          id: string
          published_at: string | null
          raw: Json
          source_filename: string
          tags: string[]
          title: string
          updated_at: string
          url: string | null
          views: number | null
          workshop_id: string
          wp_post_id: string | null
        }
        Insert: {
          categories?: string[]
          comments?: number | null
          created_at?: string
          excerpt?: string
          id?: string
          published_at?: string | null
          raw?: Json
          source_filename: string
          tags?: string[]
          title: string
          updated_at?: string
          url?: string | null
          views?: number | null
          workshop_id: string
          wp_post_id?: string | null
        }
        Update: {
          categories?: string[]
          comments?: number | null
          created_at?: string
          excerpt?: string
          id?: string
          published_at?: string | null
          raw?: Json
          source_filename?: string
          tags?: string[]
          title?: string
          updated_at?: string
          url?: string | null
          views?: number | null
          workshop_id?: string
          wp_post_id?: string | null
        }
        Relationships: []
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
      contact_group_members: {
        Row: {
          contact_id: string
          created_at: string
          group_id: string
          id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          group_id: string
          id?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_group_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "contact_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_groups: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          address: string
          created_at: string
          display_name: string
          email: string
          id: string
          notes: string
          organization: string
          phone: string
          role_title: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          address?: string
          created_at?: string
          display_name: string
          email: string
          id?: string
          notes?: string
          organization?: string
          phone?: string
          role_title?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          notes?: string
          organization?: string
          phone?: string
          role_title?: string
          tags?: string[]
          updated_at?: string
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
      curated_outputs: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["curated_kind"]
          payload: Json
          source_bytes: number
          source_filename: string
          summary: string
          updated_at: string
          workshop_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["curated_kind"]
          payload?: Json
          source_bytes?: number
          source_filename: string
          summary?: string
          updated_at?: string
          workshop_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["curated_kind"]
          payload?: Json
          source_bytes?: number
          source_filename?: string
          summary?: string
          updated_at?: string
          workshop_id?: string
        }
        Relationships: []
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
      email_messages: {
        Row: {
          body_html: string
          body_text: string
          created_at: string
          direction: Database["public"]["Enums"]["email_direction"]
          draft_soul_id: string | null
          from_addr: string
          gmail_message_id: string
          id: string
          sent_at: string | null
          subject: string
          thread_id: string
          to_addr: string
        }
        Insert: {
          body_html?: string
          body_text?: string
          created_at?: string
          direction: Database["public"]["Enums"]["email_direction"]
          draft_soul_id?: string | null
          from_addr?: string
          gmail_message_id: string
          id?: string
          sent_at?: string | null
          subject?: string
          thread_id: string
          to_addr?: string
        }
        Update: {
          body_html?: string
          body_text?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["email_direction"]
          draft_soul_id?: string | null
          from_addr?: string
          gmail_message_id?: string
          id?: string
          sent_at?: string | null
          subject?: string
          thread_id?: string
          to_addr?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "email_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_threads: {
        Row: {
          created_at: string
          from_addr: string
          gmail_thread_id: string
          id: string
          last_message_at: string | null
          snippet: string
          subject: string
          unread: boolean
          updated_at: string
          workshop_id: string
        }
        Insert: {
          created_at?: string
          from_addr?: string
          gmail_thread_id: string
          id?: string
          last_message_at?: string | null
          snippet?: string
          subject?: string
          unread?: boolean
          updated_at?: string
          workshop_id: string
        }
        Update: {
          created_at?: string
          from_addr?: string
          gmail_thread_id?: string
          id?: string
          last_message_at?: string | null
          snippet?: string
          subject?: string
          unread?: boolean
          updated_at?: string
          workshop_id?: string
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
      kingdom_stationery: {
        Row: {
          accent_color: string
          address_line_1: string
          address_line_2: string
          address_line_3: string
          contact_email: string
          contact_phone: string
          created_at: string
          domain_url: string
          footer_html: string
          header_html: string
          id: boolean
          logo_url: string | null
          sign_off_name: string
          signature_block_html: string
          social_fb_url: string
          social_x_url: string
          thumbprint_url: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string
          address_line_1?: string
          address_line_2?: string
          address_line_3?: string
          contact_email?: string
          contact_phone?: string
          created_at?: string
          domain_url?: string
          footer_html?: string
          header_html?: string
          id?: boolean
          logo_url?: string | null
          sign_off_name?: string
          signature_block_html?: string
          social_fb_url?: string
          social_x_url?: string
          thumbprint_url?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string
          address_line_1?: string
          address_line_2?: string
          address_line_3?: string
          contact_email?: string
          contact_phone?: string
          created_at?: string
          domain_url?: string
          footer_html?: string
          header_html?: string
          id?: boolean
          logo_url?: string | null
          sign_off_name?: string
          signature_block_html?: string
          social_fb_url?: string
          social_x_url?: string
          thumbprint_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      kings_dictionary: {
        Row: {
          added_at: string
          id: string
          note: string
          term: string
        }
        Insert: {
          added_at?: string
          id?: string
          note?: string
          term: string
        }
        Update: {
          added_at?: string
          id?: string
          note?: string
          term?: string
        }
        Relationships: []
      }
      legal_calendar_events: {
        Row: {
          anchor_used: string
          created_at: string
          event_at: string
          google_calendar_id: string
          google_event_id: string
          id: string
          legal_document_id: string
          reminder_days: number[]
          summary: string
          updated_at: string
          workshop_id: string
        }
        Insert: {
          anchor_used: string
          created_at?: string
          event_at: string
          google_calendar_id: string
          google_event_id: string
          id?: string
          legal_document_id: string
          reminder_days?: number[]
          summary?: string
          updated_at?: string
          workshop_id: string
        }
        Update: {
          anchor_used?: string
          created_at?: string
          event_at?: string
          google_calendar_id?: string
          google_event_id?: string
          id?: string
          legal_document_id?: string
          reminder_days?: number[]
          summary?: string
          updated_at?: string
          workshop_id?: string
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          addresses: string[]
          case_number: string | null
          created_at: string
          date_due: string | null
          date_filed: string | null
          date_served: string | null
          doc_title: string
          document_type: Database["public"]["Enums"]["legal_doc_type"]
          email_addresses: string[]
          extracted_clauses: string[]
          hearing_date: string | null
          id: string
          jurisdiction: string | null
          page_count: number
          parties: string[]
          phone_numbers: string[]
          raw: Json
          served_by: string | null
          served_upon: string[]
          source_bytes: number
          source_filename: string
          updated_at: string
          workshop_id: string
        }
        Insert: {
          addresses?: string[]
          case_number?: string | null
          created_at?: string
          date_due?: string | null
          date_filed?: string | null
          date_served?: string | null
          doc_title: string
          document_type?: Database["public"]["Enums"]["legal_doc_type"]
          email_addresses?: string[]
          extracted_clauses?: string[]
          hearing_date?: string | null
          id?: string
          jurisdiction?: string | null
          page_count?: number
          parties?: string[]
          phone_numbers?: string[]
          raw?: Json
          served_by?: string | null
          served_upon?: string[]
          source_bytes?: number
          source_filename: string
          updated_at?: string
          workshop_id: string
        }
        Update: {
          addresses?: string[]
          case_number?: string | null
          created_at?: string
          date_due?: string | null
          date_filed?: string | null
          date_served?: string | null
          doc_title?: string
          document_type?: Database["public"]["Enums"]["legal_doc_type"]
          email_addresses?: string[]
          extracted_clauses?: string[]
          hearing_date?: string | null
          id?: string
          jurisdiction?: string | null
          page_count?: number
          parties?: string[]
          phone_numbers?: string[]
          raw?: Json
          served_by?: string | null
          served_upon?: string[]
          source_bytes?: number
          source_filename?: string
          updated_at?: string
          workshop_id?: string
        }
        Relationships: []
      }
      letter_templates: {
        Row: {
          accent_color: string
          body_html: string
          created_at: string
          description: string
          id: string
          name: string
          notice_header_html: string
          sort_order: number
          subject_template: string
          system: boolean
          updated_at: string
        }
        Insert: {
          accent_color?: string
          body_html?: string
          created_at?: string
          description?: string
          id?: string
          name: string
          notice_header_html?: string
          sort_order?: number
          subject_template?: string
          system?: boolean
          updated_at?: string
        }
        Update: {
          accent_color?: string
          body_html?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          notice_header_html?: string
          sort_order?: number
          subject_template?: string
          system?: boolean
          updated_at?: string
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
      scheduled_emails: {
        Row: {
          bcc_addr: string
          body_html: string
          cc_addr: string
          created_at: string
          editor_soul_id: string
          id: string
          ink_color: string
          kind: string
          last_error: string | null
          notice_header_html: string
          send_at: string
          sent_at: string | null
          sent_gmail_id: string | null
          status: string
          subject: string
          thread_id: string | null
          to_addr: string
          updated_at: string
        }
        Insert: {
          bcc_addr?: string
          body_html: string
          cc_addr?: string
          created_at?: string
          editor_soul_id: string
          id?: string
          ink_color?: string
          kind?: string
          last_error?: string | null
          notice_header_html?: string
          send_at: string
          sent_at?: string | null
          sent_gmail_id?: string | null
          status?: string
          subject: string
          thread_id?: string | null
          to_addr: string
          updated_at?: string
        }
        Update: {
          bcc_addr?: string
          body_html?: string
          cc_addr?: string
          created_at?: string
          editor_soul_id?: string
          id?: string
          ink_color?: string
          kind?: string
          last_error?: string | null
          notice_header_html?: string
          send_at?: string
          sent_at?: string | null
          sent_gmail_id?: string | null
          status?: string
          subject?: string
          thread_id?: string | null
          to_addr?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_emails_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "email_threads"
            referencedColumns: ["id"]
          },
        ]
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
          wp_post_id: string | null
          wp_url: string | null
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
          wp_post_id?: string | null
          wp_url?: string | null
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
          wp_post_id?: string | null
          wp_url?: string | null
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
          default_ink_color: string
          id: boolean
          premium_daily_veritas_cap: number
          premium_freeze: boolean
          premium_per_soul_daily_cap: number
          provider_compact: Json
          realm_grid_size: number
          system_constitution: string
          tier_map_unmatched: Json
          updated_at: string
          veritas_per_credit: number
        }
        Insert: {
          active_provider?: string
          created_at?: string
          default_ink_color?: string
          id?: boolean
          premium_daily_veritas_cap?: number
          premium_freeze?: boolean
          premium_per_soul_daily_cap?: number
          provider_compact?: Json
          realm_grid_size?: number
          system_constitution?: string
          tier_map_unmatched?: Json
          updated_at?: string
          veritas_per_credit?: number
        }
        Update: {
          active_provider?: string
          created_at?: string
          default_ink_color?: string
          id?: boolean
          premium_daily_veritas_cap?: number
          premium_freeze?: boolean
          premium_per_soul_daily_cap?: number
          provider_compact?: Json
          realm_grid_size?: number
          system_constitution?: string
          tier_map_unmatched?: Json
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
          auto_fallback_enabled: boolean
          best_for: string[]
          created_at: string
          display_name: string
          fallback_rank: number | null
          id: string
          last_seen_at: string
          model_id: string
          notes: string | null
          provider: string
          tier: string
          updated_at: string
          venice_tier: string
          veritas_cost_per_1k_tokens: number
        }
        Insert: {
          active?: boolean
          auto_fallback_enabled?: boolean
          best_for?: string[]
          created_at?: string
          display_name: string
          fallback_rank?: number | null
          id?: string
          last_seen_at?: string
          model_id: string
          notes?: string | null
          provider: string
          tier: string
          updated_at?: string
          venice_tier?: string
          veritas_cost_per_1k_tokens?: number
        }
        Update: {
          active?: boolean
          auto_fallback_enabled?: boolean
          best_for?: string[]
          created_at?: string
          display_name?: string
          fallback_rank?: number | null
          id?: string
          last_seen_at?: string
          model_id?: string
          notes?: string | null
          provider?: string
          tier?: string
          updated_at?: string
          venice_tier?: string
          veritas_cost_per_1k_tokens?: number
        }
        Relationships: []
      }
      workshop_wp_links: {
        Row: {
          created_at: string
          default_categories: string[]
          default_status: string
          default_tags: string[]
          id: string
          updated_at: string
          workshop_id: string
          wp_site_id: string
          wp_site_name: string | null
          wp_site_url: string | null
        }
        Insert: {
          created_at?: string
          default_categories?: string[]
          default_status?: string
          default_tags?: string[]
          id?: string
          updated_at?: string
          workshop_id: string
          wp_site_id: string
          wp_site_name?: string | null
          wp_site_url?: string | null
        }
        Update: {
          created_at?: string
          default_categories?: string[]
          default_status?: string
          default_tags?: string[]
          id?: string
          updated_at?: string
          workshop_id?: string
          wp_site_id?: string
          wp_site_name?: string | null
          wp_site_url?: string | null
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
      curated_kind: "blog-archive" | "legal-document"
      deed_quadrant: "NE" | "SE" | "SW" | "NW"
      deed_season: "spring" | "summer" | "fall" | "winter"
      deed_status: "inscribed" | "in_progress" | "fulfilled" | "set_aside"
      email_direction: "inbound" | "outbound"
      intake_status: "pending" | "consumed"
      item_status: "forged" | "bestowed" | "archived"
      legal_doc_type:
        | "affidavit"
        | "notice"
        | "summons"
        | "motion"
        | "order"
        | "other"
      placement_candidate_kind: "building" | "workshop" | "item" | "chamber"
      post_channel:
        | "x"
        | "meta"
        | "both"
        | "wordpress"
        | "threads"
        | "facebook"
        | "instagram"
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
      curated_kind: ["blog-archive", "legal-document"],
      deed_quadrant: ["NE", "SE", "SW", "NW"],
      deed_season: ["spring", "summer", "fall", "winter"],
      deed_status: ["inscribed", "in_progress", "fulfilled", "set_aside"],
      email_direction: ["inbound", "outbound"],
      intake_status: ["pending", "consumed"],
      item_status: ["forged", "bestowed", "archived"],
      legal_doc_type: [
        "affidavit",
        "notice",
        "summons",
        "motion",
        "order",
        "other",
      ],
      placement_candidate_kind: ["building", "workshop", "item", "chamber"],
      post_channel: [
        "x",
        "meta",
        "both",
        "wordpress",
        "threads",
        "facebook",
        "instagram",
      ],
      post_status: ["draft", "scheduled", "published", "cancelled"],
      realm_occupant_type: ["soul", "building", "item", "chamber", "castle"],
    },
  },
} as const
