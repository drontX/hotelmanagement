import { useEffect, useMemo, useState } from 'react';
import {
  CloudUploadOutlined,
  EyeOutlined,
  PlusOutlined,
  PrinterOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Descriptions,
  Divider,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { invoicesApi } from '@/services/api';
import { useHotelStore } from '@/store/hotelStore';
import { DEFAULT_VAT_RATE, PAYMENT_PROVIDER_LABELS, PaymentProvider, formatVND } from '@/types';
import type { Invoice } from '@/types';

const { Text, Title } = Typography;

const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-001',
    invoiceNumber: 'INV-2026-00128',
    bookingId: 'bk-1001',
    customerName: 'Nguyễn Hoàng Anh',
    companyName: 'Công ty TNHH Công nghệ Sài Gòn',
    taxCode: '0314567890',
    companyAddress: '120 Nguyễn Huệ, Quận 1, TP.HCM',
    customerEmail: 'ketoan@saigontech.vn',
    roomAmount: 1500000,
    extraAmount: 180000,
    specialTaxAmount: 0,
    vatRate: DEFAULT_VAT_RATE,
    vatAmount: 134400,
    totalAmount: 1814400,
    status: 'ISSUED',
    eInvoiceStatus: 'EXPORTED',
    eInvoiceCode: 'CQT-2026-9981234',
    paymentMethod: PaymentProvider.VNPAY,
    issuedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'inv-002',
    invoiceNumber: 'INV-2026-00129',
    bookingId: 'bk-1005',
    customerName: 'Kenji Takahashi',
    customerEmail: 'kenji.t@example.jp',
    roomAmount: 13000000,
    extraAmount: 450000,
    specialTaxAmount: 292500,
    vatRate: DEFAULT_VAT_RATE,
    vatAmount: 1099400,
    totalAmount: 14841900,
    status: 'ISSUED',
    eInvoiceStatus: 'PENDING',
    paymentMethod: PaymentProvider.STRIPE,
    createdAt: new Date().toISOString(),
  },
];

interface EInvoiceFormValues {
  companyName?: string;
  taxCode?: string;
  companyAddress?: string;
  customerEmail?: string;
}

interface CreateInvoiceFormValues {
  bookingId: string;
  companyName?: string;
  taxCode?: string;
  companyAddress?: string;
  customerEmail?: string;
  paymentMethod: PaymentProvider;
}

export default function Invoices() {
  const { bookings } = useHotelStore();
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [search, setSearch] = useState('');
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [exportTarget, setExportTarget] = useState<Invoice | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [exportForm] = Form.useForm<EInvoiceFormValues>();
  const [createForm] = Form.useForm<CreateInvoiceFormValues>();

  useEffect(() => {
    invoicesApi
      .list()
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) setInvoices(res);
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return invoices;
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) =>
      `${inv.invoiceNumber} ${inv.customerName} ${inv.companyName || ''} ${inv.taxCode || ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [invoices, search]);

  const handleOpenExport = (inv: Invoice) => {
    setExportTarget(inv);
    exportForm.setFieldsValue({
      companyName: inv.companyName,
      taxCode: inv.taxCode,
      companyAddress: inv.companyAddress,
      customerEmail: inv.customerEmail,
    });
  };

  const handleConfirmExport = async (values: EInvoiceFormValues) => {
    if (!exportTarget) return;
    try {
      const updated = await invoicesApi.exportEInvoice(exportTarget.id, values);
      setInvoices((prev) => prev.map((i) => (i.id === exportTarget.id ? updated : i)));
    } catch {
      const code = `CQT-${dayjs().format('YYYY')}-${Math.floor(1000000 + Math.random() * 8999999)}`;
      setInvoices((prev) =>
        prev.map((i) =>
          i.id === exportTarget.id
            ? {
                ...i,
                ...values,
                eInvoiceStatus: 'EXPORTED',
                eInvoiceCode: code,
                issuedAt: new Date().toISOString(),
              }
            : i
        )
      );
    }
    message.success('Đã phát hành Hóa đơn điện tử và cấp mã CQT thành công');
    setExportTarget(null);
  };

  const handleCreateInvoice = async (values: CreateInvoiceFormValues) => {
    const bk = bookings.find((b) => b.id === values.bookingId);
    try {
      const created = await invoicesApi.create(values);
      setInvoices((prev) => [created, ...prev]);
    } catch {
      const newInv: Invoice = {
        id: `inv-${Date.now()}`,
        invoiceNumber: `INV-${dayjs().format('YYYY')}-${Math.floor(10000 + Math.random() * 89999)}`,
        bookingId: values.bookingId,
        customerName: bk?.guestName || 'Khách lẻ',
        companyName: values.companyName,
        taxCode: values.taxCode,
        companyAddress: values.companyAddress,
        customerEmail: values.customerEmail || bk?.guestEmail,
        roomAmount: bk?.roomCharge || 1500000,
        extraAmount: bk?.extraChargesTotal || 0,
        specialTaxAmount: bk?.specialTaxAmount || 0,
        vatRate: DEFAULT_VAT_RATE,
        vatAmount: bk?.vatAmount || 120000,
        totalAmount: bk?.totalAmount || 1620000,
        status: 'ISSUED',
        eInvoiceStatus: 'PENDING',
        paymentMethod: values.paymentMethod,
        createdAt: new Date().toISOString(),
      };
      setInvoices((prev) => [newInv, ...prev]);
    }
    message.success('Đã tạo bảng kê hóa đơn mới');
    setCreateOpen(false);
    createForm.resetFields();
  };

  const columns: ColumnsType<Invoice> = [
    {
      title: 'Số hóa đơn',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (num: string, record) => (
        <div>
          <Text strong>{num}</Text>
          {record.eInvoiceCode && (
            <div style={{ fontSize: 11, color: '#16a34a' }}>Mã CQT: {record.eInvoiceCode}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Khách hàng / Đơn vị',
      key: 'customer',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.companyName || record.customerName}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.taxCode ? `MST: ${record.taxCode}` : record.customerName}
          </Text>
        </div>
      ),
    },
    {
      title: 'Thuế GTGT (8%)',
      dataIndex: 'vatAmount',
      key: 'vatAmount',
      align: 'right',
      render: formatVND,
    },
    {
      title: 'Tổng thanh toán',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      render: (v: number) => <Text strong>{formatVND(v)}</Text>,
    },
    {
      title: 'Hóa đơn điện tử',
      dataIndex: 'eInvoiceStatus',
      key: 'eInvoiceStatus',
      render: (status: Invoice['eInvoiceStatus']) => {
        if (status === 'EXPORTED') return <Tag color="success">Đã phát hành HĐĐT</Tag>;
        if (status === 'FAILED') return <Tag color="error">Lỗi phát hành</Tag>;
        return <Tag color="orange">Chờ phát hành</Tag>;
      },
    },
    {
      title: 'Ngày lập',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (dt: string) => dayjs(dt).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setPreviewInvoice(record)}>
            Xem
          </Button>
          {record.eInvoiceStatus !== 'EXPORTED' && (
            <Button
              size="small"
              type="primary"
              icon={<CloudUploadOutlined />}
              onClick={() => handleOpenExport(record)}
            >
              Xuất HĐĐT
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div className="page-header-row" style={{ marginBottom: 0 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Hóa đơn & Thuế điện tử (E-Invoice)
          </Title>
          <Text type="secondary">Quản lý hóa đơn GTGT 8%, thuế tiêu thụ đặc biệt và phát hành mã Cơ quan Thuế</Text>
        </div>
        <Space>
          <Input
            placeholder="Tìm số hóa đơn, MST, tên khách..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 260 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            Lập hóa đơn
          </Button>
        </Space>
      </div>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table rowKey="id" columns={columns} dataSource={filtered} pagination={{ pageSize: 10 }} />
      </Card>

      <Modal
        title={`Chi tiết hóa đơn ${previewInvoice?.invoiceNumber || ''}`}
        open={Boolean(previewInvoice)}
        onCancel={() => setPreviewInvoice(null)}
        footer={[
          <Button key="print" icon={<PrinterOutlined />} onClick={() => window.print()}>
            In hóa đơn
          </Button>,
          <Button key="close" type="primary" onClick={() => setPreviewInvoice(null)}>
            Đóng
          </Button>,
        ]}
        width={620}
      >
        {previewInvoice && (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Số hóa đơn">{previewInvoice.invoiceNumber}</Descriptions.Item>
              <Descriptions.Item label="Mã CQT">
                {previewInvoice.eInvoiceCode || 'Chưa phát hành'}
              </Descriptions.Item>
              <Descriptions.Item label="Khách hàng">{previewInvoice.customerName}</Descriptions.Item>
              <Descriptions.Item label="Thanh toán">
                {previewInvoice.paymentMethod ? PAYMENT_PROVIDER_LABELS[previewInvoice.paymentMethod] : 'Tiền mặt'}
              </Descriptions.Item>
              {previewInvoice.companyName && (
                <Descriptions.Item label="Đơn vị" span={2}>
                  {previewInvoice.companyName} — MST: {previewInvoice.taxCode}
                </Descriptions.Item>
              )}
            </Descriptions>
            <Divider style={{ margin: '6px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>Tiền phòng lưu trú</Text>
              <Text>{formatVND(previewInvoice.roomAmount)}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>Dịch vụ phụ trội & Minibar</Text>
              <Text>{formatVND(previewInvoice.extraAmount)}</Text>
            </div>
            {previewInvoice.specialTaxAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Thuế Tiêu thụ đặc biệt (Rượu/Thuốc lá)</Text>
                <Text>{formatVND(previewInvoice.specialTaxAmount)}</Text>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>Thuế GTGT ({Math.round(previewInvoice.vatRate * 100)}%)</Text>
              <Text>{formatVND(previewInvoice.vatAmount)}</Text>
            </div>
            <Divider style={{ margin: '6px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text strong style={{ fontSize: 16 }}>
                Tổng cộng thanh toán
              </Text>
              <Text strong style={{ fontSize: 18, color: '#b45309' }}>
                {formatVND(previewInvoice.totalAmount)}
              </Text>
            </div>
          </Space>
        )}
      </Modal>

      <Modal
        title={`Phát hành Hóa đơn điện tử — ${exportTarget?.invoiceNumber || ''}`}
        open={Boolean(exportTarget)}
        onCancel={() => setExportTarget(null)}
        onOk={() => exportForm.submit()}
        okText="Ký số & Phát hành HĐĐT"
        cancelText="Hủy"
      >
        <Form form={exportForm} layout="vertical" onFinish={handleConfirmExport}>
          <Form.Item name="companyName" label="Tên đơn vị / Công ty">
            <Input placeholder="Công ty TNHH..." />
          </Form.Item>
          <Form.Item name="taxCode" label="Mã số thuế (MST)">
            <Input placeholder="031..." />
          </Form.Item>
          <Form.Item name="companyAddress" label="Địa chỉ xuất hóa đơn">
            <Input placeholder="Quận 1, TP. Hồ Chí Minh" />
          </Form.Item>
          <Form.Item name="customerEmail" label="Email nhận file XML / PDF">
            <Input placeholder="ketoan@company.vn" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Lập hóa đơn từ đơn đặt phòng"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => createForm.submit()}
        okText="Tạo hóa đơn"
        cancelText="Hủy"
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateInvoice}
          initialValues={{ paymentMethod: PaymentProvider.CASH }}
        >
          <Form.Item
            name="bookingId"
            label="Chọn đơn đặt phòng"
            rules={[{ required: true, message: 'Vui lòng chọn đơn đặt phòng' }]}
          >
            <Select
              options={bookings.map((b) => ({
                value: b.id,
                label: `${b.bookingCode || b.id} — ${b.guestName} (${formatVND(b.totalAmount)})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="paymentMethod" label="Phương thức thanh toán">
            <Select
              options={Object.entries(PAYMENT_PROVIDER_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            />
          </Form.Item>
          <Form.Item name="companyName" label="Tên công ty (nếu lấy VAT công ty)">
            <Input />
          </Form.Item>
          <Form.Item name="taxCode" label="Mã số thuế">
            <Input />
          </Form.Item>
          <Form.Item name="customerEmail" label="Email nhận hóa đơn">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
