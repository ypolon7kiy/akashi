import { describe, expect, it } from 'vitest';
import { parseCssColorToRgb, relativeLuminanceRgb } from '../../../shared/colors/cssColorParse';

describe('parseCssColorToRgb', () => {
  it('parses 6-digit hex', () => {
    expect(parseCssColorToRgb('#aB12ef')).toEqual({ r: 171, g: 18, b: 239 });
  });

  it('parses 3-digit hex', () => {
    expect(parseCssColorToRgb('#abc')).toEqual({ r: 170, g: 187, b: 204 });
  });

  it('parses 8-digit hex using RGB only', () => {
    expect(parseCssColorToRgb('#11223344')).toEqual({ r: 17, g: 34, b: 51 });
  });

  it('rejects invalid hex digits', () => {
    expect(parseCssColorToRgb('#gg0000')).toBeNull();
    expect(parseCssColorToRgb('#12')).toBeNull();
  });

  it('parses rgb and rgba', () => {
    expect(parseCssColorToRgb('rgb(1, 2, 3)')).toEqual({ r: 1, g: 2, b: 3 });
    expect(parseCssColorToRgb('rgba(10, 20, 30, 0.5)')).toEqual({ r: 10, g: 20, b: 30 });
    expect(parseCssColorToRgb('RGB(0%, 100%, 50%)')).toEqual({ r: 0, g: 255, b: 128 });
  });

  it('rejects non-finite rgb channels', () => {
    expect(parseCssColorToRgb('rgb(1, NaN, 3)')).toBeNull();
    expect(parseCssColorToRgb('rgb(1, bogus, 3)')).toBeNull();
  });

  it('rejects hsl and bare words', () => {
    expect(parseCssColorToRgb('hsl(0,0%,50%)')).toBeNull();
    expect(parseCssColorToRgb('red')).toBeNull();
  });
});

describe('relativeLuminanceRgb', () => {
  it('is ~0 for black and ~1 for white', () => {
    expect(relativeLuminanceRgb({ r: 0, g: 0, b: 0 })).toBeLessThan(0.01);
    expect(relativeLuminanceRgb({ r: 255, g: 255, b: 255 })).toBeGreaterThan(0.99);
  });
});
