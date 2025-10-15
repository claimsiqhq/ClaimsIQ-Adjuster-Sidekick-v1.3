// services/workflow.ts
// Workflow generation and task management

import { supabase } from '@/utils/supabase';

export interface InspectionStep {
  id: string;
  created_at: string;
  claim_id: string;
  title: string;
  kind: 'photo' | 'scan' | 'doc' | 'note' | 'measure';
  instructions: string[];
  evidence_rules: {
    min_count?: number;
    must_tags?: string[];
    gps_required?: boolean;
  } | null;
  validation: any;
  next_steps: string[];
  step_order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  orig_id: string;
  completed_at: string | null;
  completed_by: string | null;
}

/**
 * Generate workflow for a claim
 */
export async function generateWorkflow(claimId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('workflow-generate', {
    body: { claimId },
  });

  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || 'Workflow generation failed');
}

/**
 * Get workflow steps for a claim
 */
export async function getWorkflowSteps(claimId: string): Promise<InspectionStep[]> {
  const { data, error } = await supabase
    .from('inspection_steps')
    .select('*')
    .eq('claim_id', claimId)
    .order('step_order', { ascending: true });

  if (error) {
    console.error('Get workflow steps error:', error);
    return [];
  }

  return (data || []) as InspectionStep[];
}

/**
 * Mark a step as complete
 */
export async function completeStep(stepId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('inspection_steps')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by: userId,
    })
    .eq('id', stepId);

  if (error) throw error;
}

/**
 * Mark a step as incomplete
 */
export async function uncompleteStep(stepId: string): Promise<void> {
  const { error } = await supabase
    .from('inspection_steps')
    .update({
      status: 'pending',
      completed_at: null,
      completed_by: null,
    })
    .eq('id', stepId);

  if (error) throw error;
}

/**
 * Check if step evidence requirements are met
 */
export async function checkStepEvidence(
  step: InspectionStep,
  claimId: string
): Promise<{ met: boolean; current: number; required: number }> {
  if (!step.evidence_rules?.min_count) {
    return { met: true, current: 0, required: 0 };
  }

  // For photo/scan steps, check media count
  if (step.kind === 'photo' || step.kind === 'scan') {
    const { count } = await supabase
      .from('media')
      .select('*', { count: 'exact', head: true })
      .eq('claim_id', claimId)
      .eq('type', step.kind === 'photo' ? 'photo' : 'lidar_room');

    return {
      met: (count || 0) >= step.evidence_rules.min_count,
      current: count || 0,
      required: step.evidence_rules.min_count,
    };
  }

  // For doc steps, check documents count
  if (step.kind === 'doc') {
    const { count } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('claim_id', claimId);

    return {
      met: (count || 0) >= step.evidence_rules.min_count,
      current: count || 0,
      required: step.evidence_rules.min_count,
    };
  }

  // For other types, assume met (no way to validate without more context)
  return { met: true, current: 0, required: 0 };
}

/**
 * Get workflow completion stats
 */
export async function getWorkflowStats(claimId: string) {
  const steps = await getWorkflowSteps(claimId);
  const completed = steps.filter(s => s.status === 'completed').length;
  const total = steps.length;
  
  return {
    total,
    completed,
    pending: total - completed,
    percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
    isComplete: total > 0 && completed === total,
  };
}

/**
 * Delete all workflow steps for a claim (to regenerate)
 */
export async function deleteWorkflow(claimId: string): Promise<void> {
  const { error } = await supabase
    .from('inspection_steps')
    .delete()
    .eq('claim_id', claimId);

  if (error) throw error;
}

