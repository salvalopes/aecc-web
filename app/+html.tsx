import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Overrides Expo Router's default web HTML shell.
 *
 * `viewport-fit=cover` is required for `env(safe-area-inset-*)` to resolve to
 * non-zero values on iOS — without it, react-native-safe-area-context always
 * reports zero insets on web, even inside a SafeAreaView.
 *
 * `100dvh` replaces the default `height:100%` so the root layout tracks
 * Safari's dynamic viewport as the address bar/keyboard show or hide,
 * instead of a stale height computed before they collapse — the classic
 * iOS Safari "can't scroll to the bottom of the page" bug.
 *
 * `overscroll-behavior: none` stops the page from rubber-banding, which is
 * what makes `position: fixed` overlays (React Native Web's Modal) jump or
 * momentarily disappear during touch scrolling on iOS Safari.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: iosViewportFix }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const iosViewportFix = `
html, body, #root {
  height: 100%;
  height: 100dvh;
}
html, body {
  overscroll-behavior: none;
}
`;
