import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

const emptyBank = {
  bankName: "",
  bankAccountNumber: "",
  bankCardNumber: "",
  bankIban: "",
  bankAccountHolder: "",
};

function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toLocaleString("en-US", {
    maximumFractionDigits: 8,
  });
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-US");
}

export default function SuperAdmin() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [stats, setStats] = useState({});
  const [admins, setAdmins] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [feeSummary, setFeeSummary] = useState({});
  const [recipient, setRecipient] = useState(null);

  const [bank, setBank] = useState(emptyBank);

  const [adminForm, setAdminForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "ADMIN",
  });

  const [settlementForm, setSettlementForm] = useState({
    asset: "USDT",
    amount: "",
    trackingNumber: "",
    description: "",
  });

  const token = localStorage.getItem(
    "hypertrade_token"
  );

  const request = async (path, options = {}) => {
    if (!token) {
      navigate("/");
      throw new Error("Authentication required");
    }

    const response = await fetch(
      `${API_URL}${path}`,
      {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
      }
    );

    const data =
      await response.json().catch(() => ({}));

    if (response.status === 401) {
      localStorage.removeItem("hypertrade_token");
      localStorage.removeItem("hypertrade_user");
      navigate("/");
      throw new Error(
        "Authentication required"
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.message || "Request failed"
      );
    }

    return data;
  };

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const [
        statsData,
        adminsData,
        recipientData,
        bankData,
        ticketData,
        feeSummaryData,
        settlementData,
      ] = await Promise.all([
        request("/api/admin/stats"),
        request("/api/admin/admins"),
        request("/api/admin/fee-recipient"),
        request("/api/admin/fee-bank-account"),
        request("/api/support/tickets"),
        request("/api/fees/summary"),
        request("/api/fees/settlements"),
      ]);

      setStats(statsData.stats || {});
      setAdmins(adminsData.admins || []);
      setRecipient(
        recipientData.recipient || null
      );
      setBank({
        ...emptyBank,
        ...(bankData.bankAccount || {}),
      });
      setTickets(ticketData.tickets || []);
      setFeeSummary(
        feeSummaryData.summary || {}
      );
      setSettlements(
        settlementData.settlements || []
      );
    } catch (err) {
      setError(
        err.message ||
          "Unable to load super admin panel"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totalOpenTickets = useMemo(
    () =>
      tickets.filter(
        (ticket) =>
          ticket.status !== "CLOSED"
      ).length,
    [tickets]
  );

  const createAdmin = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await request("/api/admin/admins", {
        method: "POST",
        body: JSON.stringify(adminForm),
      });

      setAdminForm({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        role: "ADMIN",
      });

      setMessage(
        "Administrator created successfully."
      );

      await load();
    } catch (err) {
      setError(
        err.message ||
          "Unable to create administrator"
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteAdmin = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this administrator?"
      )
    ) {
      return;
    }

    try {
      await request(
        `/api/admin/admins/${id}`,
        {
          method: "DELETE",
        }
      );

      setMessage(
        "Administrator deleted successfully."
      );

      await load();
    } catch (err) {
      setError(
        err.message ||
          "Unable to delete administrator"
      );
    }
  };

  const saveBank = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await request(
        "/api/admin/fee-bank-account",
        {
          method: "PUT",
          body: JSON.stringify(bank),
        }
      );

      setMessage(
        "Fee bank account updated successfully."
      );
    } catch (err) {
      setError(
        err.message ||
          "Unable to update bank account"
      );
    } finally {
      setSaving(false);
    }
  };

  const createSettlement = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await request(
        "/api/fees/settlements",
        {
          method: "POST",
          body: JSON.stringify({
            ...settlementForm,
            amount: Number(
              settlementForm.amount
            ),
          }),
        }
      );

      setSettlementForm({
        asset: "USDT",
        amount: "",
        trackingNumber: "",
        description: "",
      });

      setMessage(
        "Fee settlement recorded successfully."
      );

      await load();
    } catch (err) {
      setError(
        err.message ||
          "Unable to record fee settlement"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
          <p className="text-zinc-400">
            Loading Super Admin Console...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.25em] text-blue-400">
              HYPER TRADE
            </p>

            <h1 className="mt-2 text-3xl font-black">
              Super Admin Console
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Full platform administration and
              financial control
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/dashboard")
            }
            className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-bold hover:border-blue-500"
          >
            Back to Trading
          </button>
        </header>

        {message && (
          <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            [
              "Users",
              stats.users || 0,
              "text-blue-400",
            ],
            [
              "Completed Orders",
              stats.completedOrders || 0,
              "text-emerald-400",
            ],
            [
              "Pending KYC",
              stats.pendingKyc || 0,
              "text-yellow-400",
            ],
            [
              "High Risk",
              stats.highRisk || 0,
              "text-orange-400",
            ],
            [
              "Open Support",
              totalOpenTickets,
              "text-purple-400",
            ],
          ].map(([label, value, accent]) => (
            <div
              key={label}
              className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-5"
            >
              <p className="text-sm text-zinc-500">
                {label}
              </p>

              <p
                className={`mt-3 text-3xl font-black ${accent}`}
              >
                {formatNumber(value)}
              </p>
            </div>
          ))}
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6">
            <p className="text-xs font-black tracking-[0.2em] text-blue-400">
              ADMINISTRATION
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Create Administrator
            </h2>

            <form
              onSubmit={createAdmin}
              className="mt-5 space-y-3"
            >
              <input
                required
                placeholder="Full name"
                value={adminForm.fullName}
                onChange={(event) =>
                  setAdminForm({
                    ...adminForm,
                    fullName:
                      event.target.value,
                  })
                }
                className="w-full rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 outline-none focus:border-blue-500"
              />

              <input
                required
                type="email"
                placeholder="Email"
                value={adminForm.email}
                onChange={(event) =>
                  setAdminForm({
                    ...adminForm,
                    email:
                      event.target.value,
                  })
                }
                className="w-full rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 outline-none focus:border-blue-500"
              />

              <input
                placeholder="Phone"
                value={adminForm.phone}
                onChange={(event) =>
                  setAdminForm({
                    ...adminForm,
                    phone:
                      event.target.value,
                  })
                }
                className="w-full rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 outline-none focus:border-blue-500"
              />

              <input
                required
                minLength={8}
                type="password"
                placeholder="Password"
                value={adminForm.password}
                onChange={(event) =>
                  setAdminForm({
                    ...adminForm,
                    password:
                      event.target.value,
                  })
                }
                className="w-full rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 outline-none focus:border-blue-500"
              />

              <select
                value={adminForm.role}
                onChange={(event) =>
                  setAdminForm({
                    ...adminForm,
                    role: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="ADMIN">
                  ADMIN
                </option>

                <option value="SUPER_ADMIN">
                  SUPER_ADMIN
                </option>
              </select>

              <button
                disabled={saving}
                className="w-full rounded-xl bg-blue-600 px-5 py-3 font-black hover:bg-blue-500 disabled:opacity-50"
              >
                {saving
                  ? "Processing..."
                  : "Create Administrator"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6">
            <p className="text-xs font-black tracking-[0.2em] text-emerald-400">
              FEE RECIPIENT
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Current Fee Recipient
            </h2>

            <div className="mt-5 rounded-xl border border-zinc-800 bg-[#050816] p-5">
              {recipient ? (
                <>
                  <p className="text-lg font-black">
                    {recipient.fullName}
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    {recipient.email}
                  </p>

                  <div className="mt-4 inline-flex rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400">
                    {recipient.role}
                  </div>
                </>
              ) : (
                <p className="text-red-400">
                  No fee recipient configured.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/admin")
              }
              className="mt-4 w-full rounded-xl border border-zinc-700 px-5 py-3 font-bold hover:border-emerald-500"
            >
              Manage Fee Recipient
            </button>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6">
          <p className="text-xs font-black tracking-[0.2em] text-amber-400">
            FEE BANK ACCOUNT
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Settlement Bank Account
          </h2>

          <form
            onSubmit={saveBank}
            className="mt-5 grid gap-3 md:grid-cols-2"
          >
            {[
              ["bankName", "Bank name"],
              [
                "bankAccountNumber",
                "Bank account number",
              ],
              [
                "bankCardNumber",
                "Bank card number",
              ],
              ["bankIban", "IBAN"],
              [
                "bankAccountHolder",
                "Account holder",
              ],
            ].map(([field, placeholder]) => (
              <input
                key={field}
                placeholder={placeholder}
                value={bank[field] || ""}
                onChange={(event) =>
                  setBank({
                    ...bank,
                    [field]:
                      event.target.value,
                  })
                }
                className="rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 outline-none focus:border-amber-500"
              />
            ))}

            <button
              disabled={saving}
              className="rounded-xl bg-amber-600 px-5 py-3 font-black hover:bg-amber-500 disabled:opacity-50 md:col-span-2"
            >
              Save Bank Account
            </button>
          </form>
        </section>

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6">
          <p className="text-xs font-black tracking-[0.2em] text-cyan-400">
            FEE SETTLEMENT
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Record Fee Deposit
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {Object.entries(feeSummary).map(
              ([asset, values]) => (
                <div
                  key={asset}
                  className="rounded-xl border border-zinc-800 bg-[#050816] p-4"
                >
                  <div className="flex justify-between">
                    <span className="font-black">
                      {asset}
                    </span>

                    <span className="text-xs text-zinc-500">
                      Available
                    </span>
                  </div>

                  <p className="mt-3 text-2xl font-black text-cyan-400">
                    {formatNumber(
                      values.available
                    )}
                  </p>

                  <p className="mt-2 text-xs text-zinc-500">
                    Accrued:{" "}
                    {formatNumber(
                      values.accrued
                    )}
                  </p>
                </div>
              )
            )}
          </div>

          <form
            onSubmit={createSettlement}
            className="mt-6 grid gap-3 md:grid-cols-2"
          >
            <select
              value={
                settlementForm.asset
              }
              onChange={(event) =>
                setSettlementForm({
                  ...settlementForm,
                  asset:
                    event.target.value,
                })
              }
              className="rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3"
            >
              <option value="USDT">
                USDT
              </option>
              <option value="BTC">
                BTC
              </option>
              <option value="ETH">
                ETH
              </option>
              <option value="SOL">
                SOL
              </option>
              <option value="TRX">
                TRX
              </option>
              <option value="RIAL">
                RIAL
              </option>
            </select>

            <input
              required
              type="number"
              step="any"
              min="0.00000001"
              placeholder="Settlement amount"
              value={
                settlementForm.amount
              }
              onChange={(event) =>
                setSettlementForm({
                  ...settlementForm,
                  amount:
                    event.target.value,
                })
              }
              className="rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3"
            />

            <input
              required
              placeholder="Bank tracking number"
              value={
                settlementForm.trackingNumber
              }
              onChange={(event) =>
                setSettlementForm({
                  ...settlementForm,
                  trackingNumber:
                    event.target.value,
                })
              }
              className="rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3"
            />

            <input
              placeholder="Description"
              value={
                settlementForm.description
              }
              onChange={(event) =>
                setSettlementForm({
                  ...settlementForm,
                  description:
                    event.target.value,
                })
              }
              className="rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3"
            />

            <button
              disabled={saving}
              className="rounded-xl bg-cyan-600 px-5 py-3 font-black hover:bg-cyan-500 disabled:opacity-50 md:col-span-2"
            >
              {saving
                ? "Processing..."
                : "Record Fee Deposit"}
            </button>
          </form>
        </section>

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black tracking-[0.2em] text-purple-400">
                SUPPORT
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Customer Questions
              </h2>
            </div>

            <span className="rounded-lg bg-purple-500/10 px-3 py-2 text-xs font-bold text-purple-400">
              {totalOpenTickets} open
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {tickets
              .slice(0, 20)
              .map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() =>
                    navigate(
                      `/admin/support?ticket=${ticket.id}`
                    )
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-[#050816] p-4 text-left hover:border-purple-500/50"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-bold">
                        {ticket.subject}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {ticket.user?.fullName ||
                          "Unknown user"}{" "}
                        ·{" "}
                        {ticket.user?.email ||
                          ""}
                      </p>
                    </div>

                    <span className="text-xs font-bold text-zinc-400">
                      {ticket.status}
                    </span>
                  </div>
                </button>
              ))}

            {!tickets.length && (
              <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
                No customer questions.
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6">
          <p className="text-xs font-black tracking-[0.2em] text-zinc-500">
            SETTLEMENT HISTORY
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Fee Deposits
          </h2>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="p-3">
                    Asset
                  </th>
                  <th className="p-3">
                    Amount
                  </th>
                  <th className="p-3">
                    Recipient
                  </th>
                  <th className="p-3">
                    Tracking
                  </th>
                  <th className="p-3">
                    Status
                  </th>
                  <th className="p-3">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody>
                {settlements.map(
                  (settlement) => (
                    <tr
                      key={String(
                        settlement.id
                      )}
                      className="border-b border-zinc-900"
                    >
                      <td className="p-3 font-bold">
                        {settlement.asset}
                      </td>

                      <td className="p-3">
                        {formatNumber(
                          settlement.amount
                        )}
                      </td>

                      <td className="p-3">
                        {settlement.admin
                          ?.email || "—"}
                      </td>

                      <td className="p-3">
                        {
                          settlement.trackingNumber
                        }
                      </td>

                      <td className="p-3">
                        {settlement.status}
                      </td>

                      <td className="p-3 text-zinc-500">
                        {formatDate(
                          settlement.createdAt
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6">
          <p className="text-xs font-black tracking-[0.2em] text-zinc-500">
            ADMIN ACCOUNTS
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Administrators
          </h2>

          <div className="mt-5 space-y-3">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-[#050816] p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-bold">
                    {admin.fullName}
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    {admin.email}
                  </p>

                  <p className="mt-1 text-xs text-zinc-600">
                    {admin.role}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    deleteAdmin(admin.id)
                  }
                  className="rounded-lg border border-red-500/30 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}