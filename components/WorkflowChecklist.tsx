// components/WorkflowChecklist.tsx
// Interactive workflow task checklist for claims with comprehensive metadata display

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
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
  getClaimWorkflowMetadata,
} from '@/services/workflow';

interface WorkflowChecklistProps {
  claimId: string;
  onWorkflowComplete?: () => void;
}

interface WorkflowMetadata {
  workflowName?: string;
  estimatedDurationHours?: number;
  checklists?: Array<{
    section: string;
    items: string[];
  }>;
  issuesToWatchFor?: string[];
  notes?: string;
}

export default function WorkflowChecklist({ claimId, onWorkflowComplete }: WorkflowChecklistProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [metadata, setMetadata] = useState<WorkflowMetadata>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, percentComplete: 0 });
  const [showChecklists, setShowChecklists] = useState(false);
  const [showIssues, setShowIssues] = useState(false);

  useEffect(() => {
    loadWorkflow();
  }, [claimId]);

  async function loadWorkflow() {
    try {
      setLoading(true);
      const [workflowSteps, workflowMeta] = await Promise.all([
        getWorkflowSteps(claimId),
        getClaimWorkflowMetadata(claimId)
      ]);
      
      setSteps(workflowSteps);
      setMetadata(workflowMeta || {});
      
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
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        {/* Workflow Header */}
        {metadata.workflowName && (
          <View style={styles.workflowHeader}>
            <Text style={styles.workflowName}>{metadata.workflowName}</Text>
            {metadata.estimatedDurationHours && (
              <Text style={styles.workflowDuration}>
                Est. Duration: {metadata.estimatedDurationHours} hours
              </Text>
            )}
          </View>
        )}

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${stats.percentComplete}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {stats.completed} of {stats.total} complete ({stats.percentComplete}%)
          </Text>
        </View>

        {/* Checklists Section */}
        {metadata.checklists && metadata.checklists.length > 0 && (
          <View style={styles.section}>
            <Pressable 
              style={styles.sectionHeader}
              onPress={() => setShowChecklists(!showChecklists)}
            >
              <Text style={styles.sectionTitle}>📋 Inspection Checklists</Text>
              <Ionicons 
                name={showChecklists ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color={colors.textLight} 
              />
            </Pressable>
            
            {showChecklists && (
              <View style={styles.sectionContent}>
                {metadata.checklists.map((checklist, idx) => (
                  <View key={idx} style={styles.checklistGroup}>
                    <Text style={styles.checklistSection}>{checklist.section}</Text>
                    {checklist.items.map((item, itemIdx) => (
                      <Text key={itemIdx} style={styles.checklistItem}>• {item}</Text>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Issues to Watch Section */}
        {metadata.issuesToWatchFor && metadata.issuesToWatchFor.length > 0 && (
          <View style={styles.section}>
            <Pressable 
              style={styles.sectionHeader}
              onPress={() => setShowIssues(!showIssues)}
            >
              <Text style={styles.sectionTitle}>⚠️ Issues to Watch</Text>
              <Ionicons 
                name={showIssues ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color={colors.textLight} 
              />
            </Pressable>
            
            {showIssues && (
              <View style={styles.sectionContent}>
                {metadata.issuesToWatchFor.map((issue, idx) => (
                  <View key={idx} style={styles.issueItem}>
                    <Text style={styles.issueText}>{issue}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Notes Section */}
        {metadata.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>📝 Notes</Text>
            <Text style={styles.notesText}>{metadata.notes}</Text>
          </View>
        )}

        {/* Steps list */}
        <Text style={styles.stepsHeader}>Inspection Steps</Text>
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
    </ScrollView>
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

  // Parse evidence rules to show assigned to and dependencies
  const assignedTo = step.evidence_rules?.assignedTo || 'FieldAdjuster';
  const dependencies = step.evidence_rules?.dependencies || [];
  const requiredArtifacts = step.evidence_rules?.requiredArtifacts || [];
  const suggestedTools = step.validation?.suggestedTools || [];
  const estimatedTime = step.validation?.estimatedTimeMinutes || 0;

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
          
          <View style={styles.stepMeta}>
            <Text style={styles.stepMetaText}>{assignedTo}</Text>
            {estimatedTime > 0 && (
              <Text style={styles.stepMetaText}> • {estimatedTime} min</Text>
            )}
          </View>
          
          {requiredArtifacts.length > 0 && (
            <Text style={styles.requirement}>
              Required: {requiredArtifacts.join(', ')}
            </Text>
          )}
        </View>

        <Ionicons 
          name={expanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color={colors.textLight} 
        />
      </Pressable>

      {expanded && (
        <View style={styles.stepBody}>
          {step.instructions && step.instructions.length > 0 && (
            <>
              <Text style={styles.instructionsTitle}>Instructions:</Text>
              {step.instructions.map((instruction, index) => (
                <Text key={index} style={styles.instructionText}>
                  • {instruction}
                </Text>
              ))}
            </>
          )}
          
          {suggestedTools.length > 0 && (
            <>
              <Text style={styles.toolsTitle}>Suggested Tools:</Text>
              <Text style={styles.toolsList}>{suggestedTools.join(', ')}</Text>
            </>
          )}
          
          {dependencies.length > 0 && (
            <>
              <Text style={styles.dependenciesTitle}>Dependencies:</Text>
              <Text style={styles.dependenciesList}>
                Must complete steps: {dependencies.join(', ')}
              </Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
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
    fontSize: 16,
    color: colors.textLight,
    marginBottom: 16,
  },
  generateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  generateButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  workflowHeader: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  workflowName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  workflowDuration: {
    fontSize: 14,
    color: colors.textLight,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.line,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 6,
    textAlign: 'center',
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.core,
  },
  sectionContent: {
    padding: 16,
    paddingTop: 0,
  },
  checklistGroup: {
    marginBottom: 16,
  },
  checklistSection: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  checklistItem: {
    fontSize: 13,
    color: colors.text,
    marginLeft: 8,
    marginBottom: 4,
    lineHeight: 18,
  },
  issueItem: {
    backgroundColor: colors.warningLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  issueText: {
    fontSize: 13,
    color: colors.warning,
    lineHeight: 18,
  },
  notesBox: {
    backgroundColor: colors.light,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  stepsHeader: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.core,
    marginTop: 8,
    marginBottom: 12,
  },
  stepCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  checkbox: {
    marginRight: 12,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 6,
    flex: 1,
  },
  stepTitleComplete: {
    textDecorationLine: 'line-through',
    color: colors.textLight,
  },
  stepMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  stepMetaText: {
    fontSize: 12,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  requirement: {
    fontSize: 12,
    color: colors.info,
    marginTop: 4,
  },
  stepBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 0,
  },
  instructionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textLight,
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 13,
    color: colors.text,
    marginLeft: 8,
    marginBottom: 2,
    lineHeight: 18,
  },
  toolsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textLight,
    marginTop: 8,
    marginBottom: 4,
  },
  toolsList: {
    fontSize: 13,
    color: colors.info,
    marginLeft: 8,
  },
  dependenciesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textLight,
    marginTop: 8,
    marginBottom: 4,
  },
  dependenciesList: {
    fontSize: 13,
    color: colors.warning,
    marginLeft: 8,
  },
  regenerateButton: {
    borderWidth: 1,
    borderColor: colors.primary,
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