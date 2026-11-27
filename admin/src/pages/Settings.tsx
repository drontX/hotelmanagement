import { useEffect, useState } from 'react';
import { SaveOutlined } from '@ant-design/icons';
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Switch, Tabs, Typography, message } from 'antd';
import { settingsApi } from '@/services/api';
import { DEFAULT_DEPOSIT_RATE, DEFAULT_VAT_RATE } from '@/types';
import type { HotelSettings } from '@/types';

const { Text, Title } = Typography;

const DEFAULT_SETTINGS: HotelSettings = {
  hotelName: 'Grand Saigon Hotel',
  address: '88 Đồng Khởi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
  phone: '(028) 3829 8888',
  email: 'contact@grandsaigon.vn',
  taxCode: '0309998888',
  checkInTime: '14:00',
  checkOutTime: '12:00',
  vatRate: DEFAULT_VAT_RATE * 100,
  depositRate: DEFAULT_DEPOSIT_RATE * 100,
  weekendMultiplier: 1.2,
  holidayMultiplier: 1.4,
  earlyCheckInBefore6Fee: 100,
  earlyCheckIn6To9Fee: 50,
  earlyCheckIn9To14Fee: 30,
  lateCheckOut12To15Fee: 30,
  lateCheckOut15To18Fee: 50,
  lateCheckOutAfter18Fee: 100,
  eInvoiceProvider: 'VNPT_INVOICE',
  eInvoiceApiUrl: 'https://api-einvoice.vnpt.vn/v2',
  eInvoiceEnabled: true,
  autoAssignHousekeeping: true,
  socketNotifications: true,
  channelSyncIntervalMinutes: 5,
};

export default function Settings() {
  const [form] = Form.useForm<HotelSettings>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    form.setFieldsValue(DEFAULT_SETTINGS);
    settingsApi
      .get()
      .then((res) => {
        if (res && res.hotelName) form.setFieldsValue(res);
      })
      .catch(() => {});
  }, [form]);

  const handleSave = async (values: HotelSettings) => {
    setSaving(true);
    try {
      await settingsApi.update(values);
    } catch {
      // Keep local values saved in form
    } finally {
      setSaving(false);
    }
    message.success('Đã lưu cấu hình hệ thống khách sạn');
  };

  return (
    <div style={{ maxWidth: 1000 }}>
      <div className="page-header-row">
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Cài đặt hệ thống
          </Title>
          <Text type="secondary">Thiết lập thông tin khách sạn, biểu giá phụ thu, thuế VAT và kết nối HĐĐT</Text>
        </div>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => form.submit()}>
          Lưu cấu hình
        </Button>
      </div>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Tabs
            items={[
              {
                key: 'general',
                label: 'Thông tin khách sạn',
                children: (
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item name="hotelName" label="Tên khách sạn" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="taxCode" label="Mã số thuế doanh nghiệp">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="phone" label="Hotline lễ tân">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="email" label="Email liên hệ">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="address" label="Địa chỉ">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Item name="checkInTime" label="Giờ nhận phòng chuẩn">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Item name="checkOutTime" label="Giờ trả phòng chuẩn">
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'pricing',
                label: 'Chính sách giá & Phụ thu',
                children: (
                  <Row gutter={16}>
                    <Col xs={12} md={6}>
                      <Form.Item name="depositRate" label="Tỷ lệ đặt cọc (%)">
                        <InputNumber min={0} max={100} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Item name="weekendMultiplier" label="Hệ số cuối tuần (x)">
                        <InputNumber min={1} max={3} step={0.05} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Item name="holidayMultiplier" label="Hệ số Lễ/Tết (x)">
                        <InputNumber min={1} max={5} step={0.05} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Item name="earlyCheckInBefore6Fee" label="Check-in sớm <06:00 (%)">
                        <InputNumber min={0} max={100} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Item name="earlyCheckIn6To9Fee" label="Check-in sớm 06:00-09:00 (%)">
                        <InputNumber min={0} max={100} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Item name="earlyCheckIn9To14Fee" label="Check-in sớm 09:00-14:00 (%)">
                        <InputNumber min={0} max={100} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Item name="lateCheckOut12To15Fee" label="Check-out muộn 12:00-15:00 (%)">
                        <InputNumber min={0} max={100} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={6}>
                      <Form.Item name="lateCheckOut15To18Fee" label="Check-out muộn 15:00-18:00 (%)">
                        <InputNumber min={0} max={100} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'tax',
                label: 'Thuế & Hóa đơn điện tử',
                children: (
                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item name="vatRate" label="Thuế suất GTGT / VAT (%)">
                        <InputNumber min={0} max={20} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="eInvoiceProvider" label="Nhà cung cấp HĐĐT">
                        <Select
                          options={[
                            { value: 'VNPT_INVOICE', label: 'VNPT Invoice' },
                            { value: 'VIETTEL_SINVOICE', label: 'Viettel S-Invoice' },
                            { value: 'MISA_MEINVOICE', label: 'MISA meInvoice' },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="eInvoiceEnabled" label="Kích hoạt xuất HĐĐT" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="eInvoiceApiUrl" label="Đường dẫn API Hóa đơn điện tử">
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'operations',
                label: 'Vận hành & Realtime',
                children: (
                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item
                        name="autoAssignHousekeeping"
                        label="Tự tạo tác vụ dọn phòng khi Check-out"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item
                        name="socketNotifications"
                        label="Thông báo Socket.IO Realtime"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="channelSyncIntervalMinutes" label="Chu kỳ đồng bộ OTA (phút)">
                        <InputNumber min={1} max={60} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
            ]}
          />
        </Form>
      </Card>
    </div>
  );
}
