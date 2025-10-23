import { View, Text, StyleSheet, Image, ActivityIndicator, ScrollView, SafeAreaView, Pressable } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { getMediaById, MediaStatus } from '@/services/media';
import { colors } from '@/theme/colors';

type Annotation = {
    summary: string;
    damage_type: string;
    materials: string[];
    estimated_severity: string;
    recommended_action: string;
    details: string;
};

type MediaItem = {
    id: string;
    public_url: string;
    annotations: Annotation | null;
    status: MediaStatus;
};

const AnnotationDisplay = ({ annotation }: { annotation: Annotation }) => (
    <View style={styles.annotationContainer}>
        <Text style={styles.header}>AI Analysis</Text>
        
        <View style={styles.infoRow}>
            <Text style={styles.label}>Summary</Text>
            <Text style={styles.value}>{annotation.summary}</Text>
        </View>

        <View style={styles.infoRow}>
            <Text style={styles.label}>Damage Type</Text>
            <Text style={styles.value}>{annotation.damage_type}</Text>
        </View>
        
        <View style={styles.infoRow}>
            <Text style={styles.label}>Severity</Text>
            <Text style={[styles.value, {color: annotation.estimated_severity === 'High' || annotation.estimated_severity === 'Critical' ? colors.error : colors.text}]}>{annotation.estimated_severity}</Text>
        </View>

        <View style={styles.infoRow}>
            <Text style={styles.label}>Materials</Text>
            <Text style={styles.value}>{annotation.materials.join(', ')}</Text>
        </View>
        
         <View style={styles.infoRow}>
            <Text style={styles.label}>Recommendation</Text>
            <Text style={styles.value}>{annotation.recommended_action}</Text>
        </View>
        
        <View style={styles.detailsRow}>
            <Text style={styles.label}>Observations</Text>
            <Text style={styles.value}>{annotation.details}</Text>
        </View>
    </View>
);


export default function PhotoDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [media, setMedia] = useState<MediaItem | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (typeof id !== 'string') return;

        const fetchMedia = async () => {
            try {
                setLoading(true);
                const mediaItem = await getMediaById(id);
                setMedia(mediaItem);
            } catch (error) {
                console.error("Failed to fetch media details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMedia();
    }, [id]);

    if (loading) {
        return <ActivityIndicator style={{ flex: 1 }} size="large" />;
    }

    if (!media) {
        return <View><Text>Photo not found.</Text></View>;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen options={{ title: 'Photo Details' }} />
            
            {/* Header with Back Button */}
            <View style={styles.headerBar}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Photo Details</Text>
                <View style={{ width: 60 }} />
            </View>
            
            <ScrollView style={styles.container}>
                <Image source={{ uri: media.public_url }} style={styles.image} />
            
            {media.status === 'done' && media.annotations ? (
                <AnnotationDisplay annotation={media.annotations} />
            ) : media.status === 'pending' || media.status === 'annotating' ? (
                 <View style={styles.pendingContainer}>
                    <ActivityIndicator />
                    <Text style={styles.pendingText}>AI analysis in progress...</Text>
                </View>
            ) : media.status === 'error' ? (
                <View style={styles.pendingContainer}>
                    <Text style={styles.pendingText}>AI analysis failed or not available.</Text>
                </View>
            ) : (
                <View style={styles.pendingContainer}>
                    <Text style={styles.pendingText}>AI analysis unavailable for this photo.</Text>
                </View>
            )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    container: {
        flex: 1,
        backgroundColor: colors.bg,
    },
    headerBar: {
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
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.core,
    },
    image: {
        width: '100%',
        height: 400,
        resizeMode: 'cover',
    },
    annotationContainer: {
        padding: 16,
        backgroundColor: colors.white,
    },
    header: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        color: colors.text,
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    detailsRow: {
        marginTop: 12,
    },
    label: {
        fontWeight: '600',
        width: 120,
        color: colors.text,
    },
    value: {
        flex: 1,
        color: colors.textLight,
    },
    pendingContainer: {
        padding: 20,
        alignItems: 'center',
    },
    pendingText: {
        marginTop: 10,
        color: colors.textLight,
    },
});