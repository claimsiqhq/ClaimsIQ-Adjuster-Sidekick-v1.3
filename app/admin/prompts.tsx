// app/admin/prompts.tsx
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { listPrompts, createPromptVersion, setActivePrompt, AppPrompt, PromptRole } from '@/services/prompts';
import { colors } from '@/theme/colors';
import { useRouter } from 'expo-router';

type PromptKeyGroup = {
  title: string;
  keys: { key: string; label: string; role: PromptRole }[];
};

const GROUPS: PromptKeyGroup[] = [
  {
    title: 'FNOL PDF → JSON',
    keys: [
      { key: 'fnol_extract_system', label: 'System', role: 'system' },
      { key: 'fnol_extract_user', label: 'User', role: 'user' },
    ],
  },
  {
    title: 'Photo Annotation',
    keys: [
      { key: 'vision_annotate_system', label: 'System', role: 'system' },
      { key: 'vision_annotate_user', label: 'User', role: 'user' },
    ],
  },
  {
    title: 'Workflow Generation',
    keys: [
      { key: 'workflow_generate_system', label: 'System', role: 'system' },
      { key: 'workflow_generate_user', label: 'User', role: 'user' },
    ],
  },
];

export default function AdminPromptsScreen() {
  const [prompts, setPrompts] = useState<AppPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<{ key: string; role: PromptRole; description?: string; template: string; is_active: boolean }>({
    key: '',
    role: 'system',
    description: '',
    template: '',
    is_active: true,
  });

  const router = useRouter();

  async function load() {
    try {
      setLoading(true);
      const rows = await listPrompts();
      setPrompts(rows);
    } catch (e: any) {
      Alert.alert('Error', String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, AppPrompt[]> = {};
    for (const g of GROUPS) {
      for (const { key } of g.keys) {
        map[key] = prompts.filter(p => p.key === key);
      }
    }
    return map as Record<string, AppPrompt[]>;
  }, [prompts]);

  function openCreate(key: string, role: PromptRole) {
    setDraft({ key, role, description: '', template: '', is_active: true });
    setEditorOpen(true);
  }

  async function saveDraft() {
    try {
      const newRow = await createPromptVersion({
        org_id: null,
        key: draft.key,
        role: draft.role,
        description: draft.description ?? null,
        template: draft.template,
        is_active: !!draft.is_active,
      } as any);
      setEditorOpen(false);
      await load();
      Alert.alert('Saved', `New version for ${newRow.key} is ${newRow.is_active ? 'active' : 'inactive'}.`);
    } catch (e: any) {
      Alert.alert('Save failed', String(e?.message ?? e));
    }
  }

  async function activate(id: string) {
    try {
      await setActivePrompt(id);
      await load();
    } catch (e: any) {
      Alert.alert('Activation failed', String(e?.message ?? e));
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgSoft }}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin · Prompts</Text>
        <Pressable style={styles.btn} onPress={load}><Text style={styles.btnTxt}>Reload</Text></Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {GROUPS.map(group => (
          <View key={group.title} style={styles.section}>
            <Text style={styles.h}>{group.title}</Text>
            {group.keys.map(k => (
              <View key={k.key} style={styles.card}>
                <View style={styles.rowHead}>
                  <Text style={styles.key}>{k.label}</Text>
                  <Pressable style={styles.smallBtn} onPress={() => openCreate(k.key, k.role)}>
                    <Text style={styles.smallBtnTxt}>New version</Text>
                  </Pressable>
                </View>
                <FlatList
                  data={grouped[k.key] ?? []}
                  keyExtractor={i => i.id}
                  ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                  renderItem={({ item }) => (
                    <View style={styles.version}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.meta}>{new Date(item.updated_at).toLocaleString()}</Text>
                        <Text numberOfLines={3} style={styles.preview}>{item.template}</Text>
                        <Text style={[styles.badge, item.is_active ? styles.active : styles.inactive]}>
                          {item.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </Text>
                      </View>
                      {!item.is_active ? (
                        <Pressable style={styles.actBtn} onPress={() => activate(item.id)}>
                          <Text style={styles.actBtnTxt}>Make Active</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  )}
                />
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <Modal visible={editorOpen} animationType="slide" onRequestClose={() => setEditorOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgSoft }}>
          <View style={styles.header}>
            <Text style={styles.title}>New Prompt Version</Text>
            <Pressable style={styles.btn} onPress={() => setEditorOpen(false)}><Text style={styles.btnTxt}>Close</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.form}>
              <Text style={styles.label}>Key</Text>
              <TextInput style={styles.input} value={draft.key} editable={false} />

              <Text style={styles.label}>Role</Text>
              <TextInput style={styles.input} value={draft.role} editable={false} />

              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Describe this version"
                value={draft.description}
                onChangeText={(t) => setDraft((d) => ({ ...d, description: t }))}
              />

              <Text style={styles.label}>Template</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                multiline
                textAlignVertical="top"
                placeholder="Enter full prompt template..."
                value={draft.template}
                onChangeText={(t) => setDraft((d) => ({ ...d, template: t }))}
              />

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <Pressable style={styles.primary} onPress={saveDraft}><Text style={styles.primaryTxt}>Save & Activate</Text></Pressable>
                <Pressable style={styles.secondary} onPress={() => { setDraft(d => ({ ...d, is_active: false })); saveDraft(); }}>
                  <Text style={styles.secondaryTxt}>Save Inactive</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: colors.core },
  btn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.primary, borderRadius: 10 },
  btnTxt: { color: colors.white, fontWeight: '700' },

  section: { paddingHorizontal: 16, paddingTop: 10 },
  h: { color: colors.core, fontWeight: '700', marginBottom: 8 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.line, marginBottom: 12 },

  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  key: { color: colors.core, fontWeight: '700' },

  version: { flexDirection: 'row', gap: 12, paddingVertical: 6, alignItems: 'center' },
  meta: { color: '#6b7280', fontSize: 12 },
  preview: { color: colors.core, marginTop: 4 },
  badge: { marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden', fontSize: 12 },
  active: { backgroundColor: '#DCFCE7', color: '#166534' },
  inactive: { backgroundColor: '#F5F5F5', color: '#374151' },
  actBtn: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.secondary, borderRadius: 8 },
  actBtnTxt: { color: colors.white, fontWeight: '700' },

  form: { backgroundColor: colors.white, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.line, margin: 16 },
  label: { color: colors.core, fontWeight: '600', marginTop: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, color: colors.core, marginTop: 4 },
  multiline: { minHeight: 220 },

  primary: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  primaryTxt: { color: colors.white, fontWeight: '700' },
  secondary: { backgroundColor: colors.gold, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  secondaryTxt: { color: colors.core, fontWeight: '700' },
});
