/**
 * WebhookStatus - Shows webhook URL and recent events
 */

const API_MULTI = 'https://api-multi.k-c-sheffield012376.workers.dev';

interface WebhookStatusProps {
  webhook: {
    lastEventAt?: string;
    recent?: any[];
  };
}

export function WebhookStatus({ webhook }: WebhookStatusProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-lg font-bold mb-3">Webhook Status</h3>
      <div className="bg-gray-900 rounded p-3 mb-3">
        <p className="text-xs text-gray-500 mb-1">Webhook URL</p>
        <code className="text-sm text-gray-300 break-all">{API_MULTI}/webhook/stripe</code>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">Last event:</span>
        <span>{webhook.lastEventAt ? new Date(webhook.lastEventAt).toLocaleString() : 'None'}</span>
      </div>
      {(webhook.recent || []).length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-xs text-gray-500 mb-2">Recent events</p>
          <div className="space-y-1">
            {webhook.recent!.slice(0, 5).map((evt: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-gray-300">{evt.type}</span>
                <span className="text-gray-500">{evt.createdAt ? new Date(evt.createdAt).toLocaleTimeString() : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
