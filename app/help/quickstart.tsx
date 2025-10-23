import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import Section from '@/components/Section';
import { colors } from '@/theme/colors';

export default function QuickStartScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Header title="Quick Start Guide" subtitle="Learn how to use ClaimsIQ Sidekick" />

        <Section title="Getting Started">
          <GuideItem 
            number="1" 
            title="Capture Photos"
            description="Go to Capture tab, tap camera icon, take photos of damage. AI will automatically detect and annotate issues."
          />
          <GuideItem 
            number="2" 
            title="Create Claims"
            description="In the Capture gallery, select photos and assign them to a claim number. The claim will be created automatically."
          />
          <GuideItem 
            number="3" 
            title="Upload FNOL"
            description="Open a claim, tap 'Upload Document', select FNOL PDF. AI will extract all claim data automatically."
          />
          <GuideItem 
            number="4" 
            title="Review & Edit"
            description="View claim details, edit information, add notes. All changes sync automatically."
          />
          <GuideItem 
            number="5" 
            title="Generate Reports"
            description="From claim details, tap 'Generate Report' to create professional PDF reports with photos and annotations."
          />
        </Section>

        <Section title="Tips & Best Practices">
          <TipItem 
            icon="📸" 
            text="Take photos from multiple angles for comprehensive documentation"
          />
          <TipItem 
            icon="💡" 
            text="Good lighting improves AI damage detection accuracy"
          />
          <TipItem 
            icon="📱" 
            text="Enable location services for automatic GPS tagging"
          />
          <TipItem 
            icon="🔄" 
            text="Work offline - all data syncs when you reconnect"
          />
          <TipItem 
            icon="✏️" 
            text="Add voice notes for quick documentation in the field"
          />
        </Section>

        <Section title="Common Workflows">
          <WorkflowItem 
            title="Roof Inspection"
            steps={[
              "Take overview photos from ground level",
              "Capture close-ups of damaged areas",
              "Use LiDAR for accurate measurements",
              "Generate AI workflow for inspection checklist",
              "Create report with all findings"
            ]}
          />
          <WorkflowItem 
            title="Water Damage Claim"
            steps={[
              "Document source of water damage",
              "Capture affected areas room by room",
              "Take moisture readings if available",
              "Upload FNOL for automatic data extraction",
              "Generate comprehensive report"
            ]}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function GuideItem({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <View style={styles.guideItem}>
      <View style={styles.numberBadge}>
        <Text style={styles.numberText}>{number}</Text>
      </View>
      <View style={styles.guideContent}>
        <Text style={styles.guideTitle}>{title}</Text>
        <Text style={styles.guideDesc}>{description}</Text>
      </View>
    </View>
  );
}

function TipItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.tipItem}>
      <Text style={styles.tipIcon}>{icon}</Text>
      <Text style={styles.tipText}>{text}</Text>
    </View>
  );
}

function WorkflowItem({ title, steps }: { title: string; steps: string[] }) {
  return (
    <View style={styles.workflowItem}>
      <Text style={styles.workflowTitle}>{title}</Text>
      {steps.map((step, index) => (
        <View key={index} style={styles.stepItem}>
          <Text style={styles.stepNumber}>{index + 1}.</Text>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.bgSoft 
  },
  guideItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  numberText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  guideContent: {
    flex: 1,
  },
  guideTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.core,
    marginBottom: 4,
  },
  guideDesc: {
    fontSize: 13,
    color: '#5F6771',
    lineHeight: 18,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tipIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 18,
  },
  workflowItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  workflowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 8,
  },
  stepNumber: {
    fontSize: 13,
    color: colors.textLight,
    marginRight: 8,
    minWidth: 16,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
});