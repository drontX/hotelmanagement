import { useMemo, useState } from 'react';
import {
  CheckCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { housekeepingApi } from '@/services/api';
import { useHotelStore } from '@/store/hotelStore';
import { CLEANING_STATUS_META, CleaningStatus, RoomStatus, formatVND } from '@/types';
import type { ExtraChargeCategory, HousekeepingTask, MinibarReportItem } from '@/types';

const { Text, Title } = Typography;

const PRIORITY_META: Record<HousekeepingTask['priority'], { label: string; color: string }> = {
  LOW: { label: 'Thấp', color: 'default' },
  NORMAL: { label: 'Bình thường', color: 'blue' },
  HIGH: { label: 'Ưu tiên cao', color: 'orange' },
  URGENT: { label: 'Khẩn cấp (VIP)', color: 'red' },
};

const HOUSEKEEPING_STAFF_MOCK = [
  { id: 'hk-staff-1', name: 'Phạm Thị Hoa' },
  { id: 'hk-staff-2', name: 'Nguyễn Thị Lan' },
  { id: 'hk-staff-3', name: 'Trần Văn Hùng' },
];

export default function Housekeeping() {
  const { rooms, housekeepingTasks, updateTaskLocal, updateRoomStatus } = useHotelStore();
  const [statusTab, setStatusTab] = useState<string>('ALL');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [completeModalTask, setCompleteModalTask] = useState<HousekeepingTask | null>(null);
  const [assignForm] = Form.useForm<{
    roomId: string;
    assignedToId: string;
    priority: HousekeepingTask['priority'];
    notes?: string;
  }>();
  const [minibarItems, setMinibarItems] = useState<MinibarReportItem[]>([]);
  const [damageReport, setDamageReport] = useState('');

  const filteredTasks = useMemo(() => {
    if (statusTab === 'ALL') return housekeepingTasks;
    return housekeepingTasks.filter((t) => t.status === statusTab);
  }, [housekeepingTasks, statusTab]);

  const handleTransitionStatus = async (task: HousekeepingTask, nextStatus: CleaningStatus) => {
    try {
      const updated = await housekeepingApi.updateStatus(task.id, { status: nextStatus });
      updateTaskLocal(updated);
    } catch {
      updateTaskLocal({
        ...task,
        status: nextStatus,
        completedAt: nextStatus === CleaningStatus.DONE ? new Date().toISOString() : undefined,
      });
    }
    if (nextStatus === CleaningStatus.DONE) {
      await updateRoomStatus(task.roomId, RoomStatus.EMPTY);
    } else if (nextStatus === CleaningStatus.IN_PROGRESS) {
      await updateRoomStatus(task.roomId, RoomStatus.CLEANING);
    }
    message.success(`Đã cập nhật tác vụ phòng ${task.room?.roomNumber || task.roomId}`);
  };

  const handleAssignSubmit = async (values: {
    roomId: string;
    assignedToId: string;
    priority: HousekeepingTask['priority'];
    notes?: string;
  }) => {
    const room = rooms.find((r) => r.id === values.roomId);
    const staff = HOUSEKEEPING_STAFF_MOCK.find((s) => s.id === values.assignedToId);
    try {
      const created = await housekeepingApi.assign(values);
      updateTaskLocal(created);
    } catch {
      updateTaskLocal({
        id: `hk-${Date.now()}`,
        roomId: values.roomId,
        room,
        assignedToId: values.assignedToId,
        assignedTo: staff
          ? {
              id: staff.id,
              name: staff.name,
              role: 'ADMIN',
              staffRole: 'HOUSEKEEPING',
              isActive: true,
              createdAt: new Date().toISOString(),
            }
          : undefined,
        status: CleaningStatus.PENDING,
        priority: values.priority,
        notes: values.notes,
        createdAt: new Date().toISOString(),
      });
    }
    await updateRoomStatus(values.roomId, RoomStatus.CLEANING);
    message.success('Đã phân công nhân viên buồng phòng');
    setAssignModalOpen(false);
    assignForm.resetFields();
  };

  const handleCompleteWithReport = async () => {
    if (!completeModalTask) return;
    try {
      const updated = await housekeepingApi.updateStatus(completeModalTask.id, {
        status: CleaningStatus.DONE,
        minibarItems,
        damageReport,
      });
      updateTaskLocal(updated);
    } catch {
      updateTaskLocal({
        ...completeModalTask,
        status: CleaningStatus.DONE,
        minibarItems,
        damageReport,
        completedAt: new Date().toISOString(),
      });
    }
    await updateRoomStatus(completeModalTask.roomId, RoomStatus.EMPTY);
    message.success('Hoàn tất dọn dẹp và ghi nhận báo cáo minibar');
    setCompleteModalTask(null);
    setMinibarItems([]);
    setDamageReport('');
  };

  const columns: ColumnsType<HousekeepingTask> = [
    {
      title: 'Phòng',
      key: 'room',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>Phòng {record.room?.roomNumber || record.roomId}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.room?.roomType?.name || ''}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Độ ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: HousekeepingTask['priority']) => (
        <Tag color={PRIORITY_META[priority].color}>{PRIORITY_META[priority].label}</Tag>
      ),
    },
    {
      title: 'Nhân viên phụ trách',
      key: 'assignedTo',
      render: (_, record) => record.assignedTo?.name || <Text type="secondary">Chưa phân công</Text>,
    },
    {
      title: 'Ghi chú / Minibar',
      key: 'notes',
      render: (_, record) => (
        <div>
          <div>{record.notes || '—'}</div>
          {record.minibarItems && record.minibarItems.length > 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Minibar: {record.minibarItems.map((m) => `${m.name} (×${m.quantity})`).join(', ')}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: CleaningStatus) => (
        <Tag color={CLEANING_STATUS_META[status].color}>{CLEANING_STATUS_META[status].label}</Tag>
      ),
    },
    {
      title: 'Thời gian tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (dt: string) => dayjs(dt).format('HH:mm DD/MM'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.status === CleaningStatus.PENDING && (
            <Button
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleTransitionStatus(record, CleaningStatus.IN_PROGRESS)}
            >
              Bắt đầu dọn
            </Button>
          )}
          {record.status !== CleaningStatus.DONE && (
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => {
                setCompleteModalTask(record);
                setMinibarItems(record.minibarItems || []);
                setDamageReport(record.damageReport || '');
              }}
            >
              Hoàn tất & Minibar
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    { key: 'ALL', label: `Tất cả (${housekeepingTasks.length})` },
    ...(Object.values(CleaningStatus) as CleaningStatus[]).map((st) => ({
      key: st,
      label: `${CLEANING_STATUS_META[st].label} (${housekeepingTasks.filter((t) => t.status === st).length})`,
    })),
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div className="page-header-row" style={{ marginBottom: 0 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Quản lý buồng phòng (Housekeeping)
          </Title>
          <Text type="secondary">Phân công dọn dẹp, cập nhật tiến độ và kiểm tra minibar / tài sản</Text>
        </div>
        <Button type="primary" icon={<UserAddOutlined />} onClick={() => setAssignModalOpen(true)}>
          Phân công dọn phòng
        </Button>
      </div>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Tabs activeKey={statusTab} onChange={setStatusTab} items={tabItems} />
        <Table rowKey="id" columns={columns} dataSource={filteredTasks} pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        title="Phân công buồng phòng"
        open={assignModalOpen}
        onCancel={() => setAssignModalOpen(false)}
        onOk={() => assignForm.submit()}
        okText="Phân công"
        cancelText="Hủy"
      >
        <Form
          form={assignForm}
          layout="vertical"
          onFinish={handleAssignSubmit}
          initialValues={{ priority: 'NORMAL' }}
        >
          <Form.Item name="roomId" label="Phòng cần dọn" rules={[{ required: true, message: 'Chọn phòng' }]}>
            <Select
              options={rooms.map((r) => ({
                value: r.id,
                label: `Phòng ${r.roomNumber} (${r.roomType?.name || ''})`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="assignedToId"
            label="Nhân viên phụ trách"
            rules={[{ required: true, message: 'Chọn nhân viên' }]}
          >
            <Select options={HOUSEKEEPING_STAFF_MOCK.map((s) => ({ value: s.id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="priority" label="Độ ưu tiên">
            <Select
              options={Object.entries(PRIORITY_META).map(([k, v]) => ({
                value: k,
                label: v.label,
              }))}
            />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú công việc">
            <Input.TextArea rows={2} placeholder="Khách sắp nhận phòng, cần chuẩn bị thêm nôi em bé..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Hoàn tất dọn Phòng ${completeModalTask?.room?.roomNumber || ''}`}
        open={Boolean(completeModalTask)}
        onCancel={() => setCompleteModalTask(null)}
        onOk={handleCompleteWithReport}
        okText="Xác nhận sạch & Sẵn sàng"
        cancelText="Hủy"
        width={580}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong>Báo cáo Minibar sử dụng</Text>
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() =>
                setMinibarItems((prev) => [
                  ...prev,
                  { name: 'Nước suối Evian', category: 'STANDARD', quantity: 1, unitPrice: 45000 },
                ])
              }
            >
              Thêm món Minibar
            </Button>
          </div>

          {minibarItems.map((item, idx) => (
            <Space key={idx} style={{ display: 'flex' }} align="center">
              <Input
                value={item.name}
                placeholder="Tên đồ uống"
                onChange={(e) =>
                  setMinibarItems((prev) =>
                    prev.map((m, i) => (i === idx ? { ...m, name: e.target.value } : m))
                  )
                }
              />
              <Select
                value={item.category}
                style={{ width: 130 }}
                onChange={(val: ExtraChargeCategory) =>
                  setMinibarItems((prev) =>
                    prev.map((m, i) => (i === idx ? { ...m, category: val } : m))
                  )
                }
                options={[
                  { value: 'STANDARD', label: 'Nước/Snack' },
                  { value: 'ALCOHOL', label: 'Bia/Rượu' },
                  { value: 'TOBACCO', label: 'Thuốc lá' },
                ]}
              />
              <InputNumber
                min={1}
                value={item.quantity}
                onChange={(v) =>
                  setMinibarItems((prev) =>
                    prev.map((m, i) => (i === idx ? { ...m, quantity: v || 1 } : m))
                  )
                }
                style={{ width: 65 }}
              />
              <Text type="secondary">{formatVND(item.unitPrice)}</Text>
            </Space>
          ))}

          <div>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              Báo cáo hư hại / đồ bỏ quên (nếu có)
            </Text>
            <Input.TextArea
              rows={2}
              value={damageReport}
              onChange={(e) => setDamageReport(e.target.value)}
              placeholder="Không có hư hại..."
            />
          </div>
        </Space>
      </Modal>
    </Space>
  );
}
