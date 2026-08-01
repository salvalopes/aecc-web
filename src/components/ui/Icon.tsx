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
  | 'search'
  | 'utensils'
  | 'cake'
  | 'wrench'
  | 'shirt'
  | 'plane'
  | 'hard-hat'
  | 'scissors'
  | 'shopping-basket'
  | 'cross'
  | 'house'
  | 'briefcase'
  | 'layout-grid';

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
      {name === 'utensils' && (
        <>
          <Path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" {...common} />
          <Path d="M7 2v20" {...common} />
          <Path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" {...common} />
        </>
      )}
      {name === 'cake' && (
        <>
          <Path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" {...common} />
          <Path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" {...common} />
          <Path d="M2 21h20" {...common} />
          <Path d="M7 8v3" {...common} />
          <Path d="M12 8v3" {...common} />
          <Path d="M17 8v3" {...common} />
          <Path d="M7 4h.01" {...common} />
          <Path d="M12 4h.01" {...common} />
          <Path d="M17 4h.01" {...common} />
        </>
      )}
      {name === 'wrench' && (
        <Path
          d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"
          {...common}
        />
      )}
      {name === 'shirt' && (
        <Path
          d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"
          {...common}
        />
      )}
      {name === 'plane' && (
        <Path
          d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"
          {...common}
        />
      )}
      {name === 'hard-hat' && (
        <>
          <Path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" {...common} />
          <Path d="M14 6a6 6 0 0 1 6 6v3" {...common} />
          <Path d="M4 15v-3a6 6 0 0 1 6-6" {...common} />
          <Rect x="2" y="15" width="20" height="4" rx="1" {...common} />
        </>
      )}
      {name === 'scissors' && (
        <>
          <Circle cx="6" cy="6" r="3" {...common} />
          <Path d="M8.12 8.12 12 12" {...common} />
          <Path d="M20 4 8.12 15.88" {...common} />
          <Circle cx="6" cy="18" r="3" {...common} />
          <Path d="M14.8 14.8 20 20" {...common} />
        </>
      )}
      {name === 'shopping-basket' && (
        <>
          <Path d="m15 11-1 9" {...common} />
          <Path d="m19 11-4-7" {...common} />
          <Path d="M2 11h20" {...common} />
          <Path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4" {...common} />
          <Path d="M4.5 15.5h15" {...common} />
          <Path d="m5 11 4-7" {...common} />
          <Path d="m9 11 1 9" {...common} />
        </>
      )}
      {name === 'cross' && (
        <Path
          d="M4 9a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4a1 1 0 0 1 1 1v4a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-4a1 1 0 0 1 1-1h4a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-4a1 1 0 0 1-1-1V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4a1 1 0 0 1-1 1z"
          {...common}
        />
      )}
      {name === 'house' && (
        <>
          <Path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" {...common} />
          <Path
            d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
            {...common}
          />
        </>
      )}
      {name === 'briefcase' && (
        <>
          <Path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" {...common} />
          <Rect width="20" height="14" x="2" y="6" rx="2" {...common} />
        </>
      )}
      {name === 'layout-grid' && (
        <>
          <Rect width="7" height="7" x="3" y="3" rx="1" {...common} />
          <Rect width="7" height="7" x="14" y="3" rx="1" {...common} />
          <Rect width="7" height="7" x="14" y="14" rx="1" {...common} />
          <Rect width="7" height="7" x="3" y="14" rx="1" {...common} />
        </>
      )}
    </Svg>
  );
}
