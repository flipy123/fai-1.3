import React from 'react';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

interface OrdersCardProps {
  orders: Array<{
    id: string;
    symbol: string;
    side: string;
    quantity: number;
    price: number;
    status: string;
    timestamp: string;
  }>;
}

export function OrdersCard({ orders }: OrdersCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETE':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETE':
        return 'text-green-400';
      case 'PENDING':
        return 'text-yellow-400';
      case 'REJECTED':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Recent Orders</h3>
      
      {orders && orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="bg-gray-700 rounded-lg p-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-medium text-white text-sm">{order.symbol}</h4>
                  <p className="text-xs text-gray-400">
                    {order.side} {order.quantity} @ ₹{order.price}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(order.status)}
                  <span className={`text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                {new Date(order.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-400">No recent orders</p>
        </div>
      )}
    </div>
  );
}