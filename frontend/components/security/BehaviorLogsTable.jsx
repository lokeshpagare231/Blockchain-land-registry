const FILTER_ROLE_OPTIONS = ["all", "registrar", "admin", "clerk", "operator", "system"];
const FILTER_ACTION_OPTIONS = [
  "all",
  "user_login",
  "property_registration",
  "property_transfer_approval",
  "document_upload",
  "document_override",
  "smart_contract_execution",
  "blockchain_node_interaction",
  "admin_action",
  "sensitive_record_access"
];

function shortWallet(value) {
  if (!value) return "-";
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export default function BehaviorLogsTable({ logs = [], filters, onFilterChange }) {
  return (
    <section className="panel p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Behavior Logs</h2>
        <div className="text-xs text-slate-400">Updates every 5 seconds</div>
      </div>

      <div className="mt-4 grid gap-2 lg:grid-cols-5">
        <input
          placeholder="User ID"
          value={filters.user_id || ""}
          onChange={(e) => onFilterChange({ ...filters, user_id: e.target.value })}
        />
        <select value={filters.role || "all"} onChange={(e) => onFilterChange({ ...filters, role: e.target.value })}>
          {FILTER_ROLE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              Role: {option}
            </option>
          ))}
        </select>
        <select value={filters.action || "all"} onChange={(e) => onFilterChange({ ...filters, action: e.target.value })}>
          {FILTER_ACTION_OPTIONS.map((option) => (
            <option key={option} value={option}>
              Action: {option}
            </option>
          ))}
        </select>
        <input type="date" value={filters.date_from || ""} onChange={(e) => onFilterChange({ ...filters, date_from: e.target.value })} />
        <input type="date" value={filters.date_to || ""} onChange={(e) => onFilterChange({ ...filters, date_to: e.target.value })} />
      </div>

      <div className="table-wrap mt-4">
        <table className="min-w-full border-collapse text-xs text-slate-300">
          <thead>
            <tr className="bg-slate-800/70 text-left text-slate-200">
              <th className="p-2">user_id</th>
              <th className="p-2">role</th>
              <th className="p-2">action</th>
              <th className="p-2">property_id</th>
              <th className="p-2">timestamp</th>
              <th className="p-2">ip_address</th>
              <th className="p-2">wallet_address</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-slate-700">
                <td className="p-2 font-medium">{log.user_id}</td>
                <td className="p-2">{log.role}</td>
                <td className="p-2">{log.action}</td>
                <td className="p-2">{log.property_id || "-"}</td>
                <td className="p-2">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="p-2">{log.ip_address}</td>
                <td className="p-2 font-mono">{shortWallet(log.wallet_address)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
