// app/admin/prompts.tsx
// Simplified: One prompt per function for cleaner management
import { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { listPrompts, createPromptVersion, AppPrompt } from '@/services/prompts';
import { colors } from '@/theme/colors';
import { useRouter } from 'expo-router';

interface PromptEdit {
  key: string;
  title: string;
  description: string;
  prompt: string;
}

export default function AdminPromptsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // One state per prompt function
  const [fnol, setFnol] = useState<PromptEdit>({
    key: 'fnol_extract',
    title: 'FNOL Extraction',
    description: 'Extract claim data from FNOL PDFs',
    prompt: '',
  });
  
  const [vision, setVision] = useState<PromptEdit>({
    key: 'vision_annotate',
    title: 'Photo Annotation',
    description: 'Detect damage in photos',
    prompt: '',
  });
  
  const [workflow, setWorkflow] = useState<PromptEdit>({
    key: 'workflow_generate',
    title: 'Workflow Generation',
    description: 'Generate inspection workflows',
    prompt: '',
  });

  useEffect(() => {
    loadPrompts();
  }, []);

  async function loadPrompts() {
    try {
      setLoading(true);
      const allPrompts = await listPrompts();
      
      // Get active prompts (now single prompts)
      const fnolPrompt = allPrompts.find(p => p.key === 'fnol_extract' && p.is_active);
      const visionPrompt = allPrompts.find(p => p.key === 'vision_annotate' && p.is_active);
      const workflowPrompt = allPrompts.find(p => p.key === 'workflow_generate' && p.is_active);
      
      if (fnolPrompt) {
        setFnol(prev => ({ ...prev, prompt: fnolPrompt.template || '' }));
      }
      
      if (visionPrompt) {
        setVision(prev => ({ ...prev, prompt: visionPrompt.template || '' }));
      }
      
      if (workflowPrompt) {
        setWorkflow(prev => ({ ...prev, prompt: workflowPrompt.template || '' }));
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load prompts: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function savePrompt(promptEdit: PromptEdit) {
    try {
      setSaving(true);
      
      // Save single prompt
      await createPromptVersion({
        org_id: null,
        key: promptEdit.key,
        role: 'user', // We'll just use 'user' role for all single prompts
        description: promptEdit.description,
        template: promptEdit.prompt,
        is_active: true,
      } as any);
      
      Alert.alert('Success', `${promptEdit.title} prompt updated!`);
      await loadPrompts();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>AI Prompts</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>
          Edit the AI prompts used for data extraction and analysis. Each function uses a single, comprehensive prompt that includes both instructions and the task.
        </Text>

        {/* FNOL Extraction */}
        <PromptEditor
          title={fnol.title}
          description={fnol.description}
          prompt={fnol.prompt}
          onChange={(text) => setFnol({ ...fnol, prompt: text })}
          onSave={() => savePrompt(fnol)}
          saving={saving}
          placeholder={`You are extracting structured data from a First Notice of Loss (FNOL) document...`}
        />

        {/* Photo Annotation */}
        <PromptEditor
          title={vision.title}
          description={vision.description}
          prompt={vision.prompt}
          onChange={(text) => setVision({ ...vision, prompt: text })}
          onSave={() => savePrompt(vision)}
          saving={saving}
          placeholder={`Analyze this insurance claim photo for damage assessment.

Identify and describe:
1. Type of damage (water, wind, fire, structural, etc.)
2. Severity (minor, moderate, severe, critical)
3. Affected materials and components
4. Recommended immediate actions

Return JSON with detected damage, bounding boxes, confidence scores, and photo quality metrics.`}
        />

        {/* Workflow Generation */}
        <PromptEditor
          title={workflow.title}
          description={workflow.description}
          prompt={workflow.prompt}
          onChange={(text) => setWorkflow({ ...workflow, prompt: text })}
          onSave={() => savePrompt(workflow)}
          saving={saving}
          placeholder={`You are generating a complete field inspection workflow for an insurance adjuster...`}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function PromptEditor({
  title,
  description,
  prompt,
  onChange,
  onSave,
  saving,
  placeholder,
}: {
  title: string;
  description: string;
  prompt: string;
  onChange: (text: string) => void;
  onSave: () => void;
  saving: boolean;
  placeholder?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.promptCard}>
      <Pressable style={styles.promptHeader} onPress={() => setExpanded(!expanded)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.promptTitle}>{title}</Text>
          <Text style={styles.promptDesc}>{description}</Text>
        </View>
        <Text style={styles.expandIcon}>{expanded ? '▼' : '▶'}</Text>
      </Pressable>

      {expanded && (
        <View style={styles.promptBody}>
          <Text style={styles.label}>Prompt Template</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={12}
            value={prompt}
            onChangeText={onChange}
            placeholder={placeholder || "Enter the prompt template..."}
            placeholderTextColor={colors.textLight}
            textAlignVertical="top"
          />

          <Text style={styles.hint}>
            💡 This single prompt includes both the instructions and the task. Use {`{{VARIABLES}}`} for dynamic content.
          </Text>

          <Pressable
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={onSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgSoft,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.light,
    borderRadius: 8,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.core,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 20,
    marginBottom: 20,
  },
  promptCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 16,
    overflow: 'hidden',
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.white,
  },
  promptTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  promptDesc: {
    fontSize: 13,
    color: colors.textLight,
  },
  expandIcon: {
    fontSize: 16,
    color: colors.textLight,
    marginLeft: 12,
  },
  promptBody: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.core,
    marginTop: 12,
    marginBottom: 6,
  },
  textArea: {
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: colors.core,
    minHeight: 200,
    fontFamily: 'monospace',
  },
  hint: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 8,
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});