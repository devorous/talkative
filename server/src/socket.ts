import type { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { TextService } from './services/TextService.ts';
import { SessionService } from './services/SessionService.ts';
import { ChunkService } from './services/ChunkService.ts';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  CreateTextData,
  UpdateTextData,
  ChunkId,
  TextStyle,
} from '../../shared/types.ts';
import { CURSOR_COLORS, CHUNK_SIZE } from '../../shared/constants.ts';

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

// Map of socket.id -> session.id
const socketSessions = new Map<string, string>();
// Map of session.id -> color
const sessionColors = new Map<string, string>();
// Counter for assigning colors
let colorIndex = 0;

function getNextColor(): string {
  const color = CURSOR_COLORS[colorIndex % CURSOR_COLORS.length];
  colorIndex++;
  return color;
}

function getChunkIdFromPosition(x: number, y: number): ChunkId {
  const chunkX = Math.floor(x / CHUNK_SIZE);
  const chunkY = Math.floor(y / CHUNK_SIZE);
  return `${chunkX},${chunkY}`;
}

export function setupSocket(io: AppServer): void {
  const textService = new TextService();
  const sessionService = new SessionService();
  const chunkService = new ChunkService();

  io.on('connection', (socket: AppSocket) => {
    console.log(`Client connected: ${socket.id}`);

    // Assign or retrieve session
    const sessionId = uuidv4();
    const color = getNextColor();
    socketSessions.set(socket.id, sessionId);
    sessionColors.set(sessionId, color);
    sessionService.createOrUpdate(sessionId, socket.handshake.address);

    socket.emit('session:assigned', sessionId, color);

    // Handle chunk subscriptions
    socket.on('chunks:subscribe', async (chunks: ChunkId[]) => {
      // Join socket rooms for each chunk
      for (const chunk of chunks) {
        socket.join(`chunk:${chunk}`);
        chunkService.subscribe(socket.id, chunk);
      }

      // Send existing texts in these chunks
      const texts = await textService.getTextsInChunks(chunks);
      socket.emit('chunks:data', texts);
    });

    socket.on('chunks:unsubscribe', (chunks: ChunkId[]) => {
      for (const chunk of chunks) {
        socket.leave(`chunk:${chunk}`);
        chunkService.unsubscribe(socket.id, chunk);
      }
    });

    // Handle text creation
    socket.on('text:create', async (data: CreateTextData) => {
      const ownerId = socketSessions.get(socket.id);
      if (!ownerId) return;

      const text = await textService.create(ownerId, data);

      // Broadcast to all clients in the same chunk
      const chunkId: ChunkId = `${text.chunkX},${text.chunkY}`;
      io.to(`chunk:${chunkId}`).emit('text:created', text);
    });

    // Handle text updates
    socket.on('text:update', async (data: UpdateTextData) => {
      const ownerId = socketSessions.get(socket.id);
      if (!ownerId) return;

      const text = await textService.update(data.id, ownerId, data);
      if (!text) return;

      // Broadcast to all clients in the chunk
      const chunkId: ChunkId = `${text.chunkX},${text.chunkY}`;
      io.to(`chunk:${chunkId}`).emit('text:updated', text);
    });

    // Handle text deletion
    socket.on('text:delete', async ({ id }) => {
      const ownerId = socketSessions.get(socket.id);
      if (!ownerId) return;

      const text = await textService.delete(id, ownerId);
      if (!text) return;

      // Broadcast to all clients in the chunk
      const chunkId: ChunkId = `${text.chunkX},${text.chunkY}`;
      io.to(`chunk:${chunkId}`).emit('text:deleted', { id });
    });

    // Handle cursor move
    socket.on('cursor:move', (data: { x: number; y: number }) => {
      const sessionId = socketSessions.get(socket.id);
      if (!sessionId) return;

      const color = sessionColors.get(sessionId) ?? '#888888';
      const chunkId = getChunkIdFromPosition(data.x, data.y);

      // Broadcast to all clients in the same chunk (except sender)
      socket.to(`chunk:${chunkId}`).emit('cursor:moved', {
        sessionId,
        x: data.x,
        y: data.y,
        color,
      });
    });

    // Handle cursor typing
    socket.on('cursor:typing', (data: { x: number; y: number; content: string; style: TextStyle }) => {
      const sessionId = socketSessions.get(socket.id);
      if (!sessionId) return;

      const chunkId = getChunkIdFromPosition(data.x, data.y);

      // Broadcast to all clients in the same chunk (except sender)
      socket.to(`chunk:${chunkId}`).emit('cursor:typed', {
        sessionId,
        x: data.x,
        y: data.y,
        content: data.content,
        style: data.style,
      });
    });

    // Handle cursor commit (finalize text)
    socket.on('cursor:commit', async (data: CreateTextData) => {
      const ownerId = socketSessions.get(socket.id);
      if (!ownerId) return;

      // Only create if there's actual content
      if (!data.content.trim()) return;

      const text = await textService.create(ownerId, data);

      // Broadcast to all clients in the same chunk
      const chunkId: ChunkId = `${text.chunkX},${text.chunkY}`;
      io.to(`chunk:${chunkId}`).emit('text:created', text);

      // Also broadcast cursor stopped so other clients clear the preview
      socket.to(`chunk:${chunkId}`).emit('cursor:stopped', { sessionId: ownerId });
    });

    // Handle cursor stop
    socket.on('cursor:stop', () => {
      const sessionId = socketSessions.get(socket.id);
      if (!sessionId) return;

      // Broadcast to all subscribed chunks
      const chunks = chunkService.getSubscribedChunks(socket.id);
      for (const chunkId of chunks) {
        socket.to(`chunk:${chunkId}`).emit('cursor:stopped', { sessionId });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      const sessionId = socketSessions.get(socket.id);

      // Notify other clients that this cursor is gone
      if (sessionId) {
        const chunks = chunkService.getSubscribedChunks(socket.id);
        for (const chunkId of chunks) {
          socket.to(`chunk:${chunkId}`).emit('cursor:stopped', { sessionId });
        }
        sessionColors.delete(sessionId);
      }

      chunkService.unsubscribeAll(socket.id);
      socketSessions.delete(socket.id);
    });
  });
}
