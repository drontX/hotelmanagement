import {
  CheckCircleOutlined,
  ClearOutlined,
  LoginOutlined,
  LogoutOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Card, Dropdown, Space, Tag, Tooltip, Typography } from 'antd';
import type { MenuProps } from 'antd';
import dayjs from 'dayjs';
import { ROOM_STATUS_META, RoomStatus, formatVND } from '@/types';
import type { Booking, Room } from '@/types';

const { Text } = Typography;

interface RoomStatusCardProps {
  room: Room;
  activeBooking?: Booking;
  onOpenBooking: (room: Room, booking?: Booking) => void;
  onChangeStatus: (room: Room, status: RoomStatus) => void;
}

export default function RoomStatusCard({
  room,
  activeBooking,
  onOpenBooking,
  onChangeStatus,
}: RoomStatusCardProps) {
  const meta = ROOM_STATUS_META[room.status];

  const statusMenuItems: MenuProps['items'] = [
    {
      key: RoomStatus.EMPTY,
      icon: <CheckCircleOutlined style={{ color: ROOM_STATUS_META.EMPTY.color }} />,
      label: 'Đánh dấu Đang trống',
      disabled: room.status === RoomStatus.EMPTY,
      onClick: () => onChangeStatus(room, RoomStatus.EMPTY),
    },
    {
      key: RoomStatus.CLEANING,
      icon: <ClearOutlined style={{ color: ROOM_STATUS_META.CLEANING.color }} />,
      label: 'Chuyển Đang dọn dẹp',
      disabled: room.status === RoomStatus.CLEANING,
      onClick: () => onChangeStatus(room, RoomStatus.CLEANING),
    },
    {
      key: RoomStatus.MAINTENANCE,
      icon: <ToolOutlined style={{ color: ROOM_STATUS_META.MAINTENANCE.color }} />,
      label: 'Chuyển Bảo trì',
      disabled: room.status === RoomStatus.MAINTENANCE,
      onClick: () => onChangeStatus(room, RoomStatus.MAINTENANCE),
    },
  ];

  return (
    <Card
      className="room-card-hover"
      style={{
        borderRadius: 12,
        borderTop: `4px solid ${meta.color}`,
        height: '100%',
      }}
      styles={{ body: { padding: 16, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' } }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <Text strong style={{ fontSize: 18, color: '#0f172a' }}>
              P.{room.roomNumber}
            </Text>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {room.roomType?.name || 'Phòng tiêu chuẩn'} • Tầng {room.floor}
            </div>
          </div>
          <Tag color={meta.color} style={{ marginInlineEnd: 0, fontWeight: 500 }}>
            {meta.label}
          </Tag>
        </div>

        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: 8,
            padding: '8px 10px',
            marginBottom: 12,
            minHeight: 62,
          }}
        >
          {activeBooking ? (
            <Space direction="vertical" size={2} style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserOutlined style={{ color: '#b45309' }} />
                <Text strong ellipsis style={{ fontSize: 13 }}>
                  {activeBooking.guestName}
                </Text>
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Trả phòng: {dayjs(activeBooking.checkOut).format('HH:mm DD/MM')}
              </Text>
            </Space>
          ) : room.notes ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Ghi chú: {room.notes}
            </Text>
          ) : (
            <Space direction="vertical" size={2}>
              <Text style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                {formatVND(room.roomType?.baseRateDaily || 0)} / đêm
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Theo giờ: {formatVND(room.roomType?.baseRateHourly || 0)} / 2h đầu
              </Text>
            </Space>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {room.status === RoomStatus.EMPTY && (
          <Button
            type="primary"
            size="small"
            icon={<LoginOutlined />}
            block
            onClick={() => onOpenBooking(room)}
          >
            Đặt / Nhận phòng
          </Button>
        )}
        {room.status === RoomStatus.OCCUPIED && (
          <Button
            type="default"
            size="small"
            danger
            icon={<LogoutOutlined />}
            block
            onClick={() => onOpenBooking(room, activeBooking)}
          >
            Xem / Trả phòng
          </Button>
        )}
        {room.status === RoomStatus.CLEANING && (
          <Button
            size="small"
            icon={<CheckCircleOutlined />}
            block
            onClick={() => onChangeStatus(room, RoomStatus.EMPTY)}
          >
            Hoàn tất dọn
          </Button>
        )}
        {room.status === RoomStatus.MAINTENANCE && (
          <Button
            size="small"
            icon={<CheckCircleOutlined />}
            block
            onClick={() => onChangeStatus(room, RoomStatus.EMPTY)}
          >
            Mở lại phòng
          </Button>
        )}
        <Dropdown menu={{ items: statusMenuItems }} trigger={['click']}>
          <Tooltip title="Đổi trạng thái phòng">
            <Button size="small">Trạng thái</Button>
          </Tooltip>
        </Dropdown>
      </div>
    </Card>
  );
}
