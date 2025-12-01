import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://iyroosethwllelxhahix.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cm9vc2V0aHdsbGVseGhhaGl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMzUzOTYsImV4cCI6MjA3OTYxMTM5Nn0.Vurb4icekmChV6nOrOSdX4SR5fQHEdInwFAbcRJNBfE"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface AISite {
  id: number
  name: string
  url: string
  description: string
  features: any
  category_id: number
  is_free: boolean
  pricing_model: string
  innovation_score: number
  uniqueness_score: number
  user_rating: number
  logo_url: string | null
  source: string
  status: string
  created_at: string
  updated_at: string
  has_domestic_alternative?: boolean
  domestic_alternatives?: Array<{name: string, similarity: number}>
  is_accessible_domestic?: boolean
  alternative_rating?: number
  region?: string
}

export interface Category {
  id: number
  name: string
  slug: string
  description: string
  icon: string
  created_at: string
}

export interface ActivityHistory {
  id: number
  site_id: number
  activity_score: number
  daily_visits_estimate: number
  social_mentions: number
  github_stars: number
  last_update_check: string
  record_date: string
  trend: string
  created_at: string
}

export interface Ranking {
  id: number
  site_id: number
  rank_type: string
  rank_position: number
  score: number
  period_start: string
  period_end: string
  created_at: string
}

export interface SiteWithCategory extends AISite {
  category?: Category
  latest_activity?: ActivityHistory
}
