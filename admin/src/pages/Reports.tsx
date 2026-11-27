import { useEffect, useMemo, useState } from 'react';
import { DownloadOutlined } from '@ant-design/icons';
import { Button, Card, Col, DatePicker, Row, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import StatsCard from '@/components/StatsCard';
import { reportsApi } from '@/services/api';
import { formatVND } from '@/types';
import type { OccupancyReportPoint, RevenueReportPoint, TaxSummaryRow } from '@/types';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const FALLBACK_REVENUE: RevenueReportPoint[] = Array.from({ length: 10 }, (_, i) => {
  const date = dayjs().subtract(9 - i, 'day').format('DD/MM');
  const direct = 14000000 + (i % 4) * 3500000;
  const ota = 11000000 + (i % 3) * 2800000;
  return {
    date,
    revenue: direct + ota,
    directRevenue: direct,
    otaRevenue: ota,
    bookings: 9 + (i % 5),
  };
});

const FALLBACK_OCCUPANCY: OccupancyReportPoint[] = Array.from({ length: 10 }, (_, i) => {
  const date = dayjs().subtract(9 - i, 'day').format('DD/MM');
  const occupancyRate = 62 + ((i * 7) % 30);
  const adr = 1950000 + (i % 3) * 220000;
  return {
    date,
    occupancyRate,
    adr,
    revpar: Math.round((adr * occupancyRate) / 100),
    occupiedRooms: Math.round((12 * occupancyRate) / 100),
    totalRooms: 12,
  };
});

const FALLBACK_TAX_ROWS: TaxSummaryRow[] = [
  {
    period: 'Quý 1 / 2026',
    roomRevenue: 680000000,
    standardServiceRevenue: 92000000,
    alcoholRevenue: 28000000,
    tobaccoRevenue: 9500000,
    vatAmount: 64760000,
    specialConsumptionTax: 25325000,
    totalTax: 90085000,
  },
  {
    period: 'Quý 2 / 2026',
    roomRevenue: 745000000,
    standardServiceRevenue: 105000000,
    alcoholRevenue: 34000000,
    tobaccoRevenue: 11000000,
    vatAmount: 71600000,
    specialConsumptionTax: 30350000,
    totalTax: 101950000,
  },
  {
    period: 'Quý 3 / 2026',
    roomRevenue: 810000000,
    standardServiceRevenue: 118000000,
    alcoholRevenue: 39000000,
    tobaccoRevenue: 12500000,
    vatAmount: 78360000,
    specialConsumptionTax: 34725000,
    totalTax: 113085000,
  },
  {
    period: 'Quý 4 / 2026 (Tạm tính)',
    roomRevenue: 520000000,
    standardServiceRevenue: 76000000,
    alcoholRevenue: 24000000,
    tobaccoRevenue: 7800000,
    vatAmount: 50224000,
    specialConsumptionTax: 21450000,
    totalTax: 71674000,
  },
];

export default function Reports() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(9, 'day'), dayjs()]);
  const [revenueData, setRevenueData] = useState<RevenueReportPoint[]>(FALLBACK_REVENUE);
  const [occupancyData, setOccupancyData] = useState<OccupancyReportPoint[]>(FALLBACK_OCCUPANCY);
  const [taxRows, setTaxRows] = useState<TaxSummaryRow[]>(FALLBACK_TAX_ROWS);

  useEffect(() => {
    const params = {
      from: range[0].format('YYYY-MM-DD'),
      to: range[1].format('YYYY-MM-DD'),
    };
    reportsApi.getRevenue(params).then((r) => r?.length && setRevenueData(r)).catch(() => {});
    reportsApi.getOccupancy(params).then((r) => r?.length && setOccupancyData(r)).catch(() => {});
    reportsApi.getTaxSummary().then((r) => r?.length && setTaxRows(r)).catch(() => {});
  }, [range]);

  const summary = useMemo(() => {
    const totalRevenue = revenueData.reduce((s, d) => s + d.revenue, 0);
    const avgOccupancy =
      occupancyData.reduce((s, d) => s + d.occupancyRate, 0) / (occupancyData.length || 1);
    const avgAdr = occupancyData.reduce((s, d) => s + d.adr, 0) / (occupancyData.length || 1);
    const avgRevpar = occupancyData.reduce((s, d) => s + d.revpar, 0) / (occupancyData.length || 1);
    return { totalRevenue, avgOccupancy, avgAdr, avgRevpar };
  }, [revenueData, occupancyData]);

  const handleExportCsv = () => {
    const header = 'Ky,DoanhThuPhong,DichVuChuan,RuouBia,ThuocLa,VAT8,TTDB,TongThue\n';
    const body = taxRows
      .map(
        (r) =>
          `"${r.period}",${r.roomRevenue},${r.standardServiceRevenue},${r.alcoholRevenue},${r.tobaccoRevenue},${r.vatAmount},${r.specialConsumptionTax},${r.totalTax}`
      )
      .join('\n');
    const blob = new Blob([`\uFEFF${header}${body}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bao-cao-thue-${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('Đã xuất file CSV báo cáo thuế');
  };

  const taxColumns: ColumnsType<TaxSummaryRow> = [
    { title: 'Kỳ kê khai', dataIndex: 'period', key: 'period', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Doanh thu phòng', dataIndex: 'roomRevenue', key: 'roomRevenue', align: 'right', render: formatVND },
    {
      title: 'Dịch vụ chuẩn',
      dataIndex: 'standardServiceRevenue',
      key: 'standardServiceRevenue',
      align: 'right',
      render: formatVND,
    },
    {
      title: 'Rượu/Bia (TTĐB 65%)',
      dataIndex: 'alcoholRevenue',
      key: 'alcoholRevenue',
      align: 'right',
      render: formatVND,
    },
    {
      title: 'Thuốc lá (TTĐB 75%)',
      dataIndex: 'tobaccoRevenue',
      key: 'tobaccoRevenue',
      align: 'right',
      render: formatVND,
    },
    {
      title: 'Thuế GTGT (8%)',
      dataIndex: 'vatAmount',
      key: 'vatAmount',
      align: 'right',
      render: (v: number) => <Tag color="blue">{formatVND(v)}</Tag>,
    },
    {
      title: 'Thuế TTĐB',
      dataIndex: 'specialConsumptionTax',
      key: 'specialConsumptionTax',
      align: 'right',
      render: (v: number) => <Tag color="orange">{formatVND(v)}</Tag>,
    },
    {
      title: 'Tổng thuế phải nộp',
      dataIndex: 'totalTax',
      key: 'totalTax',
      align: 'right',
      render: (v: number) => <Text strong style={{ color: '#b45309' }}>{formatVND(v)}</Text>,
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div className="page-header-row" style={{ marginBottom: 0 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Báo cáo tài chính & Chỉ số vận hành
          </Title>
          <Text type="secondary">Phân tích doanh thu, ADR, RevPAR, tỷ lệ lấp đầy và sổ tổng hợp thuế</Text>
        </div>
        <Space>
          <RangePicker
            value={range}
            format="DD/MM/YYYY"
            onChange={(vals) => vals && vals[0] && vals[1] && setRange([vals[0], vals[1]])}
          />
          <Button icon={<DownloadOutlined />} onClick={handleExportCsv}>
            Xuất CSV Thuế
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatsCard title="Tổng doanh thu kỳ" value={formatVND(summary.totalRevenue)} icon={<span style={{ fontWeight: 700 }}>₫</span>} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatsCard
            title="Công suất phòng TB"
            value={`${summary.avgOccupancy.toFixed(1)}%`}
            icon={<span style={{ fontWeight: 700 }}>%</span>}
            accentColor="#1d4ed8"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatsCard
            title="ADR (Giá bán TB/đêm)"
            value={formatVND(summary.avgAdr)}
            icon={<span style={{ fontWeight: 700 }}>ADR</span>}
            accentColor="#16a34a"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatsCard
            title="RevPAR"
            value={formatVND(summary.avgRevpar)}
            icon={<span style={{ fontWeight: 700 }}>REV</span>}
            accentColor="#7c3aed"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card bordered={false} style={{ borderRadius: 12 }} title="Doanh thu Trực tiếp vs OTA">
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(v: number) => `${Math.round(v / 1000000)}M`} />
                  <Tooltip formatter={(value: number) => formatVND(value)} />
                  <Legend />
                  <Bar dataKey="directRevenue" name="Trực tiếp" stackId="rev" fill="#b45309" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="otaRevenue" name="Kênh OTA" stackId="rev" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card bordered={false} style={{ borderRadius: 12 }} title="Tỷ lệ lấp đầy (%) & RevPAR">
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <ComposedChart data={occupancyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" unit="%" domain={[0, 100]} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(v: number) => `${Math.round(v / 1000000)}M`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name.includes('%') ? `${value}%` : formatVND(value)
                    }
                  />
                  <Legend />
                  <Bar yAxisId="right" dataKey="revpar" name="RevPAR" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="occupancyRate"
                    name="Tỷ lệ lấp đầy (%)"
                    stroke="#16a34a"
                    strokeWidth={2.5}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      <Card bordered={false} style={{ borderRadius: 12 }} title="Tổng hợp thuế GTGT (8%) & Thuế Tiêu thụ đặc biệt theo quý">
        <Table rowKey="period" columns={taxColumns} dataSource={taxRows} pagination={false} scroll={{ x: 900 }} />
      </Card>
    </Space>
  );
}
