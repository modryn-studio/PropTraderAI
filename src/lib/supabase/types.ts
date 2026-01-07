export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
      }
      challenges: {
        Row: {
          id: string
          user_id: string
          firm_name: string
          account_size: number
          daily_loss_limit: number
          max_drawdown: number
          profit_target: number | null
          trading_days_required: number | null
          current_balance: number
          current_pnl: number
          daily_pnl: number
          status: 'active' | 'passed' | 'failed' | 'paused'
          start_date: string
          end_date: string | null
          rules: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          firm_name: string
          account_size: number
          daily_loss_limit: number
          max_drawdown: number
          profit_target?: number | null
          trading_days_required?: number | null
          current_balance: number
          current_pnl?: number
          daily_pnl?: number
          status?: 'active' | 'passed' | 'failed' | 'paused'
          start_date?: string
          end_date?: string | null
          rules?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          firm_name?: string
          account_size?: number
          daily_loss_limit?: number
          max_drawdown?: number
          profit_target?: number | null
          trading_days_required?: number | null
          current_balance?: number
          current_pnl?: number
          daily_pnl?: number
          status?: 'active' | 'passed' | 'failed' | 'paused'
          start_date?: string
          end_date?: string | null
          rules?: Json
          created_at?: string
          updated_at?: string
        }
      }
      strategies: {
        Row: {
          id: string
          user_id: string
          challenge_id: string | null
          name: string
          natural_language: string
          parsed_rules: Json
          backtest_results: Json
          status: 'draft' | 'active' | 'paused' | 'archived'
          autonomy_level: 'copilot' | 'autopilot'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          challenge_id?: string | null
          name: string
          natural_language: string
          parsed_rules?: Json
          backtest_results?: Json
          status?: 'draft' | 'active' | 'paused' | 'archived'
          autonomy_level?: 'copilot' | 'autopilot'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          challenge_id?: string | null
          name?: string
          natural_language?: string
          parsed_rules?: Json
          backtest_results?: Json
          status?: 'draft' | 'active' | 'paused' | 'archived'
          autonomy_level?: 'copilot' | 'autopilot'
          created_at?: string
          updated_at?: string
        }
      }
      trades: {
        Row: {
          id: string
          user_id: string
          challenge_id: string | null
          strategy_id: string | null
          symbol: string
          side: 'long' | 'short'
          entry_price: number | null
          exit_price: number | null
          stop_loss: number | null
          take_profit: number | null
          quantity: number
          pnl: number | null
          fees: number
          status: 'pending' | 'open' | 'closed' | 'cancelled'
          entry_time: string | null
          exit_time: string | null
          tradovate_order_id: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          challenge_id?: string | null
          strategy_id?: string | null
          symbol: string
          side: 'long' | 'short'
          entry_price?: number | null
          exit_price?: number | null
          stop_loss?: number | null
          take_profit?: number | null
          quantity: number
          pnl?: number | null
          fees?: number
          status?: 'pending' | 'open' | 'closed' | 'cancelled'
          entry_time?: string | null
          exit_time?: string | null
          tradovate_order_id?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          challenge_id?: string | null
          strategy_id?: string | null
          symbol?: string
          side?: 'long' | 'short'
          entry_price?: number | null
          exit_price?: number | null
          stop_loss?: number | null
          take_profit?: number | null
          quantity?: number
          pnl?: number | null
          fees?: number
          status?: 'pending' | 'open' | 'closed' | 'cancelled'
          entry_time?: string | null
          exit_time?: string | null
          tradovate_order_id?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      behavioral_data: {
        Row: {
          id: string
          user_id: string
          event_type: string
          event_data: Json
          challenge_status: Json
          session_context: Json
          timestamp: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          event_data?: Json
          challenge_status?: Json
          session_context?: Json
          timestamp?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          event_data?: Json
          challenge_status?: Json
          session_context?: Json
          timestamp?: string
        }
      }
      trading_rules: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          rule_type: string
          conditions: Json
          actions: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          rule_type: string
          conditions: Json
          actions: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          rule_type?: string
          conditions?: Json
          actions?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          user_id: string
          session_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          metadata?: Json
          created_at?: string
        }
      }
      screenshot_analyses: {
        Row: {
          id: string
          user_id: string
          image_url: string
          analysis: Json
          support_levels: Json
          resistance_levels: Json
          recommendations: Json
          confidence: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          image_url: string
          analysis: Json
          support_levels?: Json
          resistance_levels?: Json
          recommendations?: Json
          confidence?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          image_url?: string
          analysis?: Json
          support_levels?: Json
          resistance_levels?: Json
          recommendations?: Json
          confidence?: number | null
          created_at?: string
        }
      }
      broker_connections: {
        Row: {
          id: string
          user_id: string
          broker: string
          access_token: string | null
          refresh_token: string | null
          token_expiry: string | null
          account_id: string | null
          account_name: string | null
          is_active: boolean
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          broker?: string
          access_token?: string | null
          refresh_token?: string | null
          token_expiry?: string | null
          account_id?: string | null
          account_name?: string | null
          is_active?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          broker?: string
          access_token?: string | null
          refresh_token?: string | null
          token_expiry?: string | null
          account_id?: string | null
          account_name?: string | null
          is_active?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      prop_firms: {
        Row: {
          id: string
          name: string
          slug: string
          account_sizes: Json
          daily_loss_limit_percent: number
          max_drawdown_percent: number
          profit_target_percent: number | null
          profit_split: number | null
          trading_days_required: number | null
          allowed_instruments: Json
          trading_hours: Json
          rules: Json
          website_url: string | null
          logo_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          account_sizes: Json
          daily_loss_limit_percent: number
          max_drawdown_percent: number
          profit_target_percent?: number | null
          profit_split?: number | null
          trading_days_required?: number | null
          allowed_instruments?: Json
          trading_hours?: Json
          rules?: Json
          website_url?: string | null
          logo_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          account_sizes?: Json
          daily_loss_limit_percent?: number
          max_drawdown_percent?: number
          profit_target_percent?: number | null
          profit_split?: number | null
          trading_days_required?: number | null
          allowed_instruments?: Json
          trading_hours?: Json
          rules?: Json
          website_url?: string | null
          logo_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Enums: {
      challenge_status: 'active' | 'passed' | 'failed' | 'paused'
      strategy_status: 'draft' | 'active' | 'paused' | 'archived'
      autonomy_level: 'copilot' | 'autopilot'
      trade_side: 'long' | 'short'
      trade_status: 'pending' | 'open' | 'closed' | 'cancelled'
      message_role: 'user' | 'assistant' | 'system'
    }
  }
}
