import { describe, it, expect } from 'vitest';
import { pbFileUrl, pbSrcSet, avatarImageProps } from './images.js';

describe('image utils', () => {
  it('builds file url with thumb', () => {
    const url = pbFileUrl('users','rec123','avatar.png',{ thumb: '64x64' });
    expect(url).toContain('thumb=64x64');
  });
  it('creates srcset', () => {
    const ss = pbSrcSet('users','rec123','avatar.png',[32,64],0);
    expect(ss.split(',').length).toBe(2);
  });
  it('avatar props returns empty for no avatar', () => {
    const props = avatarImageProps({ id:'u1', username:'user1' });
    expect(typeof props.src).toBe('string');
  });
});
