import cron, { ScheduledTask } from 'node-cron';
import axios from 'axios';
import {
  BookingStatus,
  ChannelName,
  RoomStatus,
  SyncStatus,
} from '@hotel/shared';
import { prisma } from '../config/database';
import { acquireLock, deleteCachePattern, releaseLock } from '../config/redis';
import { toNumber } from '../utils/helpers';

export interface ChannelSyncResult {
  hotelId: string;
  channel: string;
  syncStatus: string;
  syncedRooms: number;
  lastSyncAt: Date;
  errorLog?: string | null;
}

const ALL_CHANNELS: ChannelName[] = [
  ChannelName.AGODA,
  ChannelName.BOOKING_COM,
  ChannelName.TRAVELOKA,
];

function getChannelApiKey(channel: string): string | undefined {
  switch (channel) {
    case ChannelName.AGODA:
      return process.env.AGODA_API_KEY;
    case ChannelName.BOOKING_COM:
      return process.env.BOOKING_COM_API_KEY;
    case ChannelName.TRAVELOKA:
      return process.env.TRAVELOKA_API_KEY;
    default:
      return undefined;
  }
}

export async function syncChannelForHotel(
  hotelId: string,
  channel?: ChannelName | string
): Promise<ChannelSyncResult[]> {
  const lockKey = `channel-sync:${hotelId}:${channel || 'ALL'}`;
  const locked = await acquireLock(lockKey, 15000);
  if (!locked) {
    return [];
  }

  try {
    const existingSyncs = await prisma.channelSync.findMany({
      where: {
        hotelId,
        ...(channel ? { channel } : {}),
      },
    });

    const targetChannels = channel
      ? [channel]
      : existingSyncs.length > 0
        ? existingSyncs.filter((c) => c.isEnabled).map((c) => c.channel)
        : ALL_CHANNELS;

    const roomTypes = await prisma.roomType.findMany({
      where: { hotelId },
      include: {
        rooms: {
          include: {
            bookings: {
              where: {
                status: {
                  in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.PENDING],
                },
                checkOut: { gte: new Date() },
              },
            },
          },
        },
      },
    });

    const totalRooms = roomTypes.reduce((acc, rt) => acc + rt.rooms.length, 0);
    const inventoryPayload = roomTypes.map((rt) => {
      const availableCount = rt.rooms.filter(
        (r) => r.status === RoomStatus.EMPTY && r.bookings.length === 0
      ).length;
      return {
        roomTypeCode: rt.code,
        roomTypeName: rt.name,
        availableRooms: availableCount,
        baseRateDaily: toNumber(rt.baseRateDaily),
        weekendRate: toNumber(rt.weekendRate),
      };
    });

    const results: ChannelSyncResult[] = [];

    for (const ch of targetChannels) {
      const apiKey = getChannelApiKey(ch);
      let syncStatus: string = SyncStatus.SUCCESS;
      let errorLog: string | null = null;

      if (apiKey && process.env[`${ch}_SYNC_ENDPOINT`]) {
        try {
          await axios.post(
            String(process.env[`${ch}_SYNC_ENDPOINT`]),
            {
              hotelId,
              channel: ch,
              inventory: inventoryPayload,
              syncedAt: new Date().toISOString(),
            },
            {
              headers: { 'X-Api-Key': apiKey },
              timeout: 5000,
            }
          );
        } catch (err) {
          syncStatus = SyncStatus.FAILED;
          errorLog = (err as Error).message;
        }
      }

      const now = new Date();
      const masked = apiKey ? `${apiKey.slice(0, 4)}****${apiKey.slice(-2)}` : 'SANDBOX-MODE';

      const record = await prisma.channelSync.upsert({
        where: {
          hotelId_channel: {
            hotelId,
            channel: ch,
          },
        },
        update: {
          lastSyncAt: now,
          syncStatus,
          syncedRooms: totalRooms,
          errorLog,
          apiKeyMasked: masked,
        },
        create: {
          hotelId,
          channel: ch,
          isEnabled: true,
          lastSyncAt: now,
          syncStatus,
          syncedRooms: totalRooms,
          errorLog,
          apiKeyMasked: masked,
        },
      });

      results.push({
        hotelId: record.hotelId,
        channel: record.channel,
        syncStatus: record.syncStatus,
        syncedRooms: record.syncedRooms,
        lastSyncAt: record.lastSyncAt || now,
        errorLog: record.errorLog,
      });
    }

    await deleteCachePattern(`room-map:${hotelId}*`);
    return results;
  } finally {
    await releaseLock(lockKey);
  }
}

export async function runAllHotelsSync(): Promise<ChannelSyncResult[]> {
  const hotels = await prisma.hotel.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  const allResults: ChannelSyncResult[] = [];
  for (const hotel of hotels) {
    const res = await syncChannelForHotel(hotel.id);
    allResults.push(...res);
  }
  return allResults;
}

export function startSyncCron(): ScheduledTask {
  const task = cron.schedule('*/5 * * * *', async () => {
    try {
      const results = await runAllHotelsSync();
      console.info(`[ChannelSync] Synced ${results.length} channel entries`);
    } catch (err) {
      console.error('[ChannelSync] Cron sync failed:', (err as Error).message);
    }
  });
  return task;
}

if (require.main === module) {
  runAllHotelsSync()
    .then((results) => {
      console.info('[ChannelSync] Manual run completed:', results.length, 'channels synced.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[ChannelSync] Manual run failed:', err);
      process.exit(1);
    });
}
