import { useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList } from "react-native";
import Header from "../../components/Header";
import { colors } from "../../theme/colors";

type MediaItem = { id: string; type: "photo"|"lidar_room"; status: "pending"|"annotating"|"done"; label?: string; annoCount?: number; };

const MOCK: MediaItem[] = [
  { id: "p1", type: "photo", status: "annotating", annoCount: 0, label: "Roof" },
  { id: "p2", type: "photo", status: "done", annoCount: 3, label: "Ceiling" },
  { id: "r1", type: "lidar_room", status: "done", label: "Kitchen" }
];

export default function CaptureScreen() {
  const [mode, setMode] = useState<"capture"|"gallery">("capture");

  return (
    <View style={styles.container}>
      <Header title="Capture" subtitle="Photo • LiDAR • Documents" />
      <View style={styles.segment}>
        <Pressable onPress={() => setMode("capture")} style={[styles.segBtn, mode==="capture" && styles.segActive]}><Text style={[styles.segText, mode==="capture" && styles.segTextActive]}>Capture</Text></Pressable>
        <Pressable onPress={() => setMode("gallery")} style={[styles.segBtn, mode==="gallery" && styles.segActive]}><Text style={[styles.segText, mode==="gallery" && styles.segTextActive]}>Gallery</Text></Pressable>
      </View>

      {mode === "capture" ? (
        <View style={styles.grid}>
          <Pressable style={[styles.tile, styles.a]}><Text style={styles.tileH}>Photo</Text><Text style={styles.tileP}>Open camera, auto-annotate</Text></Pressable>
          <Pressable style={[styles.tile, styles.b]}><Text style={styles.tileH}>LiDAR</Text><Text style={styles.tileP}>RoomPlan scan + measurements</Text></Pressable>
          <Pressable style={[styles.tile, styles.c]}><Text style={styles.tileH}>Document</Text><Text style={styles.tileP}>Upload PDF → FNOL</Text></Pressable>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.gallery}
          numColumns={2}
          data={MOCK}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={[styles.thumb, item.type==="lidar_room" && { backgroundColor: colors.bgAlt }]} />
              <View style={styles.row}>
                <Text style={styles.label}>{item.label ?? (item.type==="photo" ? "Photo" : "Room")}</Text>
                <View style={[styles.badge, item.status!=="done" && { backgroundColor: colors.sand }]}>
                  <Text style={styles.badgeText}>
                    {item.type==="photo" ? (item.annoCount ?? 0) + " • " : ""}
                    {item.status}
                  </Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgSoft },
  segment: { flexDirection: "row", backgroundColor: colors.white, marginHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
  segBtn: { flex: 1, paddingVertical: 10, alignItems: "center" },
  segActive: { backgroundColor: colors.primary + "22" },
  segText: { color: colors.core, fontWeight: "600" },
  segTextActive: { color: colors.primary },
  grid: { padding: 16, gap: 12 },
  tile: { borderRadius: 18, padding: 18, height: 120, justifyContent: "flex-end" },
  tileH: { color: colors.white, fontWeight: "700", fontSize: 18 },
  tileP: { color: colors.white, opacity: 0.9, marginTop: 2 },
  a: { backgroundColor: colors.primary },
  b: { backgroundColor: colors.secondary },
  c: { backgroundColor: colors.gold },
  gallery: { padding: 12, gap: 12 },
  card: { backgroundColor: colors.white, borderRadius: 14, padding: 8, margin: 6, flex: 1, borderWidth: 1, borderColor: colors.line },
  thumb: { height: 120, backgroundColor: "#D8DCE5", borderRadius: 8, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: colors.core, fontWeight: "600" },
  badge: { backgroundColor: colors.light, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: colors.core, fontSize: 12, fontWeight: "700" }
});
