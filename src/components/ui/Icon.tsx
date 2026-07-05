import Svg, { Path, Circle, Rect } from 'react-native-svg';

// Lucide icons (ISC license, https://lucide.dev) — copied verbatim as SVG
// path data. Single registry so every icon in the app reads from one place.
export type IconName =
  | 'building-2'
  | 'shopping-bag'
  | 'folder'
  | 'user'
  | 'shield'
  | 'x'
  | 'chevron-left'
  | 'chevron-right'
  | 'star'
  | 'check'
  | 'triangle-alert'
  | 'pencil'
  | 'trash-2'
  | 'image'
  | 'search';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 2 }: IconProps) {
  const common = {
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'building-2' && (
        <>
          <Path d="M10 12h4" {...common} />
          <Path d="M10 8h4" {...common} />
          <Path d="M14 21v-3a2 2 0 0 0-4 0v3" {...common} />
          <Path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2" {...common} />
          <Path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" {...common} />
        </>
      )}
      {name === 'shopping-bag' && (
        <>
          <Path d="M16 10a4 4 0 0 1-8 0" {...common} />
          <Path d="M3.103 6.034h17.794" {...common} />
          <Path
            d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"
            {...common}
          />
        </>
      )}
      {name === 'folder' && (
        <Path
          d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
          {...common}
        />
      )}
      {name === 'user' && (
        <>
          <Path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" {...common} />
          <Circle cx="12" cy="7" r="4" {...common} />
        </>
      )}
      {name === 'shield' && (
        <Path
          d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
          {...common}
        />
      )}
      {name === 'x' && (
        <>
          <Path d="M18 6 6 18" {...common} />
          <Path d="m6 6 12 12" {...common} />
        </>
      )}
      {name === 'chevron-left' && <Path d="m15 18-6-6 6-6" {...common} />}
      {name === 'chevron-right' && <Path d="m9 18 6-6-6-6" {...common} />}
      {name === 'star' && (
        <Path
          d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"
          {...common}
        />
      )}
      {name === 'check' && <Path d="M20 6 9 17l-5-5" {...common} />}
      {name === 'triangle-alert' && (
        <>
          <Path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" {...common} />
          <Path d="M12 9v4" {...common} />
          <Path d="M12 17h.01" {...common} />
        </>
      )}
      {name === 'pencil' && (
        <>
          <Path
            d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
            {...common}
          />
          <Path d="m15 5 4 4" {...common} />
        </>
      )}
      {name === 'trash-2' && (
        <>
          <Path d="M10 11v6" {...common} />
          <Path d="M14 11v6" {...common} />
          <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" {...common} />
          <Path d="M3 6h18" {...common} />
          <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" {...common} />
        </>
      )}
      {name === 'image' && (
        <>
          <Rect width="18" height="18" x="3" y="3" rx="2" ry="2" {...common} />
          <Circle cx="9" cy="9" r="2" {...common} />
          <Path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" {...common} />
        </>
      )}
      {name === 'search' && (
        <>
          <Path d="m21 21-4.34-4.34" {...common} />
          <Circle cx="11" cy="11" r="8" {...common} />
        </>
      )}
    </Svg>
  );
}
