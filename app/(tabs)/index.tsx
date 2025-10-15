import { Image } from "expo-image";
import { StyleSheet } from "react-native";

import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={
        <Image
          source={require("@/.assets/images/app-icon.png")}
          style={styles.appLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">ClaimsiQ Sidekick</ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Welcome to ClaimsiQ Sidekick</ThemedText>
        <ThemedText>
          Your intelligent assistant for streamlining claims processing and management.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Quick Start</ThemedText>
        <ThemedText>
          Navigate through the tabs below to capture photos, view claims, and manage your workflow.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Key Features</ThemedText>
        <ThemedText>
          • Capture and annotate photos for claims{"\n"}
          • View and manage your claims list{"\n"}
          • Access today's activities{"\n"}
          • View location-based claim information
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  appLogo: {
    height: 200,
    width: 200,
    bottom: 20,
    left: 50,
    position: "absolute",
  },
});
