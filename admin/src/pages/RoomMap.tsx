import { useMemo, useState } from 'react';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import BookingDrawer from '@/components/BookingDrawer';
import RoomStatusCard from '@/components/RoomStatusCard';
import { roomsApi } from '@/services/api';
import { useHotelStore } from '@/store/hotelStore';
import { BookingStatus, ROOM_STATUS_META, RoomStatus } from '@/types';
import type { Booking, Room } from '@/types';

const { Text, Title } = Typography;

interface CreateRoomValues {
  roomNumber: string;
  floor: number;
  roomTypeId: string;
  notes?: string;
}

export default function RoomMap() {
  const { rooms, roomTypes, bookings, fetchRooms, updateRoomStatus } = useHotelStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RoomStatus | 'ALL'>('ALL');
  const [floorFilter, setFloorFilter] = useState<number | 'ALL'>('ALL');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm] = Form.useForm<CreateRoomValues>();

  const floors = useMemo(() => {
    return Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b);
  }, [rooms]);

  const statusCounts = useMemo(() => {
    return (Object.values(RoomStatus) as RoomStatus[]).reduce(
      (acc, st) => {
        acc[st] = rooms.filter((r) => r.status === st).length;
        return acc;
      },
      {} as Record<RoomStatus, number>
    );
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (statusFilter !== 'ALL' && room.status !== statusFilter) return false;
      if (floorFilter !== 'ALL' && room.floor !== floorFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesRoom = room.roomNumber.toLowerCase().includes(q);
        const matchesType = room.roomType?.name.toLowerCase().includes(q);
        if (!matchesRoom && !matchesType) return false;
      }
      return true;
    });
  }, [rooms, statusFilter, floorFilter, search]);

  const groupedByFloor = useMemo(() => {
    const map = new Map<number, Room[]>();
    for (const room of filteredRooms) {
      const list = map.get(room.floor) || [];
      list.push(room);
      map.set(room.floor, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [filteredRooms]);

  const findActiveBookingForRoom = (roomId: string): Booking | undefined => {
    return bookings.find((b) => b.roomId === roomId && b.status === BookingStatus.CHECKED_IN);
  };

  const handleOpenBooking = (room: Room, booking?: Booking) => {
    setActiveRoom(room);
    setActiveBooking(booking || null);
    setDrawerOpen(true);
  };

  const handleChangeStatus = async (room: Room, nextStatus: RoomStatus) => {
    await updateRoomStatus(room.id, nextStatus);
    message.success(`Phòng ${room.roomNumber} -> ${ROOM_STATUS_META[nextStatus].label}`);
  };

  const handleCreateRoom = async (values: CreateRoomValues) => {
    try {
      await roomsApi.create(values);
      await fetchRooms();
    } catch {
      const rt = roomTypes.find((t) => t.id === values.roomTypeId);
      useHotelStore.setState((state) => ({
        rooms: [
          ...state.rooms,
          {
            id: `r-${Date.now()}`,
            roomNumber: values.roomNumber,
            floor: values.floor,
            roomTypeId: values.roomTypeId,
            roomType: rt,
            status: RoomStatus.EMPTY,
            notes: values.notes,
          },
        ],
      }));
    }
    message.success(`Đã thêm phòng ${values.roomNumber}`);
    setAddModalOpen(false);
    addForm.resetFields();
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div className="page-header-row" style={{ marginBottom: 0 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Sơ đồ buồng phòng (Room Matrix)
          </Title>
          <Text type="secondary">Theo dõi và thao tác trạng thái phòng theo thời gian thực</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchRooms()}>
            Làm mới
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>
            Thêm phòng mới
          </Button>
        </Space>
      </div>

      <Card bordered={false} style={{ borderRadius: 12 }} styles={{ body: { padding: 16 } }}>
        <Row gutter={[12, 12]} align="middle" justify="space-between">
          <Col xs={24} md={14}>
            <Space wrap size={12}>
              <Button
                type={statusFilter === 'ALL' ? 'primary' : 'default'}
                onClick={() => setStatusFilter('ALL')}
              >
                Tất cả ({rooms.length})
              </Button>
              {(Object.values(RoomStatus) as RoomStatus[]).map((st) => (
                <Button
                  key={st}
                  type={statusFilter === st ? 'primary' : 'default'}
                  onClick={() => setStatusFilter(st)}
                >
                  <Badge color={ROOM_STATUS_META[st].color} text={`${ROOM_STATUS_META[st].label} (${statusCounts[st]})`} />
                </Button>
              ))}
            </Space>
          </Col>

          <Col xs={24} md={10}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }} wrap>
              <Select
                value={floorFilter}
                onChange={setFloorFilter}
                style={{ width: 130 }}
                options={[
                  { value: 'ALL', label: 'Mọi tầng' },
                  ...floors.map((f) => ({ value: f, label: `Tầng ${f}` })),
                ]}
              />
              <Input
                placeholder="Tìm số phòng, hạng phòng..."
                prefix={<SearchOutlined />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
                style={{ width: 210 }}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {groupedByFloor.length === 0 ? (
        <Card bordered={false} style={{ borderRadius: 12 }}>
          <Empty description="Không có phòng nào khớp bộ lọc" />
        </Card>
      ) : (
        groupedByFloor.map(([floor, floorRooms]) => (
          <div key={floor}>
            <Title level={5} style={{ margin: '8px 0 12px', color: '#334155' }}>
              Tầng {floor} ({floorRooms.length} phòng)
            </Title>
            <Row gutter={[16, 16]}>
              {floorRooms.map((room) => (
                <Col key={room.id} xs={24} sm={12} md={8} lg={6}>
                  <RoomStatusCard
                    room={room}
                    activeBooking={findActiveBookingForRoom(room.id)}
                    onOpenBooking={handleOpenBooking}
                    onChangeStatus={handleChangeStatus}
                  />
                </Col>
              ))}
            </Row>
          </div>
        ))
      )}

      <BookingDrawer
        open={drawerOpen}
        booking={activeBooking}
        initialRoom={activeRoom}
        onClose={() => setDrawerOpen(false)}
      />

      <Modal
        title="Thêm phòng mới"
        open={addModalOpen}
        onCancel={() => setAddModalOpen(false)}
        onOk={() => addForm.submit()}
        okText="Tạo phòng"
        cancelText="Hủy"
      >
        <Form form={addForm} layout="vertical" onFinish={handleCreateRoom} initialValues={{ floor: 1 }}>
          <Form.Item name="roomNumber" label="Số phòng" rules={[{ required: true, message: 'Nhập số phòng' }]}>
            <Input placeholder="Ví dụ: 401" />
          </Form.Item>
          <Form.Item name="floor" label="Tầng" rules={[{ required: true }]}>
            <InputNumber min={1} max={50} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="roomTypeId" label="Hạng phòng" rules={[{ required: true, message: 'Chọn hạng phòng' }]}>
            <Select
              options={roomTypes.map((rt) => ({
                value: rt.id,
                label: rt.name,
              }))}
            />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
