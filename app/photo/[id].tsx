import { View, Text, StyleSheet, Image, ActivityIndicator, ScrollView, SafeAreaView, Pressable, Dimensions } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { getMediaById, MediaStatus, AnnotationJSON, Detection } from '@/services/media';
import { colors } from '@/theme/colors';
import PhotoOverlay from '@/components/photoOverlay';

type MediaItem = {
    id: string;
    public_url: string;
    annotations: AnnotationJSON | null;
    status: MediaStatus;
    qc?: {
        blur_score?: number;
        glare?: boolean;
        underexposed?: boolean;
        distance_hint_m?: number;
    } | null;
};

const IMAGE_WIDTH = Dimensions.get('window').width;
const IMAGE_HEIGHT = 400;

const getSeverityColor = (severity?: string) => {
    switch (severity) {
        case 'severe': return colors.error;
        case 'moderate': return '#F57C00';
        case 'minor': return '#1976D2';
        default: return '#7B1FA2';
    }
};

const DetectionItem = ({ detection, index }: { detection: Detection; index: number }) => (
    <View style={styles.detectionCard}>
        <View style={styles.detectionHeader}>
            <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(detection.severity) }]}>
                <Text style={styles.severityText}>
                    {detection.severity?.toUpperCase() || 'UNKNOWN'}
                </Text>
            </View>
            <Text style={styles.detectionNumber}>#{index + 1}</Text>
        </View>

        <View style={styles.detectionBody}>
            <Text style={styles.detectionLabel}>{detection.friendly || detection.label}</Text>
            {detection.confidence !== undefined && (
                <Text style={styles.confidenceText}>
                    Confidence: {(detection.confidence * 100).toFixed(0)}%
                </Text>
            )}
            {detection.evidence && (
                <Text style={styles.evidenceText}>{detection.evidence}</Text>
            )}
            {detection.tags && detection.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                    {detection.tags.map((tag, i) => (
                        <View key={i} style={styles.tag}>
                            <Text style={styles.tagText}>{tag}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    </View>
);

const AnnotationDisplay = ({ annotation, qc }: { annotation: AnnotationJSON; qc?: any }) => {
    const detections = annotation.detections || [];
    const severeCounts = {
        severe: detections.filter(d => d.severity === 'severe').length,
        moderate: detections.filter(d => d.severity === 'moderate').length,
        minor: detections.filter(d => d.severity === 'minor').length,
    };

    return (
        <View style={styles.annotationContainer}>
            <Text style={styles.header}>AI Damage Analysis</Text>

            {/* Summary Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{detections.length}</Text>
                    <Text style={styles.statLabel}>Total Detections</Text>
                </View>
                {severeCounts.severe > 0 && (
                    <View style={[styles.statBox, { backgroundColor: '#FFEBEE' }]}>
                        <Text style={[styles.statNumber, { color: colors.error }]}>{severeCounts.severe}</Text>
                        <Text style={styles.statLabel}>Severe</Text>
                    </View>
                )}
                {severeCounts.moderate > 0 && (
                    <View style={[styles.statBox, { backgroundColor: '#FFF3E0' }]}>
                        <Text style={[styles.statNumber, { color: '#F57C00' }]}>{severeCounts.moderate}</Text>
                        <Text style={styles.statLabel}>Moderate</Text>
                    </View>
                )}
            </View>

            {/* Photo Quality */}
            {qc && (
                <View style={styles.qcContainer}>
                    <Text style={styles.qcTitle}>Photo Quality</Text>
                    <View style={styles.qcRow}>
                        {qc.blur_score !== undefined && (
                            <Text style={styles.qcText}>
                                Blur: {(qc.blur_score * 100).toFixed(0)}%
                            </Text>
                        )}
                        {qc.glare && <Text style={[styles.qcText, { color: colors.warning }]}>⚠ Glare detected</Text>}
                        {qc.underexposed && <Text style={[styles.qcText, { color: colors.warning }]}>⚠ Underexposed</Text>}
                        {qc.distance_hint_m && (
                            <Text style={styles.qcText}>
                                Distance: ~{qc.distance_hint_m.toFixed(1)}m
                            </Text>
                        )}
                    </View>
                </View>
            )}

            {/* Detections List */}
            <View style={styles.detectionsContainer}>
                <Text style={styles.sectionTitle}>Detected Issues ({detections.length})</Text>
                {detections.length === 0 ? (
                    <Text style={styles.noDetectionsText}>No damage detected</Text>
                ) : (
                    detections.map((det, idx) => (
                        <DetectionItem key={det.id || idx} detection={det} index={idx} />
                    ))
                )}
            </View>

            {/* Model Info */}
            {annotation.model && (
                <Text style={styles.modelInfo}>
                    Analyzed by {annotation.model.name} on {new Date(annotation.model.ts).toLocaleString()}
                </Text>
            )}
        </View>
    );
};

export default function PhotoDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [media, setMedia] = useState<MediaItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [showOverlay, setShowOverlay] = useState(true);

    useEffect(() => {
        if (typeof id !== 'string') return;

        const fetchMedia = async () => {
            try {
                setLoading(true);
                const mediaItem = await getMediaById(id);
                setMedia(mediaItem as MediaItem);
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

    const hasDetections = media.annotations?.detections && media.annotations.detections.length > 0;

    return (
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen options={{ title: 'Photo Details' }} />

            {/* Header with Back Button */}
            <View style={styles.headerBar}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Photo Details</Text>
                {hasDetections && (
                    <Pressable onPress={() => setShowOverlay(!showOverlay)} style={styles.toggleButton}>
                        <Text style={styles.toggleButtonText}>
                            {showOverlay ? '👁 Hide' : '👁 Show'}
                        </Text>
                    </Pressable>
                )}
                {!hasDetections && <View style={{ width: 60 }} />}
            </View>

            <ScrollView style={styles.container}>
                {/* Photo with Bounding Box Overlay */}
                <View style={styles.imageContainer}>
                    <Image source={{ uri: media.public_url }} style={styles.image} />
                    {hasDetections && (
                        <View style={styles.overlayContainer}>
                            <PhotoOverlay
                                detections={media.annotations!.detections}
                                width={IMAGE_WIDTH}
                                height={IMAGE_HEIGHT}
                                visible={showOverlay}
                            />
                        </View>
                    )}
                </View>

                {media.status === 'done' && media.annotations ? (
                    <AnnotationDisplay annotation={media.annotations} qc={media.qc} />
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
    toggleButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: colors.light,
        borderRadius: 8,
    },
    toggleButtonText: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.core,
    },
    imageContainer: {
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    overlayContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
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
    statsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    statBox: {
        flex: 1,
        padding: 12,
        backgroundColor: colors.light,
        borderRadius: 8,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.primary,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textLight,
        marginTop: 4,
    },
    qcContainer: {
        padding: 12,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        marginBottom: 16,
    },
    qcTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    qcRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    qcText: {
        fontSize: 12,
        color: colors.textLight,
    },
    detectionsContainer: {
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 12,
    },
    noDetectionsText: {
        textAlign: 'center',
        color: colors.textLight,
        paddingVertical: 24,
        fontStyle: 'italic',
    },
    detectionCard: {
        backgroundColor: colors.white,
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.line,
    },
    detectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    severityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    severityText: {
        color: colors.white,
        fontSize: 11,
        fontWeight: 'bold',
    },
    detectionNumber: {
        fontSize: 12,
        color: colors.textLight,
        fontWeight: '600',
    },
    detectionBody: {
        gap: 6,
    },
    detectionLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    confidenceText: {
        fontSize: 12,
        color: colors.textLight,
    },
    evidenceText: {
        fontSize: 13,
        color: colors.text,
        lineHeight: 18,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 4,
    },
    tag: {
        backgroundColor: colors.light,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    tagText: {
        fontSize: 11,
        color: colors.primary,
    },
    modelInfo: {
        fontSize: 11,
        color: colors.textLight,
        marginTop: 16,
        fontStyle: 'italic',
        textAlign: 'center',
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
