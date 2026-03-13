/**
 * Example webview → extension host message types.
 * Single source of truth for the example webview and ExamplePanel.
 */

export const ExampleMessageType = {
  ButtonClicked: 'buttonClicked',
} as const;

export type ExampleMessageKind = (typeof ExampleMessageType)[keyof typeof ExampleMessageType];
