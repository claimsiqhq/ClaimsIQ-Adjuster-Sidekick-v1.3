// components/WorkflowChecklist.tsx
// Interactive workflow task checklist for claims

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { 
  WorkflowStep, 
  getWorkflowSteps, 
  completeWorkflowStep, 
  uncompleteWorkflowStep,
  validateStepEvidence,
  generateWorkflow,
  getWorkflowStats,
} from '@/services/workflow';

interface WorkflowChecklistProps {
  claimId: string;
  onWorkflowComplete?: () => void;
}

export default function WorkflowChecklist({ claimId, onWorkflowComplete }: WorkflowChecklistProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, percentComplete: 0 });

  useEffect(() => {
    loadWorkflow();
  }, [claimId]);

  async function loadWorkflow() {
    try {
      setLoading(true);
      const workflowSteps = await getWorkflowSteps(claimId);
      setSteps(workflowSteps);
      
      const workflowStats = await getWorkflowStats(claimId);
      setStats(workflowStats);
      
      // Check if workflow just completed
      if (workflowStats.completed > 0 && workflowStats.pending === 0 && onWorkflowComplete) {
        onWorkflowComplete();
      }
    } catch (error: any) {
      console.error('Load workflow error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    try {
      setGenerating(true);
      const result = await generateWorkflow(claimId);
      Alert.alert('Success', `Generated ${result.stepsGenerated} workflow steps!`);
      await loadWorkflow();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to generate workflow: ' + error.message);
    } finally {
      setGenerating(false);
    }
  }

  async function toggleStep(step: WorkflowStep) {
    try {
      if (step.status === 'pending') {
        // Check if evidence requirements are met
        const validation = await validateStepEvidence(step, claimId);
        
        if (!validation.valid) {
          Alert.alert(
            'Requirements Not Met',
            validation.message || 'Please complete the required evidence first.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Mark Complete Anyway', onPress: async () => {
                await completeWorkflowStep(step.id);
                await loadWorkflow();
              }},
            ]
          );
          return;
        }
        
        await completeWorkflowStep(step.id);
      } else {
        await uncompleteWorkflowStep(step.id);
      }
      
      await loadWorkflow();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (steps.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No inspection workflow yet</Text>
        <Pressable
          style={[styles.generateButton, generating && styles.buttonDisabled]}
          onPress={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.generateButtonText}>✨ Generate Workflow</Text>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${stats.percentComplete}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {stats.completed} of {stats.total} complete ({stats.percentComplete}%)
        </Text>
      </View>

      {/* Steps list */}
      {steps.map((step) => (
        <StepItem
          key={step.id}
          step={step}
          onToggle={() => toggleStep(step)}
        />
      ))}

      {/* Regenerate button */}
      <Pressable
        style={styles.regenerateButton}
        onPress={handleGenerate}
        disabled={generating}
      >
        <Text style={styles.regenerateText}>🔄 Regenerate Workflow</Text>
      </Pressable>
    </View>
  );
}

function StepItem({ step, onToggle }: { step: WorkflowStep; onToggle: () => void }) {
  const [expanded, setExpanded] = useState(false);
  
  const kindIcon = {
    photo: 'camera-outline',
    scan: 'scan-outline',
    doc: 'document-outline',
    note: 'create-outline',
    measure: 'resize-outline',
  }[step.kind] || 'checkbox-outline';

  const kindColor = {
    photo: colors.primary,
    scan: colors.secondary,
    doc: colors.gold,
    note: colors.info,
    measure: colors.success,
  }[step.kind] || colors.textLight;

  return (
    <View style={styles.stepCard}>
      <Pressable style={styles.stepHeader} onPress={() => setExpanded(!expanded)}>
        <Pressable style={styles.checkbox} onPress={onToggle}>
          {step.status === 'completed' ? (
            <Ionicons name="checkmark-circle" size={28} color={colors.success} />
          ) : (
            <Ionicons name="ellipse-outline" size={28} color={colors.textLight} />
          )}
        </Pressable>

        <View style={{ flex: 1 }}>
          <View style={styles.stepTitleRow}>
            <Ionicons name={kindIcon as any} size={18} color={kindColor} />
            <Text style={[styles.stepTitle, step.status === 'completed' && styles.stepTitleComplete]}>
              {step.title}
            </Text>
          </View>
          
          {step.evidence_rules?.min_count && (
            <Text style={styles.requirement}>
              Requires: {step.evidence_rules.min_count} {step.kind}s
            </Text>
          )}
        </View>

        <Ionicons 
          name={expanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color={colors.textLight} 
        />
      </Pressable>

      {expanded && step.instructions && step.instructions.length > 0 && (
        <View style={styles.stepBody}>
          <Text style={styles.instructionsTitle}>Instructions:</Text>
          {step.instructions.map((instruction, index) => (
            <Text key={index} style={styles.instructionText}>
              • {instruction}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  loading: {
    padding: 20,
    alignItems: 'center',
  },
  empty: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 16,
  },
  generateButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  generateButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.line,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: 13,
    color: colors.textLight,
    fontWeight: '600',
    textAlign: 'center',
  },
  stepCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.light,
    overflow: 'hidden',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  checkbox: {
    padding: 4,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.core,
    flex: 1,
  },
  stepTitleComplete: {
    color: colors.textLight,
    textDecorationLine: 'line-through',
  },
  requirement: {
    fontSize: 12,
    color: colors.warning,
    marginTop: 4,
  },
  stepBody: {
    padding: 12,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  instructionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.core,
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 13,
    color: colors.textLight,
    marginBottom: 4,
    lineHeight: 18,
  },
  regenerateButton: {
    backgroundColor: colors.light,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  regenerateText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

