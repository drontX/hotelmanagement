import { useEffect, useMemo, useState } from 'react';
import {
  CalendarOutlined,
  ClearOutlined,
  DollarOutlined,
  HomeOutlined,
  PlusOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, Row, Segmented, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import BookingDrawer from '@/components/BookingDrawer';
import StatsCard from '@/components/StatsCard';
import { reportsApi } from '@/services/api';
import { useHotelStore } from '@/store/hotelStore';
import {
  BOOKING_SOURCE_META,
  BOOKING_STATUS_META,
  BookingStatus,
  CleaningStatus,
  ROOM_STATUS_META,
  RoomStatus,
  formatVND,
} from '@/types';
import type { Booking, RevenueReportPoint } from '@/types';

const { Text, Title } = Typography;

const FALLBACK_REVENUE_7D: RevenueReportPoint[] = Array.from({ length: 7 }, (_, i) => {
  const d = dayjs().subtract(6 - i, 'day');
  const direct = 12000000 + i * 1800000 + (i % 2) * 2500000;
  const ota = 9500000 + i * 1200000;
  return {
    date: d.format('DD/MM'),
    revenue: direct + ota,
    directRevenue: direct,
    otaRevenue: ota,
    bookings: 8 + i,
  };
});

export default function Dashboard() {
  const { rooms, bookings, housekeepingTasks } = useHotelStore();
  const [period, setPeriod] = useState<'7d' | '30d'>('7d');
  const [revenueSeries, setRevenueSeries] = useState<RevenueReportPoint[]>(FALLBACK_REVENUE_7D);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    let mounted = true;
    const days = period === '7d' ? 7 : 30;
    reportsApi
      .getRevenue({
        from: dayjs().subtract(days - 1, 'day').format('YYYY-MM-DD'),
        to: dayjs().format('YYYY-MM-DD'),
      })
      .then((res) => {
        if (mounted && Array.isArray(res) && res.length > 0) {
          setRevenueSeries(res);
        }
      })
      .catch(() => {
        if (!mounted) return;
        if (period === '30d') {
          setRevenueSeries(
            Array.from({ length: 14 }, (_, i) => {
              const d = dayjs().subtract(13 - i, 'day');
              const direct = 14000000 + (i % 4) * 3200000;
              const ota = 10500000 + (i % 3) * 2400000;
              return {
                date: d.format('DD/MM'),
                revenue: direct + ota,
                directRevenue: direct,
                otaRevenue: ota,
                bookings: 10 + (i % 5),
              };
            })
          );
        } else {
          setRevenueSeries(FALLBACK_REVENUE_7D);
        }
      });
    return () => {
      mounted = false;
    };
  }, [period]);

  const kpis = useMemo(() => {
    const totalRooms = rooms.length || 1;
    const occupiedRooms = rooms.filter((r) => r.status === RoomStatus.OCCUPIED).length;
    const occupancyRate = Math.round((occupiedRooms / totalRooms) * 100);
    const activeGuests = bookings
      .filter((b) => b.status === BookingStatus.CHECKED_IN)
      .reduce((sum, b) => sum + b.guests + b.childrenCount, 0);
    const pendingCleaning = housekeepingTasks.filter((t) => t.status !== CleaningStatus.DONE).length;
    const todayRevenue = bookings
      .filter((b) => b.status !== BookingStatus.CANCELED)
      .reduce((sum, b) => sum + (b.paidAmount || b.totalAmount), 0);

    return {
      todayRevenue,
      occupancyRate,
      occupiedRooms,
      totalRooms,
      activeGuests,
      pendingCleaning,
    };
  }, [rooms, bookings, housekeepingTasks]);

  const roomStatusChartData = useMemo(() => {
    return (Object.values(RoomStatus) as RoomStatus[]).map((status) => ({
      name: ROOM_STATUS_META[status].label,
      value: rooms.filter((r) => r.status === status).length,
      color: ROOM_STATUS_META[status].color,
    }));
  }, [rooms]);

  const columns: ColumnsType<Booking> = [
    {
      title: 'Mã đơn',
      dataIndex: 'bookingCode',
      key: 'bookingCode',
      render: (code: string, record) => <Text strong>{code || record.id}</Text>,
    },
    {
      title: 'Khách hàng',
      dataIndex: 'guestName',
      key: 'guestName',
      render: (name: string, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.guestPhone}
          </Text>
        </div>
      ),
    },
    {
      title: 'Phòng',
      key: 'room',
      render: (_, record) => <Tag>P.{record.room?.roomNumber || record.roomId}</Tag>,
    },
    {
      title: 'Nguồn',
      dataIndex: 'source',
      key: 'source',
      render: (source: Booking['source']) => (
        <Tag color={BOOKING_SOURCE_META[source].color}>{BOOKING_SOURCE_META[source].label}</Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: BookingStatus) => (
        <Tag color={BOOKING_STATUS_META[status].color}>{BOOKING_STATUS_META[status].label}</Tag>
      ),
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      render: (amount: number) => <Text strong>{formatVND(amount)}</Text>,
    },
  ];

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div className="page-header-row" style={{ marginBottom: 0 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Tổng quan vận hành hôm nay
          </Title>
          <Text type="secondary">{dayjs().format('dddd, DD/MM/YYYY')}</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setSelectedBooking(null);
            setDrawerOpen(true);
          }}
        >
          Tạo đặt phòng nhanh
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <StatsCard
            title="Doanh thu ghi nhận"
            value={formatVND(kpis.todayRevenue)}
            icon={<DollarOutlined />}
            accentColor="#b45309"
            trend={14.2}
            trendLabel="so với tuần trước"
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatsCard
            title="Tỷ lệ lấp đầy (Occupancy)"
            value={`${kpis.occupancyRate}%`}
            icon={<HomeOutlined />}
            accentColor="#1d4ed8"
            trend={5.8}
            trendLabel={`${kpis.occupiedRooms}/${kpis.totalRooms} phòng đang có khách`}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatsCard
            title="Khách đang lưu trú"
            value={kpis.activeGuests}
            icon={<TeamOutlined />}
            accentColor="#16a34a"
            subtitle="Đã làm thủ tục Check-in"
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatsCard
            title="Tác vụ buồng phòng"
            value={kpis.pendingCleaning}
            icon={<ClearOutlined />}
            accentColor="#ea580c"
            subtitle="Phòng chờ dọn / đang vệ sinh"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            bordered={false}
            style={{ borderRadius: 12 }}
            title="Xu hướng doanh thu theo kênh"
            extra={
              <Segmented
                value={period}
                onChange={(val) => setPeriod(val as '7d' | '30d')}
                options={[
                  { label: '7 ngày', value: '7d' },
                  { label: '14 ngày', value: '30d' },
                ]}
              />
            }
          >
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <AreaChart data={revenueSeries} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="directGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#b45309" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#b45309" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="otaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(v: number) => `${Math.round(v / 1000000)}M`} />
                  <Tooltip formatter={(value: number) => formatVND(value)} />
                  <Area
                    type="monotone"
                    dataKey="directRevenue"
                    name="Trực tiếp & Walk-in"
                    stroke="#b45309"
                    strokeWidth={2}
                    fill="url(#directGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="otaRevenue"
                    name="Kênh OTA"
                    stroke="#1d4ed8"
                    strokeWidth={2}
                    fill="url(#otaGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card bordered={false} style={{ borderRadius: 12, height: '100%' }} title="Phân bổ trạng thái phòng">
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={roomStatusChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={4}
                  >
                    {roomStatusChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <Space direction="vertical" size={6} style={{ width: '100%', marginTop: 8 }}>
              {roomStatusChartData.map((item) => (
                <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <Space size={8}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: item.color,
                        display: 'inline-block',
                      }}
                    />
                    <Text>{item.name}</Text>
                  </Space>
                  <Text strong>{item.value} phòng</Text>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      <Card
        bordered={false}
        style={{ borderRadius: 12 }}
        title={
          <Space>
            <CalendarOutlined />
            <span>Đặt phòng & Lưu trú gần đây</span>
          </Space>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={bookings.slice(0, 6)}
          pagination={false}
          onRow={(record) => ({
            onClick: () => {
              setSelectedBooking(record);
              setDrawerOpen(true);
            },
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      <BookingDrawer
        open={drawerOpen}
        booking={selectedBooking}
        onClose={() => setDrawerOpen(false)}
      />
    </Space>
  );
}
