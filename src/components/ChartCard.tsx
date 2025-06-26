import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartCardProps {
  marketData: any;
  selectedIndex: string;
}

export function ChartCard({ marketData, selectedIndex }: ChartCardProps) {
  const [chartData, setChartData] = useState<Array<{time: string, price: number}>>([]);

  useEffect(() => {
    if (marketData?.ltp) {
      const now = new Date();
      const timeString = now.toLocaleTimeString();
      
      setChartData(prev => {
        const newData = [...prev, { time: timeString, price: marketData.ltp }];
        // Keep only last 50 data points
        return newData.slice(-50);
      });
    }
  }, [marketData]);

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">{selectedIndex} Live Chart</h3>
      
      <div className="h-64">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="time" 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => value.split(':').slice(0, 2).join(':')}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                domain={['dataMin - 10', 'dataMax + 10']}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#3B82F6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Waiting for market data...</p>
          </div>
        )}
      </div>
    </div>
  );
}