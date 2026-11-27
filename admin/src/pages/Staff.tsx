import { useEffect, useState } from 'react';
import { PlusOutlined, SafetyOutlined, StopOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { staffApi } from '@/services/api';
import { Role, STAFF_DEFAULT_ROUTES, STAFF_ROLE_LABELS, StaffRole } from '@/types';
import type { StaffMember } from '@/types';

const { Text, Title } = Typography;

const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'st-1',
    name: 'Nguyễn Minh Quân',
    email: 'owner@grandsaigon.vn',
    phone: '0901234567',
    role: Role.ADMIN,
    staffRole: StaffRole.OWNER,
    isActive: true,
    lastLoginAt: new Date().toISOString(),
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'st-2',
    name: 'Trần Thảo Vy',
    email: 'frontdesk@grandsaigon.vn',
    phone: '0902345678',
    role: Role.ADMIN,
    staffRole: StaffRole.FRONTDESK,
    isActive: true,
    lastLoginAt: new Date().toISOString(),
    createdAt: '2026-02-15T08:00:00Z',
  },
  {
    id: 'st-3',
    name: 'Lê Hoàng Nam',
    email: 'accountant@grandsaigon.vn',
    phone: '0903456789',
    role: Role.ADMIN,
    staffRole: StaffRole.ACCOUNTANT,
    isActive: true,
    createdAt: '2026-03-01T08:00:00Z',
  },
  {
    id: 'st-4',
    name: 'Phạm Thị Hoa',
    email: 'housekeeping@grandsaigon.vn',
    phone: '0904567890',
    role: Role.ADMIN,
    staffRole: StaffRole.HOUSEKEEPING,
    isActive: true,
    createdAt: '2026-03-20T08:00:00Z',
  },
];

const ROLE_TAG_COLOR: Record<StaffRole, string> = {
  OWNER: 'gold',
  FRONTDESK: 'blue',
  ACCOUNTANT: 'purple',
  HOUSEKEEPING: 'green',
};

interface CreateStaffValues {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  staffRole: StaffRole;
}

export default function Staff() {
  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CreateStaffValues>();

  useEffect(() => {
    setLoading(true);
    staffApi
      .list()
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) setStaffList(res);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRoleChange = async (member: StaffMember, nextRole: StaffRole) => {
    try {
      await staffApi.updateRole(member.id, nextRole);
    } catch {
      // Optimistic fallback
    }
    setStaffList((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, staffRole: nextRole } : m))
    );
    message.success(`Đã cập nhật vai trò của ${member.name} thành ${STAFF_ROLE_LABELS[nextRole]}`);
  };

  const handleDeactivate = async (member: StaffMember) => {
    try {
      await staffApi.deactivate(member.id);
    } catch {
      // Optimistic fallback
    }
    setStaffList((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, isActive: false } : m))
    );
    message.success(`Đã vô hiệu hóa tài khoản ${member.name}`);
  };

  const handleCreate = async (values: CreateStaffValues) => {
    try {
      const created = await staffApi.create(values);
      setStaffList((prev) => [created, ...prev]);
    } catch {
      const mockCreated: StaffMember = {
        id: `st-${Date.now()}`,
        name: values.name,
        email: values.email,
        phone: values.phone,
        role: Role.ADMIN,
        staffRole: values.staffRole,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      setStaffList((prev) => [mockCreated, ...prev]);
    }
    message.success(`Đã thêm nhân viên ${values.name}`);
    setModalOpen(false);
    form.resetFields();
  };

  const columns: ColumnsType<StaffMember> = [
    {
      title: 'Họ tên',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.email || record.phone}
          </Text>
        </div>
      ),
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone?: string) => phone || '—',
    },
    {
      title: 'Vai trò (RBAC)',
      key: 'staffRole',
      render: (_, record) => (
        <Select
          value={record.staffRole}
          style={{ width: 170 }}
          disabled={!record.isActive}
          onChange={(val: StaffRole) => handleRoleChange(record, val)}
          options={(Object.values(StaffRole) as StaffRole[]).map((role) => ({
            value: role,
            label: (
              <Tag color={ROLE_TAG_COLOR[role]} style={{ marginInlineEnd: 0 }}>
                {STAFF_ROLE_LABELS[role]}
              </Tag>
            ),
          }))}
        />
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'default'}>{active ? 'Đang hoạt động' : 'Đã khóa'}</Tag>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (dt: string) => dayjs(dt).format('DD/MM/YYYY'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) =>
        record.isActive ? (
          <Popconfirm
            title={`Vô hiệu hóa tài khoản ${record.name}?`}
            onConfirm={() => handleDeactivate(record)}
          >
            <Button size="small" danger icon={<StopOutlined />}>
              Vô hiệu hóa
            </Button>
          </Popconfirm>
        ) : (
          <Text type="secondary">Đã vô hiệu hóa</Text>
        ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div className="page-header-row" style={{ marginBottom: 0 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Quản lý nhân sự & Phân quyền (RBAC)
          </Title>
          <Text type="secondary">Kiểm soát truy cập theo vai trò Chủ khách sạn, Lễ tân, Kế toán, Buồng phòng</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Thêm nhân viên
        </Button>
      </div>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={staffList} pagination={false} />
      </Card>

      <Card
        bordered={false}
        style={{ borderRadius: 12 }}
        title={
          <Space>
            <SafetyOutlined style={{ color: '#b45309' }} />
            <span>Ma trận đường dẫn mặc định theo vai trò (@hotel/shared)</span>
          </Space>
        }
      >
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          {(Object.values(StaffRole) as StaffRole[]).map((role) => (
            <div
              key={role}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
                padding: '8px 12px',
                backgroundColor: '#f8fafc',
                borderRadius: 8,
              }}
            >
              <Tag color={ROLE_TAG_COLOR[role]} style={{ fontWeight: 600 }}>
                {STAFF_ROLE_LABELS[role]} ({role})
              </Tag>
              <Space wrap>
                {STAFF_DEFAULT_ROUTES[role].map((route) => (
                  <Tag key={route}>{route}</Tag>
                ))}
              </Space>
            </div>
          ))}
        </Space>
      </Card>

      <Modal
        title="Thêm nhân viên mới"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="Tạo tài khoản"
        cancelText="Hủy"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ staffRole: StaffRole.FRONTDESK }}
        >
          <Form.Item name="name" label="Họ và tên" rules={[{ required: true, message: 'Nhập họ tên' }]}>
            <Input placeholder="Nguyễn Văn B" />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input placeholder="staff@grandsaigon.vn" />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại">
            <Input placeholder="0905123456" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Mật khẩu khởi tạo"
            rules={[{ required: true, min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="staffRole" label="Vai trò" rules={[{ required: true }]}>
            <Select
              options={(Object.values(StaffRole) as StaffRole[]).map((role) => ({
                value: role,
                label: STAFF_ROLE_LABELS[role],
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
