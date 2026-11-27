import { useState } from 'react';
import { LockOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Divider, Form, Input, Space, Tag, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { STAFF_DEFAULT_ROUTES, STAFF_ROLE_LABELS, StaffRole } from '@/types';

const { Title, Text } = Typography;

interface LoginFormValues {
  identifier: string;
  password: string;
}

export default function Login() {
  const navigate = useNavigate();
  const { login, loginDemo, isLoading, error, clearError } = useAuthStore();
  const [form] = Form.useForm<LoginFormValues>();
  const [submittingRole, setSubmittingRole] = useState<StaffRole | null>(null);

  const handleFinish = async (values: LoginFormValues) => {
    clearError();
    try {
      const user = await login(values);
      message.success(`Chào mừng ${user.name} quay trở lại!`);
      const defaultRoute = STAFF_DEFAULT_ROUTES[user.staffRole]?.[0] || '/';
      navigate(defaultRoute, { replace: true });
    } catch {
      // Error is stored in authStore
    }
  };

  const handleDemoLogin = (role: StaffRole) => {
    setSubmittingRole(role);
    const user = loginDemo(role);
    message.success(`Đã đăng nhập với vai trò ${STAFF_ROLE_LABELS[role]}`);
    const defaultRoute = STAFF_DEFAULT_ROUTES[user.staffRole]?.[0] || '/';
    navigate(defaultRoute, { replace: true });
    setSubmittingRole(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #451a03 100%)',
      }}
    >
      <Card
        bordered={false}
        style={{
          width: '100%',
          maxWidth: 440,
          borderRadius: 16,
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.32)',
        }}
        styles={{ body: { padding: 32 } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            className="admin-sider-logo"
            style={{ width: 52, height: 52, fontSize: 20, margin: '0 auto 12px' }}
          >
            GS
          </div>
          <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
            Grand Saigon Hotel
          </Title>
          <Text type="secondary">Hệ thống quản trị vận hành khách sạn</Text>
        </div>

        {error && (
          <Alert
            type="error"
            showIcon
            message={error}
            closable
            onClose={clearError}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form form={form} layout="vertical" onFinish={handleFinish} size="large">
          <Form.Item
            name="identifier"
            label="Email hoặc Số điện thoại"
            rules={[{ required: true, message: 'Vui lòng nhập email hoặc SĐT' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="admin@grandsaigon.vn" autoComplete="username" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
            />
          </Form.Item>

          <Button type="primary" htmlType="submit" block loading={isLoading} style={{ height: 44, fontWeight: 600 }}>
            Đăng nhập hệ thống
          </Button>
        </Form>

        <Divider style={{ margin: '20px 0 12px' }}>
          <Space size={4}>
            <SafetyCertificateOutlined style={{ color: '#b45309' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Truy cập nhanh theo vai trò (Demo)
            </Text>
          </Space>
        </Divider>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {(Object.values(StaffRole) as StaffRole[]).map((role) => (
            <Button
              key={role}
              size="middle"
              loading={submittingRole === role}
              onClick={() => handleDemoLogin(role)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Tag color="gold" style={{ marginInlineEnd: 4, fontSize: 11 }}>
                {role}
              </Tag>
              <span style={{ fontSize: 12 }}>{STAFF_ROLE_LABELS[role]}</span>
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}
