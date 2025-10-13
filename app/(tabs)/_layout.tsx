import { Tabs, Link } from "expo-router";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import TabBarIcon from "../../components/TabBarIcon";
import { colors } from "../../theme/colors";

function CaptureBump(props: any) {
  return (
    <Pressable {...props}>
      {({ pressed }) => (
        <View style={[styles.bump, pressed && { transform: [{ scale: 0.97 }] }]}>
          <TabBarIcon name="camera" color={colors.white} size={24} />
        </View>
      )}
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: "#9AA0A6",
        tabBarStyle: styles.tabbar,
        tabBarLabelStyle: { fontSize: 11 }
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: "Today",
          tabBarIcon: ({ color }) => <TabBarIcon name="calendar" color={color} />
        }}
      />
      <Tabs.Screen
        name="claims"
        options={{
          title: "Claims",
          tabBarIcon: ({ color }) => <TabBarIcon name="folder" color={color} />
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: "",
          tabBarIcon: () => null,
          tabBarButton: (props) => <CaptureBump {...props} />
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color }) => <TabBarIcon name="map" color={color} />
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <TabBarIcon name="gearshape" color={color} />
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabbar: {
    height: 64,
    paddingBottom: 10,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: colors.line,
    backgroundColor: colors.white
  },
  bump: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Platform.select({ ios: 24, android: 16 }),
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6
  }
});
