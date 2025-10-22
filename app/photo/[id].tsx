import { View, Text, StyleSheet, Image, ActivityIndicator, ScrollView, SafeAreaView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { getMediaById } from '@/services/media';
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
    status: 'pending' | 'annotated' | 'failed';
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
            <ScrollView style={styles.container}>
                <Stack.Screen options={{ title: 'Photo Details' }} />
                <Image source={{ uri: media.public_url }} style={styles.image} />
            
            {media.status === 'annotated' && media.annotations ? (
                <AnnotationDisplay annotation={media.annotations} />
            ) : media.status === 'pending' ? (
                 <View style={styles.pendingContainer}>
                    <ActivityIndicator />
                    <Text style={styles.pendingText}>AI analysis in progress...</Text>
                </View>
            ) : (
                <View style={styles.pendingContainer}>
                    <Text style={styles.pendingText}>AI analysis failed or not available.</Text>
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
    image: {
        width: '100%',
        height: 400,
        resizeMode: 'cover',
    },
    annotationContainer: {
        padding: 20,
    },
    header: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 10,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    detailsRow: {
        marginBottom: 12,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textSoft,
        flex: 1,
    },
    value: {
        fontSize: 16,
        color: colors.text,
        flex: 2,
        textAlign: 'right',
    },
    pendingContainer:{
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pendingText: {
        marginTop: 10,
        fontSize: 16,
        color: colors.textSoft,
    }
});