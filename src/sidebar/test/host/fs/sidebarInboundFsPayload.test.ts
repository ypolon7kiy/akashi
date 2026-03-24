import { describe, expect, it } from 'vitest';
import { SidebarMessageType } from '../../../bridge/messages';
import {
  parseInboundSourcesFsCreateFile,
  parseInboundSourcesFsDelete,
  parseInboundSourcesFsRename,
} from '../../../host/fs/sidebarInboundFsPayload';

describe('parseInboundSourcesFsRename', () => {
  it('accepts valid payload', () => {
    const p = parseInboundSourcesFsRename({
      type: SidebarMessageType.SourcesFsRename,
      requestId: 'r1',
      payload: { fromPath: '/a/x', toPath: '/a/y' },
    });
    expect(p).toEqual({ fromPath: '/a/x', toPath: '/a/y', confirmDragAndDrop: false });
  });

  it('reads confirmDragAndDrop when true', () => {
    const p = parseInboundSourcesFsRename({
      type: SidebarMessageType.SourcesFsRename,
      requestId: 'r1',
      payload: { fromPath: '/a', toPath: '/b', confirmDragAndDrop: true },
    });
    expect(p?.confirmDragAndDrop).toBe(true);
  });

  it('rejects wrong type', () => {
    expect(
      parseInboundSourcesFsRename({
        type: SidebarMessageType.SourcesFsDelete,
        requestId: 'r1',
        payload: { fromPath: '/a', toPath: '/b' },
      })
    ).toBeNull();
  });

  it('rejects empty paths', () => {
    expect(
      parseInboundSourcesFsRename({
        type: SidebarMessageType.SourcesFsRename,
        requestId: 'r1',
        payload: { fromPath: '', toPath: '/b' },
      })
    ).toBeNull();
    expect(
      parseInboundSourcesFsRename({
        type: SidebarMessageType.SourcesFsRename,
        requestId: 'r1',
        payload: { fromPath: '/a', toPath: 1 },
      })
    ).toBeNull();
  });

  it('rejects non-object message', () => {
    expect(parseInboundSourcesFsRename(null)).toBeNull();
    expect(parseInboundSourcesFsRename('x')).toBeNull();
  });
});

describe('parseInboundSourcesFsDelete', () => {
  it('accepts valid payload', () => {
    const p = parseInboundSourcesFsDelete({
      type: SidebarMessageType.SourcesFsDelete,
      requestId: 'r1',
      payload: { path: '/a/b', isDirectory: true },
    });
    expect(p).toEqual({ path: '/a/b', isDirectory: true });
  });

  it('defaults isDirectory to false when not true', () => {
    const p = parseInboundSourcesFsDelete({
      type: SidebarMessageType.SourcesFsDelete,
      requestId: 'r1',
      payload: { path: '/a/b' },
    });
    expect(p).toEqual({ path: '/a/b', isDirectory: false });
  });

  it('rejects wrong type', () => {
    expect(
      parseInboundSourcesFsDelete({
        type: SidebarMessageType.SourcesFsRename,
        requestId: 'r1',
        payload: { path: '/a' },
      })
    ).toBeNull();
  });
});

describe('parseInboundSourcesFsCreateFile', () => {
  it('accepts valid payload', () => {
    const p = parseInboundSourcesFsCreateFile({
      type: SidebarMessageType.SourcesFsCreateFile,
      requestId: 'r1',
      payload: { parentPath: '/proj/src', fileName: 'foo.ts' },
    });
    expect(p).toEqual({ parentPath: '/proj/src', fileName: 'foo.ts' });
  });

  it('rejects wrong type', () => {
    expect(
      parseInboundSourcesFsCreateFile({
        type: SidebarMessageType.SourcesFsDelete,
        requestId: 'r1',
        payload: { parentPath: '/a', fileName: 'b' },
      })
    ).toBeNull();
  });

  it('rejects empty parentPath or fileName', () => {
    expect(
      parseInboundSourcesFsCreateFile({
        type: SidebarMessageType.SourcesFsCreateFile,
        requestId: 'r1',
        payload: { parentPath: '', fileName: 'x' },
      })
    ).toBeNull();
    expect(
      parseInboundSourcesFsCreateFile({
        type: SidebarMessageType.SourcesFsCreateFile,
        requestId: 'r1',
        payload: { parentPath: '/a', fileName: '' },
      })
    ).toBeNull();
  });

  it('rejects non-object message', () => {
    expect(parseInboundSourcesFsCreateFile(null)).toBeNull();
  });
});
