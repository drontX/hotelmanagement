import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { bookingsApi, housekeepingApi, roomsApi } from '@/services/api';
import {
  BookingSource,
  BookingStatus,
  BookingType,
  CleaningStatus,
  PaymentType,
  RoomStatus,
} from '@/types';
import type {
  Booking,
  HousekeepingTask,
  RealtimeNotification,
  Room,
  RoomType,
} from '@/types';

const SAMPLE_ROOM_TYPES: RoomType[] = [
  {
    id: 'rt-deluxe',
    name: 'Deluxe City View',
    code: 'DLX',
    baseRateDaily: 1500000,
    baseRateHourly: 350000,
    weekendRate: 1800000,
    holidayRate: 2100000,
    maxGuests: 2,
    bedType: '1 Giường King',
    area: 32,
  },
  {
    id: 'rt-executive',
    name: 'Executive Suite',
    code: 'EXC',
    baseRateDaily: 2600000,
    baseRateHourly: 550000,
    weekendRate: 3100000,
    holidayRate: 3600000,
    maxGuests: 3,
    bedType: '1 Giường King + Sofa',
    area: 48,
  },
  {
    id: 'rt-family',
    name: 'Family Connecting',
    code: 'FAM',
    baseRateDaily: 3200000,
    baseRateHourly: 650000,
    weekendRate: 3800000,
    holidayRate: 4400000,
    maxGuests: 4,
    bedType: '2 Giường Queen',
    area: 58,
  },
  {
    id: 'rt-presidential',
    name: 'Presidential River Suite',
    code: 'PRS',
    baseRateDaily: 6500000,
    baseRateHourly: 1200000,
    weekendRate: 7500000,
    holidayRate: 8800000,
    maxGuests: 4,
    bedType: '1 Giường Super King',
    area: 96,
  },
];

const SAMPLE_ROOMS: Room[] = [
  { id: 'r-101', roomNumber: '101', floor: 1, status: RoomStatus.OCCUPIED, roomTypeId: 'rt-deluxe', roomType: SAMPLE_ROOM_TYPES[0] },
  { id: 'r-102', roomNumber: '102', floor: 1, status: RoomStatus.EMPTY, roomTypeId: 'rt-deluxe', roomType: SAMPLE_ROOM_TYPES[0] },
  { id: 'r-103', roomNumber: '103', floor: 1, status: RoomStatus.CLEANING, roomTypeId: 'rt-deluxe', roomType: SAMPLE_ROOM_TYPES[0] },
  { id: 'r-104', roomNumber: '104', floor: 1, status: RoomStatus.EMPTY, roomTypeId: 'rt-executive', roomType: SAMPLE_ROOM_TYPES[1] },
  { id: 'r-201', roomNumber: '201', floor: 2, status: RoomStatus.OCCUPIED, roomTypeId: 'rt-executive', roomType: SAMPLE_ROOM_TYPES[1] },
  { id: 'r-202', roomNumber: '202', floor: 2, status: RoomStatus.EMPTY, roomTypeId: 'rt-deluxe', roomType: SAMPLE_ROOM_TYPES[0] },
  { id: 'r-203', roomNumber: '203', floor: 2, status: RoomStatus.MAINTENANCE, roomTypeId: 'rt-deluxe', roomType: SAMPLE_ROOM_TYPES[0], notes: 'Bảo trì điều hòa' },
  { id: 'r-204', roomNumber: '204', floor: 2, status: RoomStatus.OCCUPIED, roomTypeId: 'rt-family', roomType: SAMPLE_ROOM_TYPES[2] },
  { id: 'r-301', roomNumber: '301', floor: 3, status: RoomStatus.EMPTY, roomTypeId: 'rt-family', roomType: SAMPLE_ROOM_TYPES[2] },
  { id: 'r-302', roomNumber: '302', floor: 3, status: RoomStatus.CLEANING, roomTypeId: 'rt-executive', roomType: SAMPLE_ROOM_TYPES[1] },
  { id: 'r-303', roomNumber: '303', floor: 3, status: RoomStatus.OCCUPIED, roomTypeId: 'rt-presidential', roomType: SAMPLE_ROOM_TYPES[3] },
  { id: 'r-304', roomNumber: '304', floor: 3, status: RoomStatus.EMPTY, roomTypeId: 'rt-presidential', roomType: SAMPLE_ROOM_TYPES[3] },
];

const todayIso = new Date().toISOString().slice(0, 10);
const tomorrowIso = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const twoDaysIso = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);

const SAMPLE_BOOKINGS: Booking[] = [
  {
    id: 'bk-1001',
    bookingCode: 'GSH-2026-1001',
    roomId: 'r-101',
    room: SAMPLE_ROOMS[0],
    guestName: 'Nguyễn Hoàng Anh',
    guestPhone: '0912345678',
    guestEmail: 'hoanganh@example.com',
    guestIdCard: '079092001234',
    checkIn: `${todayIso}T14:00:00`,
    checkOut: `${tomorrowIso}T12:00:00`,
    guests: 2,
    childrenCount: 0,
    bookingType: BookingType.DAILY,
    status: BookingStatus.CHECKED_IN,
    source: BookingSource.WEBSITE,
    paymentType: PaymentType.FULL,
    roomCharge: 1500000,
    extraChargesTotal: 180000,
    vatAmount: 134400,
    totalAmount: 1814400,
    paidAmount: 1814400,
    createdAt: `${todayIso}T09:15:00`,
  },
  {
    id: 'bk-1002',
    bookingCode: 'GSH-2026-1002',
    roomId: 'r-201',
    room: SAMPLE_ROOMS[4],
    guestName: 'Sarah Jenkins',
    guestPhone: '+84 983112233',
    guestEmail: 'sarah.j@example.com',
    checkIn: `${todayIso}T14:00:00`,
    checkOut: `${twoDaysIso}T12:00:00`,
    guests: 2,
    childrenCount: 1,
    bookingType: BookingType.DAILY,
    status: BookingStatus.CHECKED_IN,
    source: BookingSource.BOOKING_COM,
    paymentType: PaymentType.DEPOSIT,
    roomCharge: 5200000,
    vatAmount: 416000,
    totalAmount: 5616000,
    depositAmount: 1684800,
    paidAmount: 1684800,
    createdAt: `${todayIso}T08:00:00`,
  },
  {
    id: 'bk-1003',
    bookingCode: 'GSH-2026-1003',
    roomId: 'r-104',
    room: SAMPLE_ROOMS[3],
    guestName: 'Trần Quốc Bảo',
    guestPhone: '0908776655',
    checkIn: `${todayIso}T15:00:00`,
    checkOut: `${tomorrowIso}T12:00:00`,
    guests: 2,
    childrenCount: 0,
    bookingType: BookingType.DAILY,
    status: BookingStatus.CONFIRMED,
    source: BookingSource.AGODA,
    paymentType: PaymentType.DEPOSIT,
    roomCharge: 2600000,
    vatAmount: 208000,
    totalAmount: 2808000,
    depositAmount: 842400,
    paidAmount: 842400,
    createdAt: `${todayIso}T10:30:00`,
  },
  {
    id: 'bk-1004',
    bookingCode: 'GSH-2026-1004',
    roomId: 'r-301',
    room: SAMPLE_ROOMS[8],
    guestName: 'Lê Minh Tuấn',
    guestPhone: '0933445566',
    checkIn: `${todayIso}T13:00:00`,
    checkOut: `${todayIso}T17:00:00`,
    guests: 2,
    childrenCount: 0,
    bookingType: BookingType.HOURLY,
    hours: 4,
    status: BookingStatus.PENDING,
    source: BookingSource.WALK_IN,
    paymentType: PaymentType.FULL,
    roomCharge: 1040000,
    vatAmount: 83200,
    totalAmount: 1123200,
    createdAt: `${todayIso}T12:40:00`,
  },
  {
    id: 'bk-1005',
    bookingCode: 'GSH-2026-1005',
    roomId: 'r-303',
    room: SAMPLE_ROOMS[10],
    guestName: 'Kenji Takahashi',
    guestPhone: '+81 9012349988',
    checkIn: `${todayIso}T14:00:00`,
    checkOut: `${twoDaysIso}T12:00:00`,
    guests: 2,
    childrenCount: 0,
    bookingType: BookingType.DAILY,
    status: BookingStatus.CHECKED_IN,
    source: BookingSource.TRAVELOKA,
    paymentType: PaymentType.FULL,
    roomCharge: 13000000,
    vatAmount: 1040000,
    totalAmount: 14040000,
    paidAmount: 14040000,
    createdAt: `${todayIso}T07:20:00`,
  },
];

const SAMPLE_TASKS: HousekeepingTask[] = [
  {
    id: 'hk-101',
    roomId: 'r-103',
    room: SAMPLE_ROOMS[2],
    status: CleaningStatus.PENDING,
    priority: 'HIGH',
    notes: 'Khách vừa trả phòng, kiểm tra minibar và thay ga giường.',
    createdAt: `${todayIso}T11:30:00`,
  },
  {
    id: 'hk-102',
    roomId: 'r-302',
    room: SAMPLE_ROOMS[9],
    status: CleaningStatus.IN_PROGRESS,
    priority: 'URGENT',
    notes: 'Chuẩn bị đón khách VIP lúc 15:00.',
    createdAt: `${todayIso}T12:00:00`,
  },
  {
    id: 'hk-103',
    roomId: 'r-102',
    room: SAMPLE_ROOMS[1],
    status: CleaningStatus.DONE,
    priority: 'NORMAL',
    notes: 'Đã vệ sinh và khử khuẩn hoàn tất.',
    completedAt: `${todayIso}T10:15:00`,
    createdAt: `${todayIso}T09:00:00`,
  },
];

interface HotelState {
  rooms: Room[];
  roomTypes: RoomType[];
  bookings: Booking[];
  housekeepingTasks: HousekeepingTask[];
  loadingRooms: boolean;
  loadingBookings: boolean;
  socket: Socket | null;
  socketConnected: boolean;
  notifications: RealtimeNotification[];
  fetchRooms: () => Promise<void>;
  fetchRoomTypes: () => Promise<void>;
  fetchBookings: () => Promise<void>;
  fetchHousekeepingTasks: () => Promise<void>;
  updateRoomStatus: (roomId: string, status: RoomStatus) => Promise<void>;
  addOrUpdateBookingLocal: (booking: Booking) => void;
  updateTaskLocal: (task: HousekeepingTask) => void;
  connectSocket: (token: string | null) => void;
  disconnectSocket: () => void;
  markAllNotificationsRead: () => void;
  pushNotification: (item: Omit<RealtimeNotification, 'id' | 'createdAt' | 'read'>) => void;
}

export const useHotelStore = create<HotelState>((set, get) => ({
  rooms: SAMPLE_ROOMS,
  roomTypes: SAMPLE_ROOM_TYPES,
  bookings: SAMPLE_BOOKINGS,
  housekeepingTasks: SAMPLE_TASKS,
  loadingRooms: false,
  loadingBookings: false,
  socket: null,
  socketConnected: false,
  notifications: [
    {
      id: 'init-notif-1',
      title: 'Hệ thống sẵn sàng',
      description: 'Bảng điều khiển Grand Saigon Hotel đã kết nối dữ liệu vận hành.',
      type: 'info',
      createdAt: new Date().toISOString(),
      read: false,
    },
  ],

  fetchRooms: async () => {
    set({ loadingRooms: true });
    try {
      const rooms = await roomsApi.list();
      if (Array.isArray(rooms) && rooms.length > 0) {
        set({ rooms });
      }
    } catch {
      // Keep fallback state when backend is unavailable
    } finally {
      set({ loadingRooms: false });
    }
  },

  fetchRoomTypes: async () => {
    try {
      const roomTypes = await roomsApi.listRoomTypes();
      if (Array.isArray(roomTypes) && roomTypes.length > 0) {
        set({ roomTypes });
      }
    } catch {
      // Fallback kept
    }
  },

  fetchBookings: async () => {
    set({ loadingBookings: true });
    try {
      const bookings = await bookingsApi.list();
      if (Array.isArray(bookings) && bookings.length > 0) {
        set({ bookings });
      }
    } catch {
      // Fallback kept
    } finally {
      set({ loadingBookings: false });
    }
  },

  fetchHousekeepingTasks: async () => {
    try {
      const tasks = await housekeepingApi.listTasks();
      if (Array.isArray(tasks) && tasks.length > 0) {
        set({ housekeepingTasks: tasks });
      }
    } catch {
      // Fallback kept
    }
  },

  updateRoomStatus: async (roomId: string, status: RoomStatus) => {
    set((state) => ({
      rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, status } : r)),
    }));
    try {
      await roomsApi.updateStatus(roomId, status);
    } catch {
      // Optimistic update preserved for demo mode
    }
  },

  addOrUpdateBookingLocal: (booking: Booking) => {
    set((state) => {
      const exists = state.bookings.some((b) => b.id === booking.id);
      const nextBookings = exists
        ? state.bookings.map((b) => (b.id === booking.id ? booking : b))
        : [booking, ...state.bookings];
      return { bookings: nextBookings };
    });
  },

  updateTaskLocal: (task: HousekeepingTask) => {
    set((state) => {
      const exists = state.housekeepingTasks.some((t) => t.id === task.id);
      const nextTasks = exists
        ? state.housekeepingTasks.map((t) => (t.id === task.id ? task : t))
        : [task, ...state.housekeepingTasks];
      return { housekeepingTasks: nextTasks };
    });
  },

  pushNotification: (item) => {
    const newNotif: RealtimeNotification = {
      ...item,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    set((state) => ({
      notifications: [newNotif, ...state.notifications].slice(0, 20),
    }));
  },

  markAllNotificationsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
  },

  connectSocket: (token: string | null) => {
    if (get().socket || !token || token.startsWith('demo-token-')) {
      return;
    }
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    const socket = io(socketUrl, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      set({ socketConnected: true });
    });

    socket.on('disconnect', () => {
      set({ socketConnected: false });
    });

    socket.on('room:status_updated', (payload: { roomId: string; roomNumber?: string; status: RoomStatus }) => {
      set((state) => ({
        rooms: state.rooms.map((r) => (r.id === payload.roomId ? { ...r, status: payload.status } : r)),
      }));
      get().pushNotification({
        title: `Phòng ${payload.roomNumber || payload.roomId} đổi trạng thái`,
        description: `Trạng thái mới: ${payload.status}`,
        type: 'info',
      });
    });

    socket.on('booking:created', (booking: Booking) => {
      get().addOrUpdateBookingLocal(booking);
      get().pushNotification({
        title: 'Đơn đặt phòng mới',
        description: `${booking.guestName} — ${booking.bookingCode || booking.id}`,
        type: 'success',
      });
    });

    socket.on('booking:updated', (booking: Booking) => {
      get().addOrUpdateBookingLocal(booking);
    });

    socket.on('housekeeping:updated', (task: HousekeepingTask) => {
      get().updateTaskLocal(task);
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null, socketConnected: false });
    }
  },
}));
