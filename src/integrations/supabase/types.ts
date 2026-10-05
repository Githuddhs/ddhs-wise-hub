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
      audit_log: {
        Row: {
          action: string
          at: string
          id: number
          record_id: string | null
          summary: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          action: string
          at?: string
          id?: never
          record_id?: string | null
          summary?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          action?: string
          at?: string
          id?: never
          record_id?: string | null
          summary?: string | null
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      client_accounts: {
        Row: {
          company: string
          contact_name: string
          created_at: string
          created_by: string | null
          email: string
          note: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string
          contact_name?: string
          created_at?: string
          created_by?: string | null
          email?: string
          note?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string
          contact_name?: string
          created_at?: string
          created_by?: string | null
          email?: string
          note?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      committee_actions: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          meeting_id: string | null
          member_id: string | null
          reminded_on: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          meeting_id?: string | null
          member_id?: string | null
          reminded_on?: string | null
          status?: string
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          meeting_id?: string | null
          member_id?: string | null
          reminded_on?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "committee_actions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "committee_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_actions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "committee_members"
            referencedColumns: ["id"]
          },
        ]
      }
      committee_meetings: {
        Row: {
          created_at: string
          id: string
          meeting_date: string
          notes: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_date: string
          notes?: string | null
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_date?: string
          notes?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      committee_members: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          represents: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          represents?: string | null
          role?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          represents?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      compliance_deadlines: {
        Row: {
          created_at: string
          due_date: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      cron_tokens: {
        Row: {
          name: string
          token: string
        }
        Insert: {
          name: string
          token?: string
        }
        Update: {
          name?: string
          token?: string
        }
        Relationships: []
      }
      decisions: {
        Row: {
          created_at: string
          decided_on: string
          decision: string
          id: string
          made_by: string | null
          meeting_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_on: string
          decision: string
          id?: string
          made_by?: string | null
          meeting_id?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          decided_on?: string
          decision?: string
          id?: string
          made_by?: string | null
          meeting_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "committee_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_requests: {
        Row: {
          company: string
          company_size: string
          created_at: string
          full_name: string
          id: string
          job_title: string | null
          message: string | null
          phone: string | null
          popia_consent: boolean
          work_email: string
        }
        Insert: {
          company: string
          company_size: string
          created_at?: string
          full_name: string
          id?: string
          job_title?: string | null
          message?: string | null
          phone?: string | null
          popia_consent: boolean
          work_email: string
        }
        Update: {
          company?: string
          company_size?: string
          created_at?: string
          full_name?: string
          id?: string
          job_title?: string | null
          message?: string | null
          phone?: string | null
          popia_consent?: boolean
          work_email?: string
        }
        Relationships: []
      }
      ee_plans: {
        Row: {
          end_date: string | null
          id: string
          start_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          end_date?: string | null
          id?: string
          start_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          end_date?: string | null
          id?: string
          start_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          department: string | null
          disability: boolean
          employee_no: string
          end_date: string | null
          foreign_national: boolean
          gender: string | null
          id: string
          level: string | null
          promoted_on: string | null
          race: string | null
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          department?: string | null
          disability?: boolean
          employee_no: string
          end_date?: string | null
          foreign_national?: boolean
          gender?: string | null
          id?: string
          level?: string | null
          promoted_on?: string | null
          race?: string | null
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          department?: string | null
          disability?: boolean
          employee_no?: string
          end_date?: string | null
          foreign_national?: boolean
          gender?: string | null
          id?: string
          level?: string | null
          promoted_on?: string | null
          race?: string | null
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      evidence_items: {
        Row: {
          body: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category: string
          created_at?: string
          description?: string | null
          id?: string
          title: string
          user_id?: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      evidence_links: {
        Row: {
          id: string
          item_id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          target_id: string
          target_type: string
          user_id?: string
        }
        Update: {
          id?: string
          item_id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_links_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "evidence_items"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_versions: {
        Row: {
          created_at: string
          file_name: string
          id: string
          item_id: string
          path: string
          size_bytes: number | null
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          item_id: string
          path: string
          size_bytes?: number | null
          user_id?: string
          version: number
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          item_id?: string
          path?: string
          size_bytes?: number | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "evidence_versions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "evidence_items"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          created_at: string
          file_name: string
          id: string
          mode: string
          row_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          mode: string
          row_count?: number
          user_id?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          mode?: string
          row_count?: number
          user_id?: string
        }
        Relationships: []
      }
      plan_barriers: {
        Row: {
          affected_groups: string | null
          category: string
          created_at: string
          description: string
          id: string
          plan_id: string
          user_id: string
        }
        Insert: {
          affected_groups?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          plan_id: string
          user_id?: string
        }
        Update: {
          affected_groups?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          plan_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_barriers_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "ee_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_goals: {
        Row: {
          created_at: string
          current_pct: number | null
          grp: string
          id: string
          level: string
          plan_id: string
          target_pct: number
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          current_pct?: number | null
          grp: string
          id?: string
          level: string
          plan_id: string
          target_pct: number
          user_id?: string
          year: number
        }
        Update: {
          created_at?: string
          current_pct?: number | null
          grp?: string
          id?: string
          level?: string
          plan_id?: string
          target_pct?: number
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_goals_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "ee_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_measures: {
        Row: {
          barrier_id: string | null
          created_at: string
          due_date: string | null
          id: string
          measure: string
          milestones: string | null
          owner: string | null
          plan_id: string
          reminded_on: string | null
          status: string
          user_id: string
        }
        Insert: {
          barrier_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          measure: string
          milestones?: string | null
          owner?: string | null
          plan_id: string
          reminded_on?: string | null
          status?: string
          user_id?: string
        }
        Update: {
          barrier_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          measure?: string
          milestones?: string | null
          owner?: string | null
          plan_id?: string
          reminded_on?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_measures_barrier_id_fkey"
            columns: ["barrier_id"]
            isOneToOne: false
            referencedRelation: "plan_barriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_measures_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "ee_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_objectives: {
        Row: {
          created_at: string
          id: string
          objective: string
          plan_id: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          objective: string
          plan_id: string
          user_id?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          objective?: string
          plan_id?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_objectives_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "ee_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          job_title: string | null
          onboarded_at: string | null
          sector: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          job_title?: string | null
          onboarded_at?: string | null
          sector?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          onboarded_at?: string | null
          sector?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      saved_results: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
          tool: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          title: string
          tool: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          tool?: string
          user_id?: string
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
      workforce_profiles: {
        Row: {
          counts: Json
          sector: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          counts?: Json
          sector?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          counts?: Json
          sector?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      client_stats: {
        Args: { _user_id: string }
        Returns: {
          actions: number
          employees: number
          evidence: number
          measures: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
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
    },
  },
} as const
