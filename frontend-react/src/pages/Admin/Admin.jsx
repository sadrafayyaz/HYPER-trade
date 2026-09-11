import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
const RAW_API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";
const API_URL = RAW_API_URL
  .replace(/\/+$/, "")
  .replace(/\/api\/?$/, "");
function extractList(payload, key) {
  if (Array.isArray(payload?.[key])) {
    return payload[key];
  }
  if (Array.isArray(payload?.data?.[key])) {
    return payload.data[key];
  }
  if (
    key === "tickets" &&
    Array.isArray(payload?.data)
  ) {
    return payload.data;
  }
  return [];
}
function normalizeStats(payload) {
  const value =
    payload?.stats ||
    payload?.data?.stats ||
    {};
  return {
    users: Number(value.users) || 0,
    blockedUsers: Number(value.blockedUsers) || 0,
    verifiedKyc: Number(value.verifiedKyc) || 0,
    pendingKyc: Number(value.pendingKyc) || 0,
    highRisk: Number(value.highRisk) || 0,
    criticalRisk: Number(value.criticalRisk) || 0,
    totalOrders: Number(value.totalOrders) || 0,
    completedOrders: Number(value.completedOrders) || 0,
    pendingOrders: Number(value.pendingOrders) || 0,
    cancelledOrders: Number(value.cancelledOrders) || 0,
    failedOrders: Number(value.failedOrders) || 0,
    totalSupportTickets:
      Number(value.totalSupportTickets) || 0,
    openTickets:
      Number(value.openTickets) || 0,
  };
}
const emptyBank = {
  bankName: "",
  bankAccountNumber: "",
  bankCardNumber: "",
  bankIban: "",
  bankAccountHolder: "",
};
function getUser() {
  try {
    const stored = JSON.parse(localStorage.getItem("hypertrade_user") || "null");
    if (stored?.role) return stored;
    const token = localStorage.getItem("hypertrade_token") || localStorage.getItem("token");
    const payload = token?.split(".")?.[1];
    if (!payload) return stored;
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return { ...(stored || {}), ...decoded };
  } catch {
    return null;
  }
}
function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString(
    "en-US"
  );
}
export default function Admin() {
  const navigate = useNavigate();
  const user = getUser();
  const role = String(
    user?.role ||
      user?.user?.role ||
      ""
  ).toUpperCase();

  const normalizedEmail =
    String(
      user?.email ||
        user?.user?.email ||
        ""
    ).trim().toLowerCase();

  const isConfiguredSuperAdmin =
    normalizedEmail ===
    "sadrafayyaz9@gmail.com";

  const isAdmin =
    role === "ADMIN" ||
    role === "SUPER_ADMIN" ||
    isConfiguredSuperAdmin;

  const isSuperAdmin =
    role === "SUPER_ADMIN" ||
    isConfiguredSuperAdmin;
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");
  const [message, setMessage] =
    useState("");
  const [stats, setStats] =
    useState(null);
  const [users, setUsers] =
    useState([]);
  const [admins, setAdmins] =
    useState([]);
  const [recipients, setRecipients] =
    useState([]);
  const [tickets, setTickets] =
    useState([]);
  const [selectedTicketId, setSelectedTicketId] =
    useState(null);
  const [ticket, setTicket] =
    useState(null);
  const [ticketMessage, setTicketMessage] =
    useState("");
  const [ticketFile, setTicketFile] =
    useState(null);
  const [adminForm, setAdminForm] =
    useState({
      fullName: "",
      email: "",
      phone: "",
      password: "",
      role: "ADMIN",
    });
  const [recipientId, setRecipientId] =
    useState("");
  const [bank, setBank] =
    useState(emptyBank);
  const [countries, setCountries] =
    useState([]);
  const [banks, setBanks] =
    useState([]);
  const [bankLoading, setBankLoading] =
    useState(false);
  const [binLoading, setBinLoading] =
    useState(false);
  const [feeSummary, setFeeSummary] =
    useState([]);
  const [feeSettlements, setFeeSettlements] =
    useState([]);
  const [settlementPreview, setSettlementPreview] =
    useState(null);
  const [settlementLoading, setSettlementLoading] =
    useState(false);
  const [settlementForm, setSettlementForm] =
    useState({
      sourceAsset: "USDT",
      sourceAmount: "",
      destinationCountry: "IR",
      destinationCurrency: "IRR",
      bankName: "",
      bankAccountNumber: "",
      cardNumber: "",
      bankIban: "",
      bankAccountHolder: "",
      trackingNumber: "",
      description: "",
    });
  const [activeSection, setActiveSection] =
    useState(
      isSuperAdmin
        ? "overview"
        : "support"
    );
  const token =
    localStorage.getItem("hypertrade_token") ||
    localStorage.getItem("token");
  const request = useCallback(
    async (
      path,
      options = {}
    ) => {
      if (!token) {
        navigate("/");
        throw new Error(
          "Authentication required."
        );
      }
      const headers = {
        Authorization:
          `Bearer ${token}`,
        ...(options.headers || {}),
      };
      if (
        !(options.body instanceof FormData)
      ) {
        headers["Content-Type"] =
          "application/json";
      }
      const response =
        await fetch(
          `${API_URL}${path}`,
          {
            ...options,
            headers,
          }
        );
      const data =
        await response
          .json()
          .catch(() => ({}));
      if (
        response.status === 401
      ) {
        throw new Error(
          data?.message ||
            "Authentication required."
        );
      }
      if (
        response.status === 403
      ) {
        throw new Error(
          data?.message ||
            "Access denied."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Request failed."
        );
      }

      return data;
    },
    [navigate, token]
  );

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    if (!isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, navigate, token]);

  const loadOverview =
    useCallback(async () => {
      const results =
        await Promise.allSettled([
          request("/api/admin/stats"),
          request("/api/admin/users?limit=200"),
          request("/api/support/tickets?limit=500"),
        ]);

      const [
        statsResult,
        usersResult,
        supportResult,
      ] = results;

      if (
        statsResult.status ===
        "fulfilled"
      ) {
        setStats(
          normalizeStats(
            statsResult.value
          )
        );
      }

      if (
        usersResult.status ===
        "fulfilled"
      ) {
        setUsers(
          extractList(
            usersResult.value,
            "users"
          )
        );
      }

      if (
        supportResult.status ===
        "fulfilled"
      ) {
        setTickets(
          extractList(
            supportResult.value,
            "tickets"
          )
        );
      }

      const firstError =
        results.find(
          (item) =>
            item.status ===
            "rejected"
        );

      if (firstError) {
        console.error(
          "Admin data load error:",
          firstError.reason
        );
        setError(
          firstError.reason?.message ||
            "Some admin data could not be loaded."
        );
      }
    }, [request]);


  const loadCountries =
    useCallback(async () => {
      try {
        const data = await request(
          "/api/admin/bank-directory/countries"
        );
        setCountries(
          Array.isArray(data?.countries)
            ? data.countries
            : []
        );
      } catch (err) {
        console.error(
          "Country directory load error:",
          err
        );
      }
    }, [request]);

  const loadBanks =
    useCallback(async (countryCode) => {
      if (!countryCode) {
        setBanks([]);
        return;
      }

      setBankLoading(true);

      try {
        const data = await request(
          `/api/admin/bank-directory/banks?country=${encodeURIComponent(
            countryCode
          )}&limit=2000`
        );

        setBanks(
          Array.isArray(data?.banks)
            ? data.banks
            : []
        );
      } catch (err) {
        setError(
          err.message ||
            "Unable to load banks for selected country."
        );
        setBanks([]);
      } finally {
        setBankLoading(false);
      }
    }, [request]);

  const lookupCardBin =
    async () => {
      const cardNumber =
        settlementForm.cardNumber.trim();

      if (
        cardNumber.replace(/\D/g, "").length < 6
      ) {
        setError(
          "Enter at least the first 6 digits of the card number."
        );
        return;
      }

      setBinLoading(true);
      setError("");

      try {
        const data = await request(
          "/api/admin/bank-directory/bin-lookup",
          {
            method: "POST",
            body: JSON.stringify({
              cardNumber,
            }),
          }
        );

        const detectedCountry =
          data?.country?.code ||
          data?.countryCode ||
          "";

        setSettlementForm(
          (previous) => ({
            ...previous,
            destinationCountry:
              detectedCountry ||
              previous.destinationCountry,
            destinationCurrency:
              data?.currency ||
              previous.destinationCurrency,
            bankName:
              data?.bankName ||
              previous.bankName,
            cardNumber,
          })
        );

        if (detectedCountry) {
          await loadBanks(
            detectedCountry
          );
        }

        setMessage(
          data?.bankName
            ? `Card issuer detected: ${data.bankName}`
            : "Card country detected."
        );
      } catch (err) {
        setError(
          err.message ||
            "Unable to resolve card issuer."
        );
      } finally {
        setBinLoading(false);
      }
    };

  const previewFeeSettlement =
    async () => {
      if (
        !settlementForm.sourceAmount
      ) {
        setError(
          "Settlement amount is required."
        );
        return;
      }

      setError("");
      setSettlementPreview(null);

      try {
        const data = await request(
          "/api/admin/fee-settlements/preview",
          {
            method: "POST",
            body: JSON.stringify({
              sourceAsset:
                settlementForm.sourceAsset,
              sourceAmount:
                settlementForm.sourceAmount,
              destinationCountry:
                settlementForm.destinationCountry,
              destinationCurrency:
                settlementForm.destinationCurrency,
            }),
          }
        );

        setSettlementPreview(data);
      } catch (err) {
        setError(
          err.message ||
            "Unable to calculate settlement."
        );
      }
    };

  const submitFeeSettlement =
    async (event) => {
      event.preventDefault();

      setSettlementLoading(true);
      setError("");
      setMessage("");

      try {
        const data = await request(
          "/api/admin/fee-settlements",
          {
            method: "POST",
            body: JSON.stringify(
              settlementForm
            ),
          }
        );

        setMessage(
          data?.message ||
            "Fee settlement recorded successfully."
        );

        setSettlementPreview(null);

        setSettlementForm(
          (previous) => ({
            ...previous,
            sourceAmount: "",
            trackingNumber: "",
            description: "",
            cardNumber: "",
          })
        );

        await loadSuperAdmin();
      } catch (err) {
        setError(
          err.message ||
            "Unable to record fee settlement."
        );
      } finally {
        setSettlementLoading(false);
      }
    };

  const deleteUser =
    async (id) => {
      if (
        !window.confirm(
          "Delete this user account permanently?"
        )
      ) {
        return;
      }

      try {
        setError("");
        setMessage("");

        await request(
          `/api/admin/users/${id}`,
          {
            method: "DELETE",
          }
        );

        setMessage(
          "User account deleted successfully."
        );

        await loadOverview();
      } catch (err) {
        setError(
          err.message ||
            "Unable to delete user."
        );
      }
    };

  const loadSuperAdmin =
    useCallback(async () => {
      if (!isSuperAdmin) {
        return;
      }

      try {
        const [
          adminData,
          recipientData,
          bankData,
          summaryData,
          settlementsData,
        ] = await Promise.all([
          request(
            "/api/admin/admins"
          ),

          request(
            "/api/admin/fee-recipient"
          ),

          request(
            "/api/admin/fee-bank-account"
          ),

          request(
            "/api/admin/fee-summary"
          ),

          request(
            "/api/admin/fee-settlements?limit=100"
          ),
        ]);

        const adminList =
          extractList(
            adminData,
            "admins"
          );

        setAdmins(adminList);
        setRecipients(adminList);

        setRecipientId(
          recipientData?.recipient?.id
            ? String(
                recipientData.recipient.id
              )
            : ""
        );

        setBank({
          ...emptyBank,
          ...(bankData?.bankAccount ||
            {}),
        });

        setFeeSummary(
          summaryData?.summary || []
        );

        setFeeSettlements(
          settlementsData?.settlements ||
            []
        );

        setSettlementForm(
          (previous) => ({
            ...previous,
            destinationCountry:
              bankData?.bankAccount
                ?.destinationCountry ||
              previous.destinationCountry,
            destinationCurrency:
              bankData?.bankAccount
                ?.destinationCurrency ||
              previous.destinationCurrency,
            bankName:
              bankData?.bankAccount
                ?.bankName ||
              previous.bankName,
            bankAccountNumber:
              bankData?.bankAccount
                ?.bankAccountNumber ||
              previous.bankAccountNumber,
            cardNumber:
              bankData?.bankAccount
                ?.bankCardNumber ||
              previous.cardNumber,
            bankIban:
              bankData?.bankAccount
                ?.bankIban ||
              previous.bankIban,
            bankAccountHolder:
              bankData?.bankAccount
                ?.bankAccountHolder ||
              previous.bankAccountHolder,
          })
        );

        if (
          bankData?.bankAccount
            ?.destinationCountry
        ) {
          await loadBanks(
            bankData.bankAccount
              .destinationCountry
          );
        }
      } catch (err) {
        setError(
          err.message ||
            "Unable to load Super Admin settings."
        );
      }
    }, [
      isSuperAdmin,
      request,
      loadBanks,
    ]);

  const load =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        await loadOverview();
        await loadCountries();

        if (isSuperAdmin) {
          await loadSuperAdmin();
        }
      } finally {
        setLoading(false);
      }
    }, [
      isSuperAdmin,
      loadOverview,
      loadCountries,
      loadSuperAdmin,
    ]);

  useEffect(() => {
    if (isAdmin) {
      load();
    }
  }, [
    isAdmin,
    load,
  ]);

  const loadTicket =
    async (ticketId) => {
      try {
        setSelectedTicketId(
          ticketId
        );

        const data =
          await request(
            `/api/support/tickets/${ticketId}`
          );

        setTicket(
          data?.ticket ||
          data?.data?.ticket ||
          data?.data ||
          null
        );
      } catch (err) {
        setError(
          err.message ||
            "Unable to load support ticket."
        );
      }
    };

  const sendTicketMessage =
    async (event) => {
      event.preventDefault();

      if (!selectedTicketId) {
        return;
      }

      const text =
        ticketMessage.trim();

      if (
        !text &&
        !ticketFile
      ) {
        setError(
          "Write a response or attach an image/video."
        );

        return;
      }

      try {
        setError("");
        setMessage("");

        const formData =
          new FormData();

        if (text) {
          formData.append(
            "body",
            text
          );
        }

        if (ticketFile) {
          formData.append(
            "file",
            ticketFile
          );
        }

        const responseData =
          await request(
            `/api/support/tickets/${selectedTicketId}/messages`,
            {
              method: "POST",
              body: formData,
            }
          );

        const updatedTicket =
          responseData?.ticket ||
          responseData?.data?.ticket ||
          responseData?.data ||
          null;

        if (updatedTicket) {
          setTicket(
            updatedTicket
          );

          setTickets(
            (previous) =>
              previous.map(
                (item) =>
                  Number(item.id) ===
                  Number(selectedTicketId)
                    ? {
                        ...item,
                        ...updatedTicket,
                      }
                    : item
              )
          );
        }

        setTicketMessage("");
        setTicketFile(null);

        setMessage(
          "Response sent successfully."
        );

        await loadTicket(
          selectedTicketId
        );

        await loadOverview();
      } catch (err) {
        setError(
          err.message ||
            "Unable to send response."
        );
      }
    };

  const changeTicketStatus =
    async (status) => {
      if (!selectedTicketId) {
        return;
      }

      try {
        await request(
          `/api/support/tickets/${selectedTicketId}/status`,
          {
            method: "PATCH",
            body: JSON.stringify({
              status,
            }),
          }
        );

        setMessage(
          "Ticket status updated."
        );

        await loadTicket(
          selectedTicketId
        );

        await loadOverview();
      } catch (err) {
        setError(
          err.message ||
            "Unable to update ticket."
        );
      }
    };

  const createAdmin =
    async (event) => {
      event.preventDefault();

      if (!isSuperAdmin) {
        return;
      }

      try {
        setError("");
        setMessage("");

        await request(
          "/api/admin/admins",
          {
            method: "POST",

            body: JSON.stringify(
              adminForm
            ),
          }
        );

        setAdminForm({
          fullName: "",
          email: "",
          phone: "",
          password: "",
          role: "ADMIN",
        });

        setMessage(
          "Admin account created successfully."
        );

        await loadSuperAdmin();
      } catch (err) {
        setError(
          err.message ||
            "Unable to create admin account."
        );
      }
    };

  const deleteAdmin =
    async (id) => {
      if (!isSuperAdmin) {
        return;
      }

      if (
        !window.confirm(
          "Delete this admin account?"
        )
      ) {
        return;
      }

      try {
        setError("");
        setMessage("");

        await request(
          `/api/admin/admins/${id}`,
          {
            method: "DELETE",
          }
        );

        setMessage(
          "Admin account deleted successfully."
        );

        await loadSuperAdmin();
      } catch (err) {
        setError(
          err.message ||
            "Unable to delete admin account."
        );
      }
    };

  const saveRecipient =
    async (event) => {
      event.preventDefault();

      if (!isSuperAdmin) {
        return;
      }

      if (!recipientId) {
        setError(
          "Select a fee recipient."
        );

        return;
      }

      try {
        setError("");
        setMessage("");

        await request(
          "/api/admin/fee-recipient",
          {
            method: "PUT",

            body: JSON.stringify({
              recipientAdminId:
                Number(
                  recipientId
                ),
            }),
          }
        );

        setMessage(
          "Trading fee recipient updated successfully."
        );

        await loadSuperAdmin();
      } catch (err) {
        setError(
          err.message ||
            "Unable to update fee recipient."
        );
      }
    };

  const saveBank =
    async (event) => {
      event.preventDefault();

      if (!isSuperAdmin) {
        return;
      }

      try {
        setError("");
        setMessage("");

        await request(
          "/api/admin/fee-bank-account",
          {
            method: "PUT",

            body: JSON.stringify({
              ...bank,
              bankName:
                settlementForm.bankName ||
                bank.bankName,
              bankAccountNumber:
                settlementForm.bankAccountNumber ||
                bank.bankAccountNumber,
              bankCardNumber:
                settlementForm.cardNumber ||
                bank.bankCardNumber,
              bankIban:
                settlementForm.bankIban ||
                bank.bankIban,
              bankAccountHolder:
                settlementForm.bankAccountHolder ||
                bank.bankAccountHolder,
              destinationCountry:
                settlementForm.destinationCountry ||
                bank.destinationCountry ||
                null,
              destinationCurrency:
                settlementForm.destinationCurrency ||
                bank.destinationCurrency ||
                null,
              cardCountryCode:
                settlementForm.destinationCountry ||
                bank.cardCountryCode ||
                null,
            }),
          }
        );

        setMessage(
          "Fee bank account updated successfully."
        );

        await loadSuperAdmin();
      } catch (err) {
        setError(
          err.message ||
            "Unable to update bank account."
        );
      }
    };

  const openTickets =
    Number.isFinite(
      Number(stats?.openTickets)
    )
      ? Number(stats.openTickets)
      : tickets.filter(
          (item) =>
            item.status ===
            "OPEN"
        ).length;

  if (!isAdmin) {
    return null;
  }

  const permissionSummary = {
    canViewUsers: isAdmin,
    canDeleteUsers: isAdmin,
    canReplySupport: isAdmin,
    canManageAdmins: isSuperAdmin,
    canManageFees: isSuperAdmin,
  };

  void permissionSummary;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />

          <p className="text-sm text-zinc-500">
            Loading Admin Panel...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.25em] text-blue-400">
                HYPER TRADE
              </p>

              <h1 className="mt-2 text-3xl font-black">
                {isSuperAdmin
                  ? "Super Admin Panel"
                  : "Admin Panel"}
              </h1>

              <p className="mt-2 text-sm text-zinc-500">
                {isSuperAdmin
                  ? "Full platform administration and customer support."
                  : "Customer support and platform administration."}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/dashboard"
                )
              }
              className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-bold text-zinc-300 hover:border-blue-500 hover:text-white"
            >
              Back to Dashboard
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            {message}
          </div>
        )}

        <section className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-5">
            <p className="text-xs font-bold tracking-widest text-zinc-600">PLATFORM USERS</p>
            <p className="mt-2 text-3xl font-black">{stats?.users ?? users.length}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-5">
            <p className="text-xs font-bold tracking-widest text-zinc-600">VERIFIED KYC</p>
            <p className="mt-2 text-3xl font-black">{stats?.verifiedKyc ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-5">
            <p className="text-xs font-bold tracking-widest text-zinc-600">PENDING KYC</p>
            <p className="mt-2 text-3xl font-black">{stats?.pendingKyc ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-5">
            <p className="text-xs font-bold tracking-widest text-zinc-600">OPEN SUPPORT</p>
            <p className="mt-2 text-3xl font-black">{openTickets}</p>
            <p className="mt-1 text-[10px] text-zinc-700">
              {stats?.totalSupportTickets ?? tickets.length} total tickets
            </p>
          </div>
        </section>

        <div className="mb-6 flex flex-wrap gap-2">
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() =>
                setActiveSection(
                  "overview"
                )
              }
              className={`rounded-xl px-4 py-2 text-xs font-black ${
                activeSection ===
                "overview"
                  ? "bg-blue-600"
                  : "border border-zinc-700 bg-[#0A0F1E] text-zinc-400"
              }`}
            >
              Overview
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              setActiveSection(
                "support"
              )
            }
            className={`rounded-xl px-4 py-2 text-xs font-black ${
              activeSection ===
              "support"
                ? "bg-blue-600"
                : "border border-zinc-700 bg-[#0A0F1E] text-zinc-400"
            }`}
          >
            Support Inbox
            {openTickets > 0 && (
              <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px]">
                {openTickets}
              </span>
            )}
          </button>

          {isSuperAdmin && (
            <>
              <button
                type="button"
                onClick={() =>
                  setActiveSection(
                    "admins"
                  )
                }
                className={`rounded-xl px-4 py-2 text-xs font-black ${
                  activeSection ===
                  "admins"
                    ? "bg-blue-600"
                    : "border border-zinc-700 bg-[#0A0F1E] text-zinc-400"
                }`}
              >
                Admin Management
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveSection(
                    "fees"
                  )
                }
                className={`rounded-xl px-4 py-2 text-xs font-black ${
                  activeSection ===
                  "fees"
                    ? "bg-blue-600"
                    : "border border-zinc-700 bg-[#0A0F1E] text-zinc-400"
                }`}
              >
                Fee Settings
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() =>
              setActiveSection(
                "users"
              )
            }
            className={`rounded-xl px-4 py-2 text-xs font-black ${
              activeSection ===
              "users"
                ? "bg-blue-600"
                : "border border-zinc-700 bg-[#0A0F1E] text-zinc-400"
            }`}
          >
            Users
          </button>
        </div>

        {activeSection ===
          "overview" &&
          isSuperAdmin && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                [
                  "Users",
                  stats?.users ??
                    0,
                ],

                [
                  "Total Orders",
                  stats?.totalOrders ??
                    0,
                ],

                [
                  "Completed Orders",
                  stats?.completedOrders ??
                    0,
                ],

                [
                  "Pending Orders",
                  stats?.pendingOrders ??
                    0,
                ],

                [
                  "Pending KYC",
                  stats?.pendingKyc ??
                    0,
                ],

                [
                  "Open Support",
                  openTickets,
                ],
              ].map(
                ([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6"
                  >
                    <p className="text-xs font-bold text-zinc-600">
                      {label}
                    </p>

                    <p className="mt-2 text-3xl font-black">
                      {value}
                    </p>
                  </div>
                )
              )}
            </div>
          )}

        {activeSection ===
          "support" && (
          <div className="grid min-h-[650px] gap-5 lg:grid-cols-[360px_1fr]">
            <div className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-black">
                  Customer Tickets
                </h2>

                <span className="text-xs text-zinc-600">
                  {tickets.length}
                </span>
              </div>

              <div className="space-y-2">
                {tickets.length ===
                0 ? (
                  <p className="py-10 text-center text-sm text-zinc-600">
                    No support tickets.
                  </p>
                ) : (
                  tickets.map(
                    (item) => (
                      <button
                        key={
                          item.id
                        }
                        type="button"
                        onClick={() =>
                          loadTicket(
                            item.id
                          )
                        }
                        className={`w-full rounded-xl border p-4 text-left ${
                          selectedTicketId ===
                          item.id
                            ? "border-blue-500/50 bg-blue-500/10"
                            : "border-zinc-800 bg-[#050816]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">
                              {
                                item.subject
                              }
                            </p>

                            {item.user && (
                              <p className="mt-1 truncate text-xs text-zinc-600">
                                {
                                  item
                                    .user
                                    .fullName
                                }
                              </p>
                            )}
                          </div>

                          <span className="text-[9px] font-black text-zinc-500">
                            {
                              item.status
                            }
                          </span>
                        </div>

                        <p className="mt-2 text-[10px] text-zinc-700">
                          {formatDate(
                            item.updatedAt
                          )}
                        </p>
                      </button>
                    )
                  )
                )}
              </div>
            </div>

            <div className="flex min-h-[650px] flex-col rounded-2xl border border-zinc-800 bg-[#0A0F1E]">
              {!ticket ? (
                <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-zinc-600">
                  Select a customer ticket to view and answer the conversation.
                </div>
              ) : (
                <>
                  <div className="border-b border-zinc-800 p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs text-zinc-600">
                          Ticket #
                          {
                            ticket.id
                          }
                        </p>

                        <h2 className="mt-1 text-xl font-black">
                          {
                            ticket.subject
                          }
                        </h2>

                        <p className="mt-2 text-xs text-zinc-500">
                          {
                            ticket.user
                              ?.fullName
                          }{" "}
                          ·{" "}
                          {
                            ticket.user
                              ?.email
                          }
                        </p>
                      </div>

                      <select
                        value={
                          ticket.status
                        }
                        onChange={(
                          event
                        ) =>
                          changeTicketStatus(
                            event
                              .target
                              .value
                          )
                        }
                        className="rounded-xl border border-zinc-700 bg-[#050816] px-3 py-2 text-xs font-bold"
                      >
                        <option value="OPEN">
                          OPEN
                        </option>

                        <option value="IN_PROGRESS">
                          PENDING
                        </option>

                        <option value="ANSWERED">
                          ANSWERED
                        </option>

                        <option value="RESOLVED">
                          RESOLVED
                        </option>

                        <option value="CLOSED">
                          CLOSED
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 overflow-y-auto p-5">
                    {ticket.messages?.map(
                      (item) => (
                        <div
                          key={
                            item.id
                          }
                          className={`flex ${
                            (item.senderRole || item.senderType) ===
                            "USER"
                              ? "justify-start"
                              : "justify-end"
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl border p-4 ${
                              (item.senderRole || item.senderType) ===
                              "USER"
                                ? "border-zinc-800 bg-[#050816]"
                                : "border-blue-500/30 bg-blue-500/10"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-black">
                                {
                                  item
                                    .sender
                                    ?.fullName
                                }
                              </span>

                              <span className="text-[9px] text-zinc-600">
                                {
                                  item.senderRole ||
                                  item.senderType
                                }
                              </span>
                            </div>

                            {(item.text || item.body || item.message) && (
                              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                                {
                                  item.text ||
                                  item.body ||
                                  item.message
                                }
                              </p>
                            )}

                            {item.attachmentUrl && (
                              <a
                                href={`${API_URL}${item.attachmentUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 block text-xs font-bold text-blue-400 hover:text-blue-300"
                              >
                                Open Attachment
                              </a>
                            )}

                            <p className="mt-3 text-[10px] text-zinc-700">
                              {formatDate(
                                item.createdAt
                              )}
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  <form
                    onSubmit={
                      sendTicketMessage
                    }
                    className="border-t border-zinc-800 p-4"
                  >
                    <textarea
                      value={
                        ticketMessage
                      }
                      onChange={(
                        event
                      ) =>
                        setTicketMessage(
                          event
                            .target
                            .value
                        )
                      }
                      rows={4}
                      placeholder="Write a response to the customer..."
                      className="w-full resize-none rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 text-sm outline-none focus:border-blue-500"
                    />

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <label className="cursor-pointer rounded-xl border border-zinc-700 px-4 py-2 text-xs font-bold text-zinc-300 hover:border-blue-500">
                        Attach Image / Video

                        <input
                          type="file"
                          accept="image/*,video/mp4,video/webm,video/quicktime"
                          onChange={(
                            event
                          ) =>
                            setTicketFile(
                              event
                                .target
                                .files?.[0] ||
                                null
                            )
                          }
                          className="hidden"
                        />
                      </label>

                      <button
                        type="submit"
                        className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-black hover:bg-blue-500"
                      >
                        Send Response
                      </button>
                    </div>

                    {ticketFile && (
                      <p className="mt-2 text-xs text-zinc-600">
                        Selected:{" "}
                        {
                          ticketFile.name
                        }
                      </p>
                    )}
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {activeSection ===
          "users" && (
          <section className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6">
            <div className="mb-5">
              <p className="text-xs font-bold tracking-widest text-zinc-600">
                USER MANAGEMENT
              </p>

              <h2 className="mt-1 text-2xl font-black">
                Users
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-600">
                    <th className="px-3 py-3">
                      User
                    </th>

                    <th className="px-3 py-3">
                      Role
                    </th>

                    <th className="px-3 py-3">
                      KYC
                    </th>

                    <th className="px-3 py-3">
                      Risk
                    </th>

                    <th className="px-3 py-3">
                      Status
                    </th>

                    <th className="px-3 py-3">
                      Created
                    </th>

                    <th className="px-3 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {users.map(
                    (item) => (
                      <tr
                        key={
                          item.id
                        }
                        className="border-b border-zinc-900"
                      >
                        <td className="px-3 py-4">
                          <p className="font-bold">
                            {
                              item.fullName
                            }
                          </p>

                          <p className="mt-1 text-xs text-zinc-600">
                            {
                              item.email
                            }
                          </p>
                        </td>

                        <td className="px-3 py-4 font-bold">
                          {
                            item.role
                          }
                        </td>

                        <td className="px-3 py-4">
                          {
                            item.kycStatus
                          }
                        </td>

                        <td className="px-3 py-4">
                          {item.riskLevel ||
                            "LOW"}{" "}
                          ·{" "}
                          {item.riskScore ??
                            0}
                        </td>

                        <td className="px-3 py-4">
                          {item.isBlocked
                            ? "BLOCKED"
                            : "ACTIVE"}
                        </td>

                        <td className="px-3 py-4 text-xs text-zinc-600">
                          {formatDate(
                            item.createdAt
                          )}
                        </td>

                        <td className="px-3 py-4">
                          {item.role === "USER" && (
                            <button
                              type="button"
                              onClick={() =>
                                deleteUser(item.id)
                              }
                              className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-black text-red-400 hover:bg-red-500/10"
                            >
                              Delete User
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeSection ===
          "admins" &&
          isSuperAdmin && (
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6">
                <p className="text-xs font-bold tracking-widest text-blue-400">
                  ADMIN MANAGEMENT
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Create Admin Account
                </h2>

                <form
                  onSubmit={
                    createAdmin
                  }
                  className="mt-6 space-y-4"
                >
                  <input
                    value={
                      adminForm.fullName
                    }
                    onChange={(
                      event
                    ) =>
                      setAdminForm({
                        ...adminForm,
                        fullName:
                          event
                            .target
                            .value,
                      })
                    }
                    placeholder="Full name"
                    required
                    className="w-full rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 text-sm"
                  />

                  <input
                    type="email"
                    value={
                      adminForm.email
                    }
                    onChange={(
                      event
                    ) =>
                      setAdminForm({
                        ...adminForm,
                        email:
                          event
                            .target
                            .value,
                      })
                    }
                    placeholder="Email address"
                    required
                    className="w-full rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 text-sm"
                  />

                  <input
                    value={
                      adminForm.phone
                    }
                    onChange={(
                      event
                    ) =>
                      setAdminForm({
                        ...adminForm,
                        phone:
                          event
                            .target
                            .value,
                      })
                    }
                    placeholder="Phone number"
                    className="w-full rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 text-sm"
                  />

                  <input
                    type="password"
                    minLength={8}
                    value={
                      adminForm.password
                    }
                    onChange={(
                      event
                    ) =>
                      setAdminForm({
                        ...adminForm,
                        password:
                          event
                            .target
                            .value,
                      })
                    }
                    placeholder="Password"
                    required
                    className="w-full rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 text-sm"
                  />

                  <select
                    value={
                      adminForm.role
                    }
                    onChange={(
                      event
                    ) =>
                      setAdminForm({
                        ...adminForm,
                        role:
                          event
                            .target
                            .value,
                      })
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 text-sm"
                  >
                    <option value="ADMIN">
                      ADMIN
                    </option>

                    <option value="SUPER_ADMIN">
                      SUPER_ADMIN
                    </option>
                  </select>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-black hover:bg-blue-500"
                  >
                    Create Admin
                  </button>
                </form>
              </section>

              <section className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6">
                <p className="text-xs font-bold tracking-widest text-zinc-600">
                  ADMIN ACCOUNTS
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Administrators
                </h2>

                <div className="mt-5 space-y-3">
                  {admins.map(
                    (item) => (
                      <div
                        key={
                          item.id
                        }
                        className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-[#050816] p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="font-bold">
                            {
                              item.fullName
                            }
                          </p>

                          <p className="mt-1 text-xs text-zinc-600">
                            {
                              item.email
                            }
                          </p>

                          <p className="mt-1 text-xs text-zinc-700">
                            {
                              item.role
                            }
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            deleteAdmin(
                              item.id
                            )
                          }
                          className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10"
                        >
                          Delete Admin
                        </button>
                      </div>
                    )
                  )}
                </div>
              </section>
            </div>
          )}

        {activeSection === "fees" && isSuperAdmin && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6">
                <p className="text-xs font-bold tracking-widest text-emerald-400">
                  TRADING FEES
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  0.5% Fee Recipient
                </h2>
                <form onSubmit={saveRecipient} className="mt-6 space-y-4">
                  <select
                    value={recipientId}
                    onChange={(event) => setRecipientId(event.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 text-sm outline-none focus:border-emerald-500"
                  >
                    <option value="">Select recipient</option>
                    {recipients.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.fullName} — {item.email} — {item.role}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black hover:bg-emerald-500"
                  >
                    Save Fee Recipient
                  </button>
                </form>
                <p className="mt-4 text-xs leading-6 text-zinc-600">
                  Only one ADMIN or SUPER_ADMIN can receive the active trading fee at a time.
                </p>
              </section>

              <section className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6">
                <p className="text-xs font-bold tracking-widest text-amber-400">
                  BANK SETTINGS
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  Fee Bank Account
                </h2>

                <form onSubmit={saveBank} className="mt-6 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <select
                      value={settlementForm.destinationCountry}
                      onChange={(event) => {
                        const countryCode = event.target.value;
                        setSettlementForm((previous) => ({
                          ...previous,
                          destinationCountry: countryCode,
                        }));
                        loadBanks(countryCode);
                      }}
                      className="w-full rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 text-sm outline-none focus:border-amber-500"
                    >
                      <option value="">Select country / jurisdiction</option>
                      {countries.map((country) => (
                        <option
                          key={country.code || country.countryCode || country.id}
                          value={country.code || country.countryCode}
                        >
                          {country.name || country.countryName || country.code}
                        </option>
                      ))}
                    </select>

                    <select
                      value={settlementForm.bankName}
                      onChange={(event) =>
                        setSettlementForm((previous) => ({
                          ...previous,
                          bankName: event.target.value,
                        }))
                      }
                      disabled={bankLoading || !settlementForm.destinationCountry}
                      className="w-full rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 text-sm disabled:opacity-50"
                    >
                      <option value="">
                        {bankLoading
                          ? "Loading banks..."
                          : `Select bank${banks.length ? ` (${banks.length})` : ""}`}
                      </option>
                      {banks.map((bankItem) => (
                        <option
                          key={bankItem.id || bankItem.swift || bankItem.name}
                          value={bankItem.name}
                        >
                          {bankItem.name}
                          {bankItem.swift ? ` · ${bankItem.swift}` : ""}
                        </option>
                      ))}
                    </select>

                    <input
                      value={bank.bankName || ""}
                      onChange={(event) =>
                        setBank({ ...bank, bankName: event.target.value })
                      }
                      placeholder="Bank name (saved destination)"
                      className="w-full rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 text-sm outline-none focus:border-amber-500"
                    />

                    <input
                      value={bank.bankAccountNumber || ""}
                      onChange={(event) =>
                        setBank({
                          ...bank,
                          bankAccountNumber: event.target.value,
                        })
                      }
                      placeholder="Bank account number"
                      className="w-full rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 text-sm outline-none focus:border-amber-500"
                    />

                    <input
                      value={bank.bankCardNumber || ""}
                      onChange={(event) =>
                        setBank({
                          ...bank,
                          bankCardNumber: event.target.value,
                        })
                      }
                      placeholder="Card number"
                      inputMode="numeric"
                      className="w-full rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 text-sm outline-none focus:border-amber-500"
                    />

                    <input
                      value={bank.bankIban || ""}
                      onChange={(event) =>
                        setBank({ ...bank, bankIban: event.target.value })
                      }
                      placeholder="IBAN"
                      className="w-full rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 text-sm outline-none focus:border-amber-500"
                    />

                    <input
                      value={bank.bankAccountHolder || ""}
                      onChange={(event) =>
                        setBank({
                          ...bank,
                          bankAccountHolder: event.target.value,
                        })
                      }
                      placeholder="Account holder name"
                      className="w-full rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 text-sm outline-none focus:border-amber-500 md:col-span-2"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => loadCountries()}
                      className="rounded-xl border border-zinc-700 px-4 py-3 text-xs font-black text-zinc-300 hover:border-blue-500"
                    >
                      Refresh Countries
                    </button>
                    <button
                      type="submit"
                      className="flex-1 rounded-xl bg-amber-600 px-5 py-3 text-sm font-black hover:bg-amber-500"
                    >
                      Save Bank Settings
                    </button>
                  </div>
                </form>
              </section>
            </div>

            <section className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-6">
              <p className="text-xs font-bold tracking-widest text-purple-400">
                FEE SETTLEMENT
              </p>
              <h2 className="mt-2 text-2xl font-black">
                واریز / تسویه کارمزد بر اساس ارز مقصد
              </h2>

              <form
                onSubmit={submitFeeSettlement}
                className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
              >
                <select
                  value={settlementForm.sourceAsset}
                  onChange={(event) =>
                    setSettlementForm({
                      ...settlementForm,
                      sourceAsset: event.target.value,
                    })
                  }
                  className="rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 text-sm"
                >
                  {[
                    "RIAL",
                    "BTC",
                    "ETH",
                    "SOL",
                    "TRX",
                    "USDT",
                  ].map((asset) => (
                    <option key={asset} value={asset}>
                      Source: {asset}
                    </option>
                  ))}
                </select>

                <input
                  value={settlementForm.sourceAmount}
                  onChange={(event) =>
                    setSettlementForm({
                      ...settlementForm,
                      sourceAmount: event.target.value,
                    })
                  }
                  placeholder="مبلغ کارمزد"
                  inputMode="decimal"
                  required
                  className="rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 text-sm"
                />

                <select
                  value={settlementForm.destinationCountry}
                  onChange={(event) => {
                    const countryCode = event.target.value;
                    setSettlementForm((previous) => ({
                      ...previous,
                      destinationCountry: countryCode,
                    }));
                    loadBanks(countryCode);
                  }}
                  required
                  className="rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 text-sm"
                >
                  <option value="">Destination country</option>
                  {countries.map((country) => (
                    <option
                      key={country.code || country.countryCode || country.id}
                      value={country.code || country.countryCode}
                    >
                      {country.name || country.countryName || country.code}
                    </option>
                  ))}
                </select>

                <select
                  value={settlementForm.bankName}
                  onChange={(event) =>
                    setSettlementForm((previous) => ({
                      ...previous,
                      bankName: event.target.value,
                    }))
                  }
                  disabled={bankLoading}
                  className="rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 text-sm disabled:opacity-50"
                >
                  <option value="">
                    {bankLoading
                      ? "Loading banks..."
                      : `Select bank${banks.length ? ` (${banks.length})` : ""}`}
                  </option>
                  {banks.map((bankItem) => (
                    <option
                      key={bankItem.id || bankItem.swift || bankItem.name}
                      value={bankItem.name}
                    >
                      {bankItem.name}
                      {bankItem.swift ? ` · ${bankItem.swift}` : ""}
                    </option>
                  ))}
                </select>

                <input
                  value={settlementForm.destinationCurrency}
                  onChange={(event) =>
                    setSettlementForm((previous) => ({
                      ...previous,
                      destinationCurrency:
                        event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="Destination currency"
                  maxLength={3}
                  required
                  className="rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 text-sm"
                />

                <div className="flex gap-2 lg:col-span-2">
                  <input
                    value={settlementForm.cardNumber}
                    onChange={(event) =>
                      setSettlementForm((previous) => ({
                        ...previous,
                        cardNumber: event.target.value,
                      }))
                    }
                    placeholder="Destination card number"
                    inputMode="numeric"
                    className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={lookupCardBin}
                    disabled={binLoading}
                    className="rounded-xl border border-blue-500/30 px-4 py-3 text-xs font-black text-blue-400 hover:bg-blue-500/10 disabled:opacity-50"
                  >
                    {binLoading ? "Checking..." : "Detect"}
                  </button>
                </div>

                <input
                  value={settlementForm.bankAccountNumber}
                  onChange={(event) =>
                    setSettlementForm({
                      ...settlementForm,
                      bankAccountNumber: event.target.value,
                    })
                  }
                  placeholder="Destination account number"
                  className="rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 text-sm"
                />

                <input
                  value={settlementForm.bankIban}
                  onChange={(event) =>
                    setSettlementForm({
                      ...settlementForm,
                      bankIban: event.target.value,
                    })
                  }
                  placeholder="Destination IBAN"
                  className="rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 text-sm"
                />

                <input
                  value={settlementForm.bankAccountHolder}
                  onChange={(event) =>
                    setSettlementForm({
                      ...settlementForm,
                      bankAccountHolder: event.target.value,
                    })
                  }
                  placeholder="Destination account holder"
                  className="rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 text-sm"
                />

                <input
                  value={settlementForm.trackingNumber}
                  onChange={(event) =>
                    setSettlementForm({
                      ...settlementForm,
                      trackingNumber: event.target.value,
                    })
                  }
                  placeholder="Bank tracking number"
                  required
                  className="rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 text-sm"
                />

                <textarea
                  value={settlementForm.description}
                  onChange={(event) =>
                    setSettlementForm({
                      ...settlementForm,
                      description: event.target.value,
                    })
                  }
                  placeholder="Description"
                  rows={3}
                  className="rounded-xl border border-zinc-700 bg-[#050816] px-4 py-3 text-sm lg:col-span-2"
                />

                <div className="flex gap-2 lg:col-span-3">
                  <button
                    type="button"
                    onClick={previewFeeSettlement}
                    className="flex-1 rounded-xl border border-purple-500/30 px-4 py-3 text-xs font-black text-purple-300 hover:bg-purple-500/10"
                  >
                    Preview Conversion
                  </button>
                  <button
                    type="submit"
                    disabled={settlementLoading}
                    className="flex-1 rounded-xl bg-purple-600 px-4 py-3 text-xs font-black hover:bg-purple-500 disabled:opacity-50"
                  >
                    {settlementLoading ? "Processing..." : "Record Settlement"}
                  </button>
                </div>
              </form>

              {settlementPreview && (
                <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-zinc-800 bg-[#050816] p-4">
                    <p className="text-xs text-zinc-600">Source</p>
                    <p className="mt-1 font-black">
                      {settlementPreview.sourceAmount} {settlementPreview.sourceAsset}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-[#050816] p-4">
                    <p className="text-xs text-zinc-600">USD Value</p>
                    <p className="mt-1 font-black">
                      {settlementPreview.usdAmount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-[#050816] p-4">
                    <p className="text-xs text-zinc-600">FX Rate</p>
                    <p className="mt-1 font-black">
                      {settlementPreview.usdToDestinationRate}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <p className="text-xs text-emerald-500">Destination</p>
                    <p className="mt-1 font-black text-emerald-300">
                      {settlementPreview.convertedAmount} {settlementPreview.destinationCurrency}
                    </p>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-[#0A0F1E] p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold tracking-widest text-zinc-600">
                    SETTLEMENT HISTORY
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    Fee Settlement History
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={loadSuperAdmin}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-black text-zinc-300 hover:border-blue-500"
                >
                  Refresh
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {feeSummary.map((row) => (
                  <div
                    key={row.asset}
                    className="rounded-xl border border-zinc-800 bg-[#050816] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black">{row.asset}</span>
                      <span className="text-xs text-zinc-600">
                        {row.accruedCount} accrued
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-zinc-600">Accrued</p>
                    <p className="mt-1 font-black text-emerald-400">
                      {row.accruedAmount}
                    </p>
                    <p className="mt-3 text-xs text-zinc-600">Settled</p>
                    <p className="mt-1 font-bold text-zinc-300">
                      {row.settledAmount}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-3">
                {feeSettlements.length === 0 ? (
                  <p className="text-sm text-zinc-600">
                    No fee settlements recorded yet.
                  </p>
                ) : (
                  feeSettlements.map((settlement) => (
                    <div
                      key={settlement.id}
                      className="rounded-xl border border-zinc-800 bg-[#050816] p-4"
                    >
                      <div className="grid gap-3 md:grid-cols-5">
                        <div>
                          <p className="text-[10px] text-zinc-600">Source</p>
                          <p className="mt-1 font-black">
                            {settlement.sourceAmount || settlement.amount} {settlement.sourceAsset || settlement.asset}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-600">Destination</p>
                          <p className="mt-1 font-black">
                            {settlement.convertedAmount || "—"} {settlement.destinationCurrency || ""}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-600">Bank</p>
                          <p className="mt-1 truncate font-bold">
                            {settlement.bankName || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-600">Card</p>
                          <p className="mt-1 font-bold">
                            {settlement.cardLast4 ? `•••• ${settlement.cardLast4}` : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-600">Status</p>
                          <p className="mt-1 font-black text-emerald-400">
                            {settlement.status}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

      </div>
    </div>
  );
}

