import type { ChunkId } from '../../../shared/types.ts';

// In-memory tracking of which sockets are subscribed to which chunks
// For horizontal scaling, this would use Redis instead

export class ChunkService {
  // Map of chunk -> Set of socket IDs
  private chunkSubscribers = new Map<ChunkId, Set<string>>();

  // Map of socket ID -> Set of chunks
  private socketChunks = new Map<string, Set<ChunkId>>();

  subscribe(socketId: string, chunkId: ChunkId): void {
    // Add socket to chunk's subscribers
    if (!this.chunkSubscribers.has(chunkId)) {
      this.chunkSubscribers.set(chunkId, new Set());
    }
    this.chunkSubscribers.get(chunkId)!.add(socketId);

    // Track chunks for this socket
    if (!this.socketChunks.has(socketId)) {
      this.socketChunks.set(socketId, new Set());
    }
    this.socketChunks.get(socketId)!.add(chunkId);
  }

  unsubscribe(socketId: string, chunkId: ChunkId): void {
    // Remove socket from chunk's subscribers
    this.chunkSubscribers.get(chunkId)?.delete(socketId);
    if (this.chunkSubscribers.get(chunkId)?.size === 0) {
      this.chunkSubscribers.delete(chunkId);
    }

    // Update socket's chunk list
    this.socketChunks.get(socketId)?.delete(chunkId);
    if (this.socketChunks.get(socketId)?.size === 0) {
      this.socketChunks.delete(socketId);
    }
  }

  unsubscribeAll(socketId: string): void {
    const chunks = this.socketChunks.get(socketId);
    if (chunks) {
      for (const chunkId of chunks) {
        this.chunkSubscribers.get(chunkId)?.delete(socketId);
        if (this.chunkSubscribers.get(chunkId)?.size === 0) {
          this.chunkSubscribers.delete(chunkId);
        }
      }
    }
    this.socketChunks.delete(socketId);
  }

  getSubscribers(chunkId: ChunkId): string[] {
    return Array.from(this.chunkSubscribers.get(chunkId) ?? []);
  }

  getSubscribedChunks(socketId: string): ChunkId[] {
    return Array.from(this.socketChunks.get(socketId) ?? []);
  }

  getStats(): { totalChunks: number; totalSubscriptions: number } {
    let totalSubscriptions = 0;
    for (const subscribers of this.chunkSubscribers.values()) {
      totalSubscriptions += subscribers.size;
    }
    return {
      totalChunks: this.chunkSubscribers.size,
      totalSubscriptions,
    };
  }
}
