import React, { useEffect, useRef } from 'react';
import { Clock, Play, Pause } from 'lucide-react';

interface TradeLogsCardProps {
  logs: Array<{
    type: string;
    message: string;
    timestamp: string;
  }>;
}

export function TradeLogsCard({ logs }: TradeLogsCardProps) {
  const [isPaused, setIsPaused] = React.useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPaused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  const getLogColor = (type: string) => {
    switch (type) {
      case 'test':
        return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5';
      case 'live':
        return 'text-green-400 border-green-400/30 bg-green-400/5';
      case 'error':
        return 'text-red-400 border-red-400/30 bg-red-400/5';
      default:
        return 'text-gray-400 border-gray-400/30 bg-gray-400/5';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Trade Logs</h3>
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white transition-colors"
        >
          {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          <span>{isPaused ? 'Resume' : 'Pause'}</span>
        </button>
      </div>

      <div 
        ref={scrollRef}
        className="h-64 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
      >
        {logs && logs.length > 0 ? (
          logs.map((log, index) => (
            <div key={index} className={`p-2 rounded border-l-2 ${getLogColor(log.type)}`}>
              <div className="flex items-start justify-between">
                <p className="text-sm font-mono flex-1">{log.message}</p>
                <div className="flex items-center space-x-1 ml-2">
                  <Clock className="h-3 w-3 text-gray-500" />
                  <span className="text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">No trade logs yet</p>
          </div>
        )}
      </div>
    </div>
  );
}