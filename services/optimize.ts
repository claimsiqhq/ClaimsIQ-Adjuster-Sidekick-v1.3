// services/optimize.ts
// AI-powered daily optimization service

import { supabase } from '../config/supabase';

export interface DailyOptimization {
  id: string;
  created_at: string;
  optimization_date: string;
  daily_brief: string;
  optimized_route: string[];
  time_blocks: TimeBlock[];
  weather_windows: WeatherWindow[];
  risk_alerts: RiskAlert[];
  recommendations: string;
  total_claims: number;
  total_travel_time_minutes: number;
  total_inspection_time_minutes: number;
  efficiency_score: number;
}

export interface TimeBlock {
  start_time: string;
  end_time: string;
  claim_id: string;
  activity: string;
  notes: string;
  travel_minutes?: number;
}

export interface WeatherWindow {
  start_time: string;
  end_time: string;
  conditions: string;
  safe_for_outdoor: boolean;
}

export interface RiskAlert {
  severity: 'low' | 'medium' | 'high';
  type: string;
  message: string;
  claim_id?: string;
}

/**
 * Generate daily optimization plan using AI
 */
export async function generateDailyOptimization(date?: string): Promise<DailyOptimization | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user');
      return null;
    }

    const targetDate = date || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase.functions.invoke('daily-optimize', {
      body: {
        userId: user.id,
        date: targetDate
      }
    });

    if (error) {
      console.error('Optimization error:', error);
      return null;
    }

    return data.optimization;
  } catch (error) {
    console.error('Failed to generate optimization:', error);
    return null;
  }
}

/**
 * Get existing optimization for a date
 */
export async function getDailyOptimization(date?: string): Promise<DailyOptimization | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const targetDate = date || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_optimizations')
      .select('*')
      .eq('user_id', user.id)
      .eq('optimization_date', targetDate)
      .single();

    if (error) {
      console.error('Failed to fetch optimization:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting optimization:', error);
    return null;
  }
}

/**
 * Accept or modify an optimization plan
 */
export async function acceptOptimization(
  optimizationId: string, 
  modifications?: any
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('daily_optimizations')
      .update({
        accepted: true,
        modified: modifications || null
      })
      .eq('id', optimizationId);

    if (error) {
      console.error('Failed to accept optimization:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error accepting optimization:', error);
    return false;
  }
}

/**
 * Get claims with SLA and workflow details
 */
export async function getClaimsWithSLA() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('claims')
      .select(`
        *,
        inspection_steps (
          id,
          title,
          status,
          is_critical,
          started_at,
          completed_at,
          estimated_minutes,
          sla_minutes
        )
      `)
      .eq('user_id', user.id)
      .in('status', ['open', 'in_progress'])
      .order('priority_score', { ascending: false });

    if (error) {
      console.error('Failed to fetch claims with SLA:', error);
      return [];
    }

    // Calculate SLA status for each claim
    const now = new Date();
    const enrichedClaims = data.map(claim => {
      const deadline = claim.sla_deadline ? new Date(claim.sla_deadline) : null;
      const hoursRemaining = deadline 
        ? Math.max(0, (deadline.getTime() - now.getTime()) / (1000 * 60 * 60))
        : null;

      const totalSteps = claim.inspection_steps?.length || 0;
      const completedSteps = claim.inspection_steps?.filter((s: any) => s.status === 'completed').length || 0;
      const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

      return {
        ...claim,
        sla_status: getSLAStatus(hoursRemaining),
        hours_remaining: hoursRemaining,
        progress_percent: progressPercent,
        current_step: claim.inspection_steps?.find((s: any) => s.status === 'in_progress'),
        steps_remaining: totalSteps - completedSteps
      };
    });

    return enrichedClaims;
  } catch (error) {
    console.error('Error getting claims with SLA:', error);
    return [];
  }
}

function getSLAStatus(hoursRemaining: number | null): 'overdue' | 'critical' | 'warning' | 'normal' {
  if (hoursRemaining === null) return 'normal';
  if (hoursRemaining <= 0) return 'overdue';
  if (hoursRemaining <= 4) return 'critical';
  if (hoursRemaining <= 24) return 'warning';
  return 'normal';
}