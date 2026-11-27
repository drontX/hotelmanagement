import React, { useEffect, useMemo, useState } from 'react';
import {
  ApartmentOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  BellOutlined,
  CalendarOutlined,
  ClearOutlined,
  DashboardOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Badge,
  Button,
  Dropdown,
  Layout,
  List,
  Menu,
  Popover,
  Space,
  Tag,
  Typography,
} from 'antd';
import type { MenuProps } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/authStore';
import { useHotelStore } from '@/store/hotelStore';
import { STAFF_DEFAULT_ROUTES, STAFF_ROLE_LABELS } from '@/types';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface NavRouteMeta {
  key: string;
  label: string;
  icon: React.ReactNode;
}

const ALL_NAV_ITEMS: NavRouteMeta[] = [
  { key: '/', label: 'Tổng quan', icon: <DashboardOutlined /> },
  { key: '/room-map', label: 'Sơ đồ phòng', icon: <AppstoreOutlined /> },
  { key: '/bookings', label: 'Đặt phòng', icon: <CalendarOutlined /> },
  { key: '/housekeeping', label: 'Buồng phòng', icon: <ClearOutlined /> },
  { key: '/channels', label: 'Kênh OTA', icon: <ApartmentOutlined /> },
  { key: '/invoices', label: 'Hóa đơn & Thuế', icon: <FileTextOutlined /> },
  { key: '/reports', label: 'Báo cáo', icon: <BarChartOutlined /> },
  { key: '/staff', label: 'Nhân sự', icon: <TeamOutlined /> },
  { key: '/settings', label: 'Cài đặt', icon: <SettingOutlined /> },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, logout } = useAuthStore();
  const {
    socketConnected,
    notifications,
    markAllNotificationsRead,
    connectSocket,
    disconnectSocket,
    fetchRooms,
    fetchRoomTypes,
    fetchBookings,
    fetchHousekeepingTasks,
  } = useHotelStore();

  useEffect(() => {
    fetchRooms();
    fetchRoomTypes();
    fetchBookings();
    fetchHousekeepingTasks();
    connectSocket(token);
    return () => {
      disconnectSocket();
    };
  }, [token, connectSocket, disconnectSocket, fetchRooms, fetchRoomTypes, fetchBookings, fetchHousekeepingTasks]);

  const allowedRoutes = useMemo(() => {
    if (!user) return [];
    return STAFF_DEFAULT_ROUTES[user.staffRole] || [];
  }, [user]);

  const menuItems: MenuProps['items'] = useMemo(() => {
    return ALL_NAV_ITEMS.filter((item) => allowedRoutes.includes(item.key)).map((item) => ({
      key: item.key,
      icon: item.icon,
      label: item.label,
    }));
  }, [allowedRoutes]);

  const currentNav = ALL_NAV_ITEMS.find((item) => item.key === location.pathname);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/login', { replace: true });
  };

  const userDropdownItems: MenuProps['items'] = [
    {
      key: 'role',
      label: (
        <div>
          <div style={{ fontWeight: 600 }}>{user?.name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {user ? STAFF_ROLE_LABELS[user.staffRole] : ''}
          </Text>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
      onClick: handleLogout,
    },
  ];

  const notificationContent = (
    <div style={{ width: 320 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text strong>Thông báo vận hành</Text>
        <Button type="link" size="small" onClick={markAllNotificationsRead}>
          Đánh dấu đã đọc
        </Button>
      </div>
      <List
        size="small"
        dataSource={notifications.slice(0, 6)}
        locale={{ emptyText: 'Chưa có thông báo mới' }}
        renderItem={(item) => (
          <List.Item style={{ padding: '8px 0', opacity: item.read ? 0.65 : 1 }}>
            <List.Item.Meta
              title={<Text strong={!item.read} style={{ fontSize: 13 }}>{item.title}</Text>}
              description={
                <div>
                  <div style={{ fontSize: 12 }}>{item.description}</div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {dayjs(item.createdAt).format('HH:mm DD/MM')}
                  </Text>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        breakpoint="lg"
        onBreakpoint={(broken) => setCollapsed(broken)}
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          zIndex: 100,
        }}
      >
        <div className="admin-sider-brand">
          <div className="admin-sider-logo">GS</div>
          {!collapsed && (
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Grand Saigon</div>
              <div style={{ color: '#cbd5e1', fontSize: 11 }}>Hotel Management</div>
            </div>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ marginTop: 8, borderInlineEnd: 'none' }}
        />
      </Sider>

      <Layout>
        <Header
          className="no-print"
          style={{
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e5e7eb',
            position: 'sticky',
            top: 0,
            zIndex: 99,
          }}
        >
          <Space size={12}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16 }}
            />
            <Typography.Title level={5} style={{ margin: 0 }}>
              {currentNav?.label || 'Bảng điều khiển'}
            </Typography.Title>
          </Space>

          <Space size={16}>
            <Tag
              icon={<WifiOutlined />}
              color={socketConnected ? 'success' : 'default'}
              style={{ marginInlineEnd: 0 }}
            >
              {socketConnected ? 'Realtime: Đang kết nối' : 'Chế độ đồng bộ cục bộ'}
            </Tag>

            <Popover content={notificationContent} trigger="click" placement="bottomRight">
              <Badge count={unreadCount} size="small">
                <Button type="text" shape="circle" icon={<BellOutlined style={{ fontSize: 17 }} />} />
              </Badge>
            </Popover>

            <Dropdown menu={{ items: userDropdownItems }} trigger={['click']}>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar style={{ backgroundColor: '#b45309' }} icon={<UserOutlined />} />
                <div style={{ lineHeight: 1.25 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{user?.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {user ? STAFF_ROLE_LABELS[user.staffRole] : ''}
                  </div>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ padding: 24, maxWidth: 1600, width: '100%', margin: '0 auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
