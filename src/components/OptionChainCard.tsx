import React from 'react';

interface OptionChainCardProps {
  optionChain: Array<{
    strike: number;
    ce: {
      ltp: number;
      bid: number;
      ask: number;
      volume: number;
      oi: number;
    };
    pe: {
      ltp: number;
      bid: number;
      ask: number;
      volume: number;
      oi: number;
    };
  }>;
}

export function OptionChainCard({ optionChain }: OptionChainCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Option Chain</h3>
      
      <div className="overflow-x-auto">
        {optionChain && optionChain.length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 text-gray-400">CE LTP</th>
                <th className="text-left py-2 text-gray-400">CE Vol</th>
                <th className="text-center py-2 text-white font-semibold">Strike</th>
                <th className="text-right py-2 text-gray-400">PE Vol</th>
                <th className="text-right py-2 text-gray-400">PE LTP</th>
              </tr>
            </thead>
            <tbody>
              {optionChain.map((strike, index) => (
                <tr key={index} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="py-2 text-green-400 font-mono">
                    {strike.ce.ltp.toFixed(2)}
                  </td>
                  <td className="py-2 text-gray-300">
                    {strike.ce.volume.toLocaleString()}
                  </td>
                  <td className="py-2 text-center font-semibold text-white">
                    {strike.strike}
                  </td>
                  <td className="py-2 text-right text-gray-300">
                    {strike.pe.volume.toLocaleString()}
                  </td>
                  <td className="py-2 text-right text-red-400 font-mono">
                    {strike.pe.ltp.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400">Loading option chain...</p>
          </div>
        )}
      </div>
    </div>
  );
}