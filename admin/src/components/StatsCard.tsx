import React from 'react';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { Card, Skeleton, Space, Typography } from 'antd';

const { Text } = Typography;

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  accentColor?: string;
  trend?: number;
  trendLabel?: string;
  subtitle?: string;
  loading?: boolean;
}

export default function StatsCard({
  title,
  value,
  icon,
  accentColor = '#b45309',
  trend,
  trendLabel,
  subtitle,
  loading = false,
}: StatsCardProps) {
  const isPositive = typeof trend === 'number' && trend >= 0;

  return (
    <Card
      className="stats-card-hover"
      bordered={false}
      style={{
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
        height: '100%',
      }}
      styles={{ body: { padding: 20 } }}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
              {title}
            </Text>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: '#0f172a',
                marginTop: 6,
                marginBottom: 8,
                lineHeight: 1.2,
              }}
            >
              {value}
            </div>
            <Space size={6} wrap>
              {typeof trend === 'number' && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: 12,
                    fontWeight: 600,
                    color: isPositive ? '#16a34a' : '#dc2626',
                    backgroundColor: isPositive ? '#dcfce7' : '#fee2e2',
                    padding: '2px 8px',
                    borderRadius: 999,
                  }}
                >
                  {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  {Math.abs(trend).toFixed(1)}%
                </span>
              )}
              {(trendLabel || subtitle) && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {trendLabel || subtitle}
                </Text>
              )}
            </Space>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: `${accentColor}15`,
              color: accentColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        </div>
      )}
    </Card>
  );
}
