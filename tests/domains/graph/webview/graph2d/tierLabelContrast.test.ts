import { describe, expect, it } from 'vitest';
import {
  PRESET_TIER_LABEL_LUMINANCE_THRESHOLD,
  TIER_LABEL_LUMINANCE_THRESHOLD,
  pickContrastingTierLabelColor,
  tierLabelContrastingPair,
} from '@src/domains/graph/webview/graph2d/tierLabelContrast';

describe('pickContrastingTierLabelColor', () => {
  it('uses light text on very dark fills at default threshold', () => {
    expect(
      pickContrastingTierLabelColor('#111111', '#ffffff', '#000000', TIER_LABEL_LUMINANCE_THRESHOLD)
    ).toBe('#ffffff');
  });

  it('uses dark text on light fills at default threshold', () => {
    expect(
      pickContrastingTierLabelColor('#f5f5f5', '#ffffff', '#000000', TIER_LABEL_LUMINANCE_THRESHOLD)
    ).toBe('#000000');
  });

  it('keeps saturated locality/category fills on light inside text (default tier threshold)', () => {
    // Pink locality / similar mid-dark saturated fills stay below 0.55 → white for contrast
    expect(
      pickContrastingTierLabelColor('#EC4899', '#ffffff', '#000000', TIER_LABEL_LUMINANCE_THRESHOLD)
    ).toBe('#ffffff');
  });

  it('uses black inside preset purple at preset threshold, white at default tier threshold', () => {
    const presetPurple = '#A855F7';
    expect(
      pickContrastingTierLabelColor(presetPurple, '#ffffff', '#000000', TIER_LABEL_LUMINANCE_THRESHOLD)
    ).toBe('#ffffff');
    expect(
      pickContrastingTierLabelColor(
        presetPurple,
        '#ffffff',
        '#000000',
        PRESET_TIER_LABEL_LUMINANCE_THRESHOLD
      )
    ).toBe('#000000');
  });

  it('still uses white inside preset when the fill is very dark', () => {
    expect(
      pickContrastingTierLabelColor('#0a0a0a', '#ffffff', '#000000', PRESET_TIER_LABEL_LUMINANCE_THRESHOLD)
    ).toBe('#ffffff');
  });
});

describe('tierLabelContrastingPair', () => {
  it('uses opposite stroke when fill is light text', () => {
    expect(
      tierLabelContrastingPair('#111111', '#ffffff', '#000000', TIER_LABEL_LUMINANCE_THRESHOLD)
    ).toEqual({ fill: '#ffffff', stroke: '#000000' });
  });

  it('uses opposite stroke when fill is dark text', () => {
    expect(
      tierLabelContrastingPair('#f5f5f5', '#ffffff', '#000000', TIER_LABEL_LUMINANCE_THRESHOLD)
    ).toEqual({ fill: '#000000', stroke: '#ffffff' });
  });

  it('matches preset purple: black fill, white stroke', () => {
    expect(
      tierLabelContrastingPair(
        '#A855F7',
        '#ffffff',
        '#000000',
        PRESET_TIER_LABEL_LUMINANCE_THRESHOLD
      )
    ).toEqual({ fill: '#000000', stroke: '#ffffff' });
  });
});
