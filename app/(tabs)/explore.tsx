import { ScrollView, StyleSheet, Text, View, Pressable, Linking } from 'react-native';
import Header from '@/components/Header';
import Section from '@/components/Section';
import { colors } from '@/theme/colors';

export default function ExploreScreen() {
  return (
    <ScrollView style={styles.container}>
      <Header title="Help & Resources" subtitle="Learn how to use Claims iQ Sidekick" />

      <Section title="Quick Start Guide">
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

      <Section title="Features">
        <FeatureItem icon="📸" title="Photo Capture" description="Take photos with automatic AI damage detection" />
        <FeatureItem icon="🤖" title="AI Analysis" description="GPT-4 Vision identifies damage, severity, and creates annotations" />
        <FeatureItem icon="📄" title="FNOL Processing" description="Upload FNOL PDFs and extract data automatically" />
        <FeatureItem icon="📊" title="Claim Management" description="Track claims, edit details, view history" />
        <FeatureItem icon="📱" title="Offline Support" description="Work without internet, sync when connected" />
        <FeatureItem icon="📝" title="Reports" description="Generate professional claim reports with photos" />
      </Section>

      <Section title="Support & Feedback">
        <Pressable 
          style={styles.linkButton}
          onPress={() => Linking.openURL('https://claimsiq.ai/support')}
        >
          <Text style={styles.linkText}>📧 Contact Support</Text>
        </Pressable>
        
        <Pressable 
          style={styles.linkButton}
          onPress={() => Linking.openURL('https://claimsiq.ai/docs')}
        >
          <Text style={styles.linkText}>📚 Documentation</Text>
        </Pressable>

        <View style={styles.versionCard}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
          <Text style={styles.versionSubtext}>Claims iQ Sidekick © 2025</Text>
        </View>
      </Section>
    </ScrollView>
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

function FeatureItem({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSoft },
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
  featureItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.core,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: '#9AA0A6',
  },
  linkButton: {
    backgroundColor: colors.white,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  versionCard: {
    marginTop: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.core,
  },
  versionSubtext: {
    fontSize: 11,
    color: '#9AA0A6',
    marginTop: 4,
  },
});
