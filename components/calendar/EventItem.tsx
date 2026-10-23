import { Colors, Fonts } from "@/constants/colors";
import { useEvents } from "@/contexts/events-context";
import { CalendarEvent } from "@/types/event";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

type EventItemProps = {
  event: CalendarEvent;
};

export default function EventItem({ event }: EventItemProps) {
  const { deleteEvent } = useEvents();
  const [confirmVisible, setConfirmVisible] = useState(false);

  const handleConfirmDelete = () => {
    setConfirmVisible(false);
    deleteEvent(event.id);
  };

  return (
    <>
      <Pressable style={styles.chip} onPress={() => setConfirmVisible(true)}>
        <Text style={styles.chipTime}>{event.time}</Text>
        <Text style={styles.chipTitle} numberOfLines={1}>
          {event.title}
        </Text>
      </Pressable>

      <Modal
        transparent
        animationType="fade"
        visible={confirmVisible}
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalText}>Deseja deletar {event.title}?</Text>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setConfirmVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>

              <Pressable style={styles.modalDeleteButton} onPress={handleConfirmDelete}>
                <Text style={styles.modalDeleteText}>Deletar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${Colors.primary}37`,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 4,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  chipTime: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 10,
  },
  chipTitle: {
    color: Colors.text,
    fontFamily: Fonts.book,
    fontSize: 10,
    flexShrink: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#000000B0",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  modalCard: {
    width: "100%",
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: `${Colors.primary}4D`,
    borderRadius: 12,
    padding: 20,
  },
  modalText: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalCancelText: {
    color: Colors.text,
    fontFamily: Fonts.book,
    fontSize: 14,
  },
  modalDeleteButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  modalDeleteText: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
});
