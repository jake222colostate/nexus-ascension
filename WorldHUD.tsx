import React from 'react';
import { Pressable, Text, View } from 'react-native';

type HudButton = {
  label: string;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  disabled?: boolean;
  flex?: number;
};

export default function WorldHUD(props: {
  title: string;
  subtitle?: string;
  rightLines?: string[];
  bottomButtons?: HudButton[];
}) {
  const { title, subtitle, rightLines = [], bottomButtons = [] } = props;

  return (
    <>
      <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>{title}</Text>
            {subtitle ? <Text style={{ color: '#cfcfcf', marginTop: 4, fontSize: 12 }}>{subtitle}</Text> : null}
          </View>

          {rightLines.length ? (
            <View style={{ alignItems: 'flex-end' }}>
              {rightLines.map((t, i) => (
                <Text key={i} style={{ color: '#fff', fontSize: 12, marginTop: i === 0 ? 2 : 2, fontWeight: '700' }}>
                  {t}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      {bottomButtons.length ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 14, right: 14, bottom: 18 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {bottomButtons.map((b, i) => (
              <Pressable
                key={i}
                disabled={!!b.disabled}
                onPress={b.onPress}
                onPressIn={b.onPressIn}
                onPressOut={b.onPressOut}
                style={{
                  flex: b.flex ?? 1,
                  backgroundColor: b.disabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)',
                  borderWidth: 1,
                  borderColor: b.disabled ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.18)',
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '900' }}>{b.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </>
  );
}
