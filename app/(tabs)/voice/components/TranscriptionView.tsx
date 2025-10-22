
import React, { useRef, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { TranscriptEntry, TranscriptSpeaker } from '../types';
import { colors } from '@/theme/colors';

interface TranscriptionViewProps {
  transcripts: TranscriptEntry[];
  currentUserTranscript: string;
  currentAgentTranscript: string;
}

const TranscriptMessage: React.FC<{ entry: TranscriptEntry }> = ({ entry }) => {
  const isUser = entry.speaker === TranscriptSpeaker.User;
  const containerStyle = isUser ? styles.userMessageContainer : styles.agentMessageContainer;
  const textStyle = isUser ? styles.userMessageText : styles.agentMessageText;
  const bubbleStyle = isUser ? styles.userMessageBubble : styles.agentMessageBubble;

  return (
    <View style={[styles.messageContainer, containerStyle]}>
      <View style={[styles.messageBubble, bubbleStyle]}>
        <Text style={textStyle}>{entry.text}</Text>
      </View>
    </View>
  );
};

export const TranscriptionView: React.FC<TranscriptionViewProps> = ({
  transcripts,
  currentUserTranscript,
  currentAgentTranscript,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [transcripts, currentUserTranscript, currentAgentTranscript]);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {transcripts.map((entry, index) => (
        <TranscriptMessage key={index} entry={entry} />
      ))}
      {currentUserTranscript ? (
        <TranscriptMessage entry={{ speaker: TranscriptSpeaker.User, text: currentUserTranscript }} />
      ) : null}
      {currentAgentTranscript ? (
        <TranscriptMessage entry={{ speaker: TranscriptSpeaker.Agent, text: currentAgentTranscript }} />
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 10,
  },
  messageContainer: {
    marginVertical: 5,
    marginHorizontal: 10,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  agentMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 15,
  },
  userMessageBubble: {
    backgroundColor: colors.primary,
  },
  agentMessageBubble: {
    backgroundColor: colors.light,
  },
  userMessageText: {
    color: colors.white,
  },
  agentMessageText: {
    color: colors.text,
  },
});
