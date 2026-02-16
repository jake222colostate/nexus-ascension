import { StyleSheet } from 'react-native';

export const hudStyles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  topWrap: { paddingHorizontal: 14, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  leftStack: { gap: 8, flex: 1 },
  rightStack: { gap: 8, alignItems: 'flex-end' },
  pill: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: 'rgba(12,17,28,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  pillText: { color: 'white', fontWeight: '800', fontSize: 12 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16 },
  joystickRing: { width: 106, height: 106, borderRadius: 53, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  joystick: { width: 78, height: 78, borderRadius: 39, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  shootBtn: { minWidth: 160, borderRadius: 22, paddingHorizontal: 20, paddingVertical: 20, backgroundColor: '#3f74ff', borderWidth: 1, borderColor: '#7ea0ff' },
  shootText: { color: 'white', fontWeight: '900', fontSize: 19, textAlign: 'center' },
});
