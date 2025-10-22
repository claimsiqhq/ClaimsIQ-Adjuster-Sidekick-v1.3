// services/workflow.ts
// Workflow generation and task management

import { supabase } from '@/utils/supabase';

export interface WorkflowStep {
  id: string;
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
  status: 'pending' | 'completed';
  orig_id: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Generate workflow for a claim using AI
 */
export async function generateWorkflow(claimId: string): Promise<{ success: boolean; stepsGenerated: number }> {
  const { data, error } = await supabase.functions.invoke('workflow-generate', {
    body: { claimId },
  });

  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || 'Workflow generation failed');
  
  return { success: true, stepsGenerated: data.stepsGenerated };
}

/**
 * Get workflow steps for a claim
 */
export async function getWorkflowSteps(claimId: string): Promise<WorkflowStep[]> {
  const { data, error } = await supabase
    .from('inspection_steps')
    .select('*')
    .eq('claim_id', claimId)
    .order('step_order');

  if (error) {
    console.error('Get workflow steps error:', error);
    return [];
  }

  return (data || []) as WorkflowStep[];
}

/**
 * Mark a workflow step as complete
 */
export async function completeWorkflowStep(stepId: string): Promise<void> {
  const { error } = await supabase
    .from('inspection_steps')
    .update({ 
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', stepId);

  if (error) throw error;
}

/**
 * Mark a workflow step as incomplete
 */
export async function uncompleteWorkflowStep(stepId: string): Promise<void> {
  const { error } = await supabase
    .from('inspection_steps')
    .update({ 
      status: 'pending',
      completed_at: null,
    })
    .eq('id', stepId);

  if (error) throw error;
}

/**
 * Check if a step's evidence requirements are met
 */
export async function validateStepEvidence(
  step: WorkflowStep,
  claimId: string
): Promise<{ valid: boolean; message?: string }> {
  if (!step.evidence_rules) {
    return { valid: true };
  }

  const rules = step.evidence_rules;

  // Check photo count requirement
  if (rules.min_count && step.kind === 'photo') {
    const { count } = await supabase
      .from('media')
      .select('*', { count: 'exact', head: true })
      .eq('claim_id', claimId)
      .eq('type', 'photo');

    if ((count || 0) < rules.min_count) {
      return {
        valid: false,
        message: `Need ${rules.min_count} photos, currently have ${count || 0}`,
      };
    }
  }

  // Check LiDAR scan requirement
  if (step.kind === 'scan') {
    const { count } = await supabase
      .from('media')
      .select('*', { count: 'exact', head: true })
      .eq('claim_id', claimId)
      .eq('type', 'lidar_room');

    if ((count || 0) === 0) {
      return {
        valid: false,
        message: 'LiDAR scan required',
      };
    }
  }

  // Check document requirement
  if (step.kind === 'doc' && rules.min_count) {
    const { count } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('claim_id', claimId);

    if ((count || 0) < rules.min_count) {
      return {
        valid: false,
        message: `Need ${rules.min_count} documents, currently have ${count || 0}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Get workflow completion statistics
 */
export async function getWorkflowStats(claimId: string): Promise<{
  total: number;
  completed: number;
  pending: number;
  percentComplete: number;
}> {
  const steps = await getWorkflowSteps(claimId);
  const completed = steps.filter(s => s.status === 'completed').length;
  const total = steps.length;
  const pending = total - completed;
  const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, pending, percentComplete };
}

/**
 * Delete all workflow steps for a claim (to regenerate)
 */
export async function getClaimWorkflowMetadata(claimId: string): Promise<any> {
  const { data, error } = await supabase
    .from('claims')
    .select('workflow_metadata')
    .eq('id', claimId)
    .single();

  if (error) {
    console.error('Get workflow metadata error:', error);
    return null;
  }

  return data?.workflow_metadata || null;
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
