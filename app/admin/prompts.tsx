// app/admin/prompts.tsx
// SIMPLIFIED: One active prompt per function, easy editing
import { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { listPrompts, createPromptVersion, AppPrompt } from '@/services/prompts';
import { colors } from '@/theme/colors';
import { useRouter } from 'expo-router';

interface PromptEdit {
  key: string;
  title: string;
  description: string;
  systemPrompt: string;
  userPrompt: string;
}

export default function AdminPromptsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // One edit state per prompt function
  const [fnol, setFnol] = useState<PromptEdit>({
    key: 'fnol_extract',
    title: 'FNOL Extraction',
    description: 'Extract claim data from FNOL PDFs',
    systemPrompt: '',
    userPrompt: '',
  });
  
  const [vision, setVision] = useState<PromptEdit>({
    key: 'vision_annotate',
    title: 'Photo Annotation',
    description: 'Detect damage in photos',
    systemPrompt: '',
    userPrompt: '',
  });
  
  const [workflow, setWorkflow] = useState<PromptEdit>({
    key: 'workflow_generate',
    title: 'Workflow Generation',
    description: 'Generate inspection workflows',
    systemPrompt: '',
    userPrompt: '',
  });

  useEffect(() => {
    loadPrompts();
  }, []);

  async function loadPrompts() {
    try {
      setLoading(true);
      const allPrompts = await listPrompts();
      
      // Get active prompts only
      const fnolSys = allPrompts.find(p => p.key === 'fnol_extract_system' && p.is_active);
      const fnolUser = allPrompts.find(p => p.key === 'fnol_extract_user' && p.is_active);
      const visionSys = allPrompts.find(p => p.key === 'vision_annotate_system' && p.is_active);
      const visionUser = allPrompts.find(p => p.key === 'vision_annotate_user' && p.is_active);
      const workflowSys = allPrompts.find(p => p.key === 'workflow_generate_system' && p.is_active);
      const workflowUser = allPrompts.find(p => p.key === 'workflow_generate_user' && p.is_active);
      
      if (fnolSys || fnolUser) {
        setFnol(prev => ({
          ...prev,
          systemPrompt: fnolSys?.template || '',
          userPrompt: fnolUser?.template || '',
        }));
      }
      
      if (visionSys || visionUser) {
        setVision(prev => ({
          ...prev,
          systemPrompt: visionSys?.template || '',
          userPrompt: visionUser?.template || '',
        }));
      }
      
      if (workflowSys || workflowUser) {
        setWorkflow(prev => ({
          ...prev,
          systemPrompt: workflowSys?.template || '',
          userPrompt: workflowUser?.template || '',
        }));
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
      
      // Save system prompt
      if (promptEdit.systemPrompt) {
        await createPromptVersion({
          org_id: null,
          key: `${promptEdit.key}_system`,
          role: 'system',
          description: `System prompt for ${promptEdit.title}`,
          template: promptEdit.systemPrompt,
          is_active: true,
        } as any);
      }
      
      // Save user prompt
      if (promptEdit.userPrompt) {
        await createPromptVersion({
          org_id: null,
          key: `${promptEdit.key}_user`,
          role: 'user',
          description: `User prompt for ${promptEdit.title}`,
          template: promptEdit.userPrompt,
          is_active: true,
        } as any);
      }
      
      Alert.alert('Success', `${promptEdit.title} prompts updated!`);
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
          Edit the AI prompts used for data extraction and analysis. Each function has two prompts: System (instructions) and User (task).
        </Text>

        {/* FNOL Extraction */}
        <PromptEditor
          title={fnol.title}
          description={fnol.description}
          systemPrompt={fnol.systemPrompt}
          userPrompt={fnol.userPrompt}
          onSystemChange={(text) => setFnol({ ...fnol, systemPrompt: text })}
          onUserChange={(text) => setFnol({ ...fnol, userPrompt: text })}
          onSave={() => savePrompt(fnol)}
          saving={saving}
        />

        {/* Photo Annotation */}
        <PromptEditor
          title={vision.title}
          description={vision.description}
          systemPrompt={vision.systemPrompt}
          userPrompt={vision.userPrompt}
          onSystemChange={(text) => setVision({ ...vision, systemPrompt: text })}
          onUserChange={(text) => setVision({ ...vision, userPrompt: text })}
          onSave={() => savePrompt(vision)}
          saving={saving}
        />

        {/* Workflow Generation */}
        <PromptEditor
          title={workflow.title}
          description={workflow.description}
          systemPrompt={workflow.systemPrompt}
          userPrompt={workflow.userPrompt}
          onSystemChange={(text) => setWorkflow({ ...workflow, systemPrompt: text })}
          onUserChange={(text) => setWorkflow({ ...workflow, userPrompt: text })}
          onSave={() => savePrompt(workflow)}
          saving={saving}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function PromptEditor({
  title,
  description,
  systemPrompt,
  userPrompt,
  onSystemChange,
  onUserChange,
  onSave,
  saving,
}: {
  title: string;
  description: string;
  systemPrompt: string;
  userPrompt: string;
  onSystemChange: (text: string) => void;
  onUserChange: (text: string) => void;
  onSave: () => void;
  saving: boolean;
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
          <Text style={styles.label}>System Prompt (AI Instructions)</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={8}
            value={systemPrompt}
            onChangeText={onSystemChange}
            placeholder="Enter system instructions for the AI..."
            textAlignVertical="top"
          />

          <Text style={styles.label}>User Prompt (Task Description)</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={6}
            value={userPrompt}
            onChangeText={onUserChange}
            placeholder="Enter the user task prompt..."
            textAlignVertical="top"
          />

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
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: colors.core,
    minHeight: 120,
    fontFamily: 'monospace',
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
