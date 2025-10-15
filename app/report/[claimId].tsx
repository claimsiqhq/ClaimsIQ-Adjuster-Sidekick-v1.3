// app/report/[claimId].tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Switch, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import Header from '@/components/Header';
import Section from '@/components/Section';
import { generateReportData, exportReportPDF, shareReport, ReportOptions } from '@/services/reports';

export default function ReportGenerateScreen() {
  const { claimId } = useLocalSearchParams<{ claimId: string }>();
  const router = useRouter();
  const [options, setOptions] = useState<ReportOptions>({
    claimId: claimId || '',
    includePhotos: true,
    includeAnnotations: true,
    includeFNOL: true,
    includeDocuments: true,
    template: 'standard',
  });
  const [generating, setGenerating] = useState(false);
  const [claimNumber, setClaimNumber] = useState<string>('');

  useEffect(() => {
    loadClaimInfo();
  }, [claimId]);

  async function loadClaimInfo() {
    if (!claimId) return;
    
    try {
      const reportData = await generateReportData(claimId);
      setClaimNumber(reportData.claim.claim_number || 'Unnamed');
    } catch (error) {
      console.error('Error loading claim:', error);
    }
  }

  async function handleGenerate() {
    if (!claimId) return;

    try {
      setGenerating(true);

      // Generate report data
      const reportData = await generateReportData(claimId, options);

      // Export to PDF/HTML
      const filePath = await exportReportPDF(reportData, options);

      Alert.alert(
        'Report Generated',
        'Your report is ready to share.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Share',
            onPress: async () => {
              try {
                await shareReport(filePath);
              } catch (error: any) {
                Alert.alert('Error', error.message);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', 'Failed to generate report: ' + error.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Header 
        title="Generate Report" 
        subtitle={`Claim #${claimNumber}`}
      />

      <Section title="Report Template">
        <View style={styles.templateOptions}>
          {(['standard', 'detailed', 'summary'] as const).map((template) => (
            <Pressable
              key={template}
              style={[
                styles.templateCard,
                options.template === template && styles.templateCardActive,
              ]}
              onPress={() => setOptions({ ...options, template })}
            >
              <Text
                style={[
                  styles.templateText,
                  options.template === template && styles.templateTextActive,
                ]}
              >
                {template.charAt(0).toUpperCase() + template.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title="Include in Report">
        <View style={styles.optionRow}>
          <Text style={styles.optionLabel}>Photos</Text>
          <Switch
            value={options.includePhotos}
            onValueChange={(value) => setOptions({ ...options, includePhotos: value })}
          />
        </View>

        <View style={styles.optionRow}>
          <Text style={styles.optionLabel}>AI Annotations</Text>
          <Switch
            value={options.includeAnnotations}
            onValueChange={(value) => setOptions({ ...options, includeAnnotations: value })}
            disabled={!options.includePhotos}
          />
        </View>

        <View style={styles.optionRow}>
          <Text style={styles.optionLabel}>FNOL Data</Text>
          <Switch
            value={options.includeFNOL}
            onValueChange={(value) => setOptions({ ...options, includeFNOL: value })}
          />
        </View>

        <View style={styles.optionRow}>
          <Text style={styles.optionLabel}>All Documents</Text>
          <Switch
            value={options.includeDocuments}
            onValueChange={(value) => setOptions({ ...options, includeDocuments: value })}
          />
        </View>
      </Section>

      <Section title="Preview">
        <Text style={styles.previewText}>
          Your report will include:{'\n\n'}
          • Claim information and details{'\n'}
          {options.includePhotos && '• All photos with captions\n'}
          {options.includeAnnotations && '• AI damage detection results\n'}
          {options.includeFNOL && '• FNOL extracted data\n'}
          {options.includeDocuments && '• Document list\n'}
          {'\n'}
          Template: {options.template}
        </Text>
      </Section>

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => router.back()}
          disabled={generating}
        >
          <Text style={styles.buttonTextDark}>Cancel</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonPrimary, generating && styles.buttonDisabled]}
          onPress={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Generate & Share</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgSoft,
  },
  templateOptions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
  },
  templateCard: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  templateCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.light,
  },
  templateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5F6771',
  },
  templateTextActive: {
    color: colors.primary,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.core,
  },
  previewText: {
    fontSize: 14,
    color: '#5F6771',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.gold,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonTextDark: {
    color: colors.core,
    fontSize: 15,
    fontWeight: '700',
  },
});

