import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import Section from '@/components/Section';
import { colors } from '@/theme/colors';

export default function FeaturesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Header title="Features Overview" subtitle="Explore all ClaimsIQ Sidekick capabilities" />

        <Section title="Core Features">
          <FeatureItem 
            icon="📸" 
            title="AI Photo Capture" 
            description="Take photos with automatic damage detection using GPT-4 Vision. AI identifies damage types, severity levels, and creates visual annotations on your photos."
          />
          <FeatureItem 
            icon="🤖" 
            title="Smart Damage Analysis" 
            description="Advanced AI analyzes each photo to detect hail damage, water damage, structural issues, and more. Get instant severity classifications and repair recommendations."
          />
          <FeatureItem 
            icon="📄" 
            title="FNOL Processing" 
            description="Upload First Notice of Loss PDFs and let AI extract all claim data automatically - policy details, loss information, adjuster assignments, and contact information."
          />
          <FeatureItem 
            icon="📊" 
            title="Claim Management" 
            description="Track all your claims in one place. View detailed information, edit fields, add notes, and manage documents. All changes sync automatically across devices."
          />
          <FeatureItem 
            icon="📱" 
            title="Offline Support" 
            description="Work without internet connection. All photos, claims, and edits are saved locally and automatically sync when you reconnect."
          />
          <FeatureItem 
            icon="📝" 
            title="Professional Reports" 
            description="Generate comprehensive PDF reports with photos, AI annotations, damage assessments, and claim details. Perfect for sharing with insurers and clients."
          />
        </Section>

        <Section title="AI Capabilities">
          <FeatureItem 
            icon="✨" 
            title="Workflow Generation" 
            description="AI creates step-by-step inspection workflows based on claim type and damage. Get customized checklists with time estimates and required documentation."
          />
          <FeatureItem 
            icon="🎯" 
            title="Annotation Overlays" 
            description="Visual bounding boxes and polygons highlight damaged areas. Each annotation includes labels, severity ratings, and confidence scores."
          />
          <FeatureItem 
            icon="🔍" 
            title="Quality Control" 
            description="AI detects photo quality issues like blur, glare, and poor exposure. Get real-time feedback to capture the best documentation."
          />
          <FeatureItem 
            icon="📍" 
            title="GPS Integration" 
            description="Automatic location tagging for all photos and claims. View claims on a map and navigate to inspection sites."
          />
        </Section>

        <Section title="Professional Tools">
          <FeatureItem 
            icon="🗺️" 
            title="Route Optimization" 
            description="Plan your daily inspections efficiently. AI optimizes routes based on location, weather, and appointment windows."
          />
          <FeatureItem 
            icon="🌤️" 
            title="Weather Integration" 
            description="Current conditions and forecasts for inspection sites. Safety alerts for hazardous conditions like high winds or storms."
          />
          <FeatureItem 
            icon="📐" 
            title="Measurement Tools" 
            description="Capture dimensions and areas using your device. Perfect for roof squares, room sizes, and damage extent."
          />
          <FeatureItem 
            icon="🎙️" 
            title="Voice Notes" 
            description="Add voice recordings to claims for quick field documentation. Transcription available for searchable notes."
          />
        </Section>

        <Section title="Data Management">
          <FeatureItem 
            icon="☁️" 
            title="Cloud Sync" 
            description="Secure backup to Supabase cloud. Access your data from any device with automatic synchronization."
          />
          <FeatureItem 
            icon="🔒" 
            title="Security" 
            description="End-to-end encryption for sensitive data. Row-level security ensures you only see your claims."
          />
          <FeatureItem 
            icon="📊" 
            title="Export Options" 
            description="Export claims to Excel, PDF, or JSON formats. Share reports via email or cloud storage services."
          />
          <FeatureItem 
            icon="🔄" 
            title="Version History" 
            description="Track all changes to claims and photos. Restore previous versions if needed."
          />
        </Section>

        <Section title="Coming Soon">
          <FeatureItem 
            icon="🚁" 
            title="Drone Integration" 
            description="Connect DJI drones for aerial roof inspections. Automatic flight paths and damage detection."
          />
          <FeatureItem 
            icon="👥" 
            title="Team Collaboration" 
            description="Share claims with team members. Real-time collaboration with role-based permissions."
          />
          <FeatureItem 
            icon="📈" 
            title="Analytics Dashboard" 
            description="Track inspection metrics, claim processing times, and AI accuracy. Identify trends and optimize workflows."
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
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
  container: { 
    flex: 1, 
    backgroundColor: colors.bgSoft 
  },
  featureItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'flex-start',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 14,
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.core,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    color: '#5F6771',
    lineHeight: 18,
  },
});