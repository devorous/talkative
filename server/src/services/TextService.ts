import { PrismaClient } from '@prisma/client';
import {
  CHUNK_SIZE,
  FADE_START_MS,
  EXPIRE_MS,
} from '../../../shared/constants.ts';
import type {
  TextObject,
  CreateTextData,
  UpdateTextData,
  ChunkId,
} from '../../../shared/types.ts';

const prisma = new PrismaClient();

export class TextService {
  async create(ownerId: string, data: CreateTextData): Promise<TextObject> {
    const now = Date.now();
    const chunkX = Math.floor(data.x / CHUNK_SIZE);
    const chunkY = Math.floor(data.y / CHUNK_SIZE);

    const text = await prisma.text.create({
      data: {
        ownerId,
        content: data.content,
        x: data.x,
        y: data.y,
        chunkX,
        chunkY,
        fontFamily: data.style.fontFamily,
        fontSize: data.style.fontSize,
        fontWeight: data.style.fontWeight,
        fontStyle: data.style.fontStyle,
        color: data.style.color,
        rotation: data.style.rotation,
        outlineWidth: data.style.outlineWidth,
        outlineColor: data.style.outlineColor,
        shadowOffsetX: data.style.shadowOffsetX,
        shadowOffsetY: data.style.shadowOffsetY,
        shadowBlur: data.style.shadowBlur,
        shadowColor: data.style.shadowColor,
        opacity: data.style.opacity,
        letterSpacing: data.style.letterSpacing,
        lineHeight: data.style.lineHeight,
        fadeStartAt: new Date(now + FADE_START_MS),
        expiresAt: new Date(now + EXPIRE_MS),
      },
    });

    return this.toTextObject(text);
  }

  async update(
    id: string,
    ownerId: string,
    data: UpdateTextData
  ): Promise<TextObject | null> {
    // Verify ownership
    const existing = await prisma.text.findUnique({ where: { id } });
    if (!existing || existing.ownerId !== ownerId || existing.deletedAt) {
      return null;
    }

    const updateData: Record<string, unknown> = {};

    if (data.content !== undefined) updateData.content = data.content;
    if (data.x !== undefined) {
      updateData.x = data.x;
      updateData.chunkX = Math.floor(data.x / CHUNK_SIZE);
    }
    if (data.y !== undefined) {
      updateData.y = data.y;
      updateData.chunkY = Math.floor(data.y / CHUNK_SIZE);
    }

    if (data.style) {
      if (data.style.fontFamily !== undefined)
        updateData.fontFamily = data.style.fontFamily;
      if (data.style.fontSize !== undefined)
        updateData.fontSize = data.style.fontSize;
      if (data.style.fontWeight !== undefined)
        updateData.fontWeight = data.style.fontWeight;
      if (data.style.fontStyle !== undefined)
        updateData.fontStyle = data.style.fontStyle;
      if (data.style.color !== undefined) updateData.color = data.style.color;
      if (data.style.rotation !== undefined)
        updateData.rotation = data.style.rotation;
      if (data.style.outlineWidth !== undefined)
        updateData.outlineWidth = data.style.outlineWidth;
      if (data.style.outlineColor !== undefined)
        updateData.outlineColor = data.style.outlineColor;
      if (data.style.shadowOffsetX !== undefined)
        updateData.shadowOffsetX = data.style.shadowOffsetX;
      if (data.style.shadowOffsetY !== undefined)
        updateData.shadowOffsetY = data.style.shadowOffsetY;
      if (data.style.shadowBlur !== undefined)
        updateData.shadowBlur = data.style.shadowBlur;
      if (data.style.shadowColor !== undefined)
        updateData.shadowColor = data.style.shadowColor;
      if (data.style.opacity !== undefined)
        updateData.opacity = data.style.opacity;
      if (data.style.letterSpacing !== undefined)
        updateData.letterSpacing = data.style.letterSpacing;
      if (data.style.lineHeight !== undefined)
        updateData.lineHeight = data.style.lineHeight;
    }

    const text = await prisma.text.update({
      where: { id },
      data: updateData,
    });

    return this.toTextObject(text);
  }

  async delete(id: string, ownerId: string): Promise<TextObject | null> {
    // Verify ownership
    const existing = await prisma.text.findUnique({ where: { id } });
    if (!existing || existing.ownerId !== ownerId || existing.deletedAt) {
      return null;
    }

    const text = await prisma.text.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return this.toTextObject(text);
  }

  async getTextsInChunks(chunks: ChunkId[]): Promise<TextObject[]> {
    const chunkCoords = chunks.map((chunk) => {
      const [x, y] = chunk.split(',').map(Number);
      return { x, y };
    });

    const texts = await prisma.text.findMany({
      where: {
        deletedAt: null,
        expiresAt: { gt: new Date() },
        OR: chunkCoords.map((c) => ({
          chunkX: c.x,
          chunkY: c.y,
        })),
      },
    });

    return texts.map((t) => this.toTextObject(t));
  }

  async cleanupExpired(): Promise<number> {
    const result = await prisma.text.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { deletedAt: { not: null } },
        ],
      },
    });
    return result.count;
  }

  private toTextObject(text: {
    id: string;
    ownerId: string;
    content: string;
    x: number;
    y: number;
    chunkX: number;
    chunkY: number;
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    fontStyle: string;
    color: string;
    rotation: number;
    outlineWidth: number;
    outlineColor: string;
    shadowOffsetX: number;
    shadowOffsetY: number;
    shadowBlur: number;
    shadowColor: string;
    opacity: number;
    letterSpacing: number;
    lineHeight: number;
    createdAt: Date;
    fadeStartAt: Date;
    expiresAt: Date;
  }): TextObject {
    return {
      id: text.id,
      ownerId: text.ownerId,
      content: text.content,
      x: text.x,
      y: text.y,
      chunkX: text.chunkX,
      chunkY: text.chunkY,
      fontFamily: text.fontFamily as TextObject['fontFamily'],
      fontSize: text.fontSize,
      fontWeight: text.fontWeight as 'normal' | 'bold',
      fontStyle: text.fontStyle as 'normal' | 'italic',
      color: text.color,
      rotation: text.rotation,
      outlineWidth: text.outlineWidth,
      outlineColor: text.outlineColor,
      shadowOffsetX: text.shadowOffsetX,
      shadowOffsetY: text.shadowOffsetY,
      shadowBlur: text.shadowBlur,
      shadowColor: text.shadowColor,
      opacity: text.opacity,
      letterSpacing: text.letterSpacing,
      lineHeight: text.lineHeight,
      createdAt: text.createdAt.getTime(),
      fadeStartAt: text.fadeStartAt.getTime(),
      expiresAt: text.expiresAt.getTime(),
    };
  }
}
