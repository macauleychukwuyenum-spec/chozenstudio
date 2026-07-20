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
      announcements: {
        Row: {
          active: boolean
          audience: string
          body: string
          created_at: string
          created_by: string | null
          id: string
          target_user_id: string | null
          tier_id: string | null
          title: string
          type: string
        }
        Insert: {
          active?: boolean
          audience?: string
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          target_user_id?: string | null
          tier_id?: string | null
          title: string
          type?: string
        }
        Update: {
          active?: boolean
          audience?: string
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          target_user_id?: string | null
          tier_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_email: string | null
          admin_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_email?: string | null
          admin_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_email?: string | null
          admin_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          content: string
          cover_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["blog_status"]
          title: string
        }
        Insert: {
          author_id?: string | null
          content: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["blog_status"]
          title: string
        }
        Update: {
          author_id?: string | null
          content?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["blog_status"]
          title?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          certificate_number: string
          course_id: string
          id: string
          issued_at: string
          user_id: string
        }
        Insert: {
          certificate_number: string
          course_id: string
          id?: string
          issued_at?: string
          user_id: string
        }
        Update: {
          certificate_number?: string
          course_id?: string
          id?: string
          issued_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          subject?: string | null
        }
        Relationships: []
      }
      course_lessons: {
        Row: {
          attachment_url: string | null
          content: string | null
          course_id: string
          created_at: string
          duration_minutes: number
          id: string
          order_index: number
          published: boolean
          slug: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          attachment_url?: string | null
          content?: string | null
          course_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          order_index?: number
          published?: boolean
          slug: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          attachment_url?: string | null
          content?: string | null
          course_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          order_index?: number
          published?: boolean
          slug?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          price_ngn: number
          published: boolean
          required_access_level: number
          slug: string
          title: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          price_ngn?: number
          published?: boolean
          required_access_level?: number
          slug: string
          title: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          price_ngn?: number
          published?: boolean
          required_access_level?: number
          slug?: string
          title?: string
        }
        Relationships: []
      }
      digital_products: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          file_url: string | null
          id: string
          price_ngn: number
          published: boolean
          required_access_level: number
          slug: string
          title: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          price_ngn?: number
          published?: boolean
          required_access_level?: number
          slug: string
          title: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          price_ngn?: number
          published?: boolean
          required_access_level?: number
          slug?: string
          title?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed_at: string
          course_id: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          course_id: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          course_id?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_ngn: number
          created_at: string
          id: string
          metadata: Json | null
          paystack_reference: string
          purchase_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          tier_id: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          amount_ngn: number
          created_at?: string
          id?: string
          metadata?: Json | null
          paystack_reference: string
          purchase_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tier_id?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          amount_ngn?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          paystack_reference?: string
          purchase_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tier_id?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "tier_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          admin_notes: string | null
          agreed_privacy_at: string | null
          agreed_referral_policy_at: string | null
          agreed_terms_at: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          login_disabled: boolean
          phone: string | null
          referral_code: string
          referred_by: string | null
          status: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          admin_notes?: string | null
          agreed_privacy_at?: string | null
          agreed_referral_policy_at?: string | null
          agreed_terms_at?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          login_disabled?: boolean
          phone?: string | null
          referral_code: string
          referred_by?: string | null
          status?: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          admin_notes?: string | null
          agreed_privacy_at?: string | null
          agreed_referral_policy_at?: string | null
          agreed_terms_at?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          login_disabled?: boolean
          phone?: string | null
          referral_code?: string
          referred_by?: string | null
          status?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          cycle_purchase_id: string | null
          id: string
          referred_user_id: string
          referrer_id: string
          reward_amount_ngn: number
          rewarded_at: string | null
          status: Database["public"]["Enums"]["referral_status"]
          tier_purchase_id: string | null
        }
        Insert: {
          created_at?: string
          cycle_purchase_id?: string | null
          id?: string
          referred_user_id: string
          referrer_id: string
          reward_amount_ngn?: number
          rewarded_at?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
          tier_purchase_id?: string | null
        }
        Update: {
          created_at?: string
          cycle_purchase_id?: string | null
          id?: string
          referred_user_id?: string
          referrer_id?: string
          reward_amount_ngn?: number
          rewarded_at?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
          tier_purchase_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_cycle_purchase_id_fkey"
            columns: ["cycle_purchase_id"]
            isOneToOne: false
            referencedRelation: "tier_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_tier_purchase_id_fkey"
            columns: ["tier_purchase_id"]
            isOneToOne: false
            referencedRelation: "tier_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      service_bookings: {
        Row: {
          admin_note: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          details: string | null
          id: string
          quoted_price_ngn: number | null
          service_id: string
          status: Database["public"]["Enums"]["booking_status"]
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          details?: string | null
          id?: string
          quoted_price_ngn?: number | null
          service_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          user_id: string
        }
        Update: {
          admin_note?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          details?: string | null
          id?: string
          quoted_price_ngn?: number | null
          service_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          base_price_ngn: number
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          published: boolean
          slug: string
          title: string
        }
        Insert: {
          base_price_ngn?: number
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          published?: boolean
          slug: string
          title: string
        }
        Update: {
          base_price_ngn?: number
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          published?: boolean
          slug?: string
          title?: string
        }
        Relationships: []
      }
      tier_purchases: {
        Row: {
          amount_paid_ngn: number
          completed_at: string | null
          cycle_status: Database["public"]["Enums"]["cycle_status"]
          id: string
          purchased_at: string
          rewarded_referrals_count: number
          tier_id: string
          user_id: string
        }
        Insert: {
          amount_paid_ngn: number
          completed_at?: string | null
          cycle_status?: Database["public"]["Enums"]["cycle_status"]
          id?: string
          purchased_at?: string
          rewarded_referrals_count?: number
          tier_id: string
          user_id: string
        }
        Update: {
          amount_paid_ngn?: number
          completed_at?: string | null
          cycle_status?: Database["public"]["Enums"]["cycle_status"]
          id?: string
          purchased_at?: string
          rewarded_referrals_count?: number
          tier_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tier_purchases_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      tiers: {
        Row: {
          active: boolean
          benefits: Json
          can_submit_blogs: boolean
          color_theme: string | null
          course_access_level: number
          created_at: string
          description: string | null
          digital_access_level: number
          featured: boolean
          free_consultation: boolean
          hidden: boolean
          id: string
          max_referrals: number
          name: string
          price_ngn: number
          priority_support: boolean
          referral_requirement: number
          reward_percentage: number
          service_discount_percentage: number
          slug: string
          sort_order: number
          tagline: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          benefits?: Json
          can_submit_blogs?: boolean
          color_theme?: string | null
          course_access_level?: number
          created_at?: string
          description?: string | null
          digital_access_level?: number
          featured?: boolean
          free_consultation?: boolean
          hidden?: boolean
          id?: string
          max_referrals?: number
          name: string
          price_ngn: number
          priority_support?: boolean
          referral_requirement?: number
          reward_percentage?: number
          service_discount_percentage?: number
          slug: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          benefits?: Json
          can_submit_blogs?: boolean
          color_theme?: string | null
          course_access_level?: number
          created_at?: string
          description?: string | null
          digital_access_level?: number
          featured?: boolean
          free_consultation?: boolean
          hidden?: boolean
          id?: string
          max_referrals?: number
          name?: string
          price_ngn?: number
          priority_support?: boolean
          referral_requirement?: number
          reward_percentage?: number
          service_discount_percentage?: number
          slug?: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount_ngn: number
          created_at: string
          description: string | null
          id: string
          reference: string | null
          type: Database["public"]["Enums"]["txn_type"]
          user_id: string
        }
        Insert: {
          amount_ngn: number
          created_at?: string
          description?: string | null
          id?: string
          reference?: string | null
          type: Database["public"]["Enums"]["txn_type"]
          user_id: string
        }
        Update: {
          amount_ngn?: number
          created_at?: string
          description?: string | null
          id?: string
          reference?: string | null
          type?: Database["public"]["Enums"]["txn_type"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance_ngn: number
          lifetime_earnings_ngn: number
          total_withdrawals_ngn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_ngn?: number
          lifetime_earnings_ngn?: number
          total_withdrawals_ngn?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_ngn?: number
          lifetime_earnings_ngn?: number
          total_withdrawals_ngn?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          account_name: string
          account_number: string
          admin_note: string | null
          amount_ngn: number
          bank_name: string
          id: string
          processed_at: string | null
          processed_by: string | null
          requested_at: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          admin_note?: string | null
          amount_ngn: number
          bank_name: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          admin_note?: string | null
          amount_ngn?: number
          bank_name?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      blog_status: "draft" | "pending" | "published" | "rejected"
      booking_status: "pending" | "confirmed" | "completed" | "cancelled"
      cycle_status: "active" | "completed"
      payment_status: "pending" | "success" | "failed"
      referral_status: "pending" | "rewarded" | "rejected"
      txn_type: "referral_reward" | "withdrawal" | "adjustment"
      withdrawal_status: "pending" | "approved" | "paid" | "rejected"
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
      app_role: ["admin", "user"],
      blog_status: ["draft", "pending", "published", "rejected"],
      booking_status: ["pending", "confirmed", "completed", "cancelled"],
      cycle_status: ["active", "completed"],
      payment_status: ["pending", "success", "failed"],
      referral_status: ["pending", "rewarded", "rejected"],
      txn_type: ["referral_reward", "withdrawal", "adjustment"],
      withdrawal_status: ["pending", "approved", "paid", "rejected"],
    },
  },
} as const
