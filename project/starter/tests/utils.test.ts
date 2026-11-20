import { describe, it, expect, vi } from 'vitest';
import { withRetry, withTimeout, ErrorCodes, ReviewError } from '../src/utils/error-handler.js';
import { RateLimiter } from '../src/utils/rate-limiter.js';

describe('withRetry', () => {
  it('retries and succeeds', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue('ok');
    expect(await withRetry(fn, 3, 1)).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
  it('throws RETRY_EXHAUSTED', async () => {
    await expect(withRetry(() => Promise.reject(new Error('x')), 2, 1)).rejects.toMatchObject({
      code: ErrorCodes.RETRY_EXHAUSTED
    });
  });
});

describe('withTimeout', () => {
  it('times out', async () => {
    const p = withTimeout(() => new Promise(() => {}), 20);
    await expect(p).rejects.toBeInstanceOf(ReviewError);
    await expect(p).rejects.toMatchObject({ code: ErrorCodes.AGENT_TIMEOUT });
  });
  it('returns result', async () => {
    expect(await withTimeout(async () => 5, 100)).toBe(5);
  });
});

describe('RateLimiter', () => {
  it('enforces request and concurrency limits', async () => {
    const rl = new RateLimiter({ maxRequestsPerMinute: 2, maxConcurrent: 1, maxTokensPerMinute: 10000 });
    expect(rl.canProceed(10)).toBe(true);
    await rl.acquire(10);
    expect(rl.canProceed(10)).toBe(false); // concurrent limit
    rl.release();
    await rl.acquire(10);
    rl.release();
    expect(rl.canProceed(10)).toBe(false); // 2 requests in window
    expect(rl.getStatus().requestsInWindow).toBe(2);
  });
  it('queues beyond maxConcurrent', async () => {
    const rl = new RateLimiter({ maxConcurrent: 1 });
    await rl.acquire();
    let second = false;
    const p = rl.acquire().then(() => { second = true; });
    await new Promise(r => setTimeout(r, 10));
    expect(second).toBe(false);
    rl.release();
    await p;
    expect(second).toBe(true);
  });
});
