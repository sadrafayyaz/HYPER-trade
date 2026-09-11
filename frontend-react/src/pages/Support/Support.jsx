import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

const API_URL =
  (import.meta.env.VITE_API_URL ||
    "http://localhost:3000/api").replace(/\/$/, "");

const MAX_FILE_SIZE =
  50 * 1024 * 1024;

const EMPTY_NEW_TICKET = {
  subject: "",
  body: "",
};

const STATUS_LABELS = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  ANSWERED: "Answered",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

function formatDate(value) {
  if (!value) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(
      "en-US",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(new Date(value));
  } catch {
    return "";
  }
}

function getStatusClasses(status) {
  switch (status) {
    case "OPEN":
      return "border-blue-500/30 bg-blue-500/10 text-blue-300";

    case "IN_PROGRESS":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";

    case "RESOLVED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";

    case "CLOSED":
      return "border-zinc-600 bg-zinc-800/60 text-zinc-300";

    default:
      return "border-zinc-700 bg-zinc-800 text-zinc-300";
  }
}

function isImageMessage(message) {
  return (
    String(message?.attachmentType || "")
      .toLowerCase()
      .startsWith("image/")
  );
}

function isVideoMessage(message) {
  return (
    String(message?.attachmentType || "")
      .toLowerCase()
      .startsWith("video/")
  );
}

function getAttachmentUrl(url) {
  if (!url) {
    return "";
  }

  if (
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }

  const serverBase = API_URL.replace(/\/api\/?$/, "");

  return `${serverBase}${url}`;
}

function safeParseUser() {
  try {
    const raw =
      localStorage.getItem(
        "hypertrade_user"
      );

    if (!raw) {
      return null;
    }

    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function Support() {
  const navigate = useNavigate();
  const [searchParams] =
    useSearchParams();

  const fileInputRef = useRef(null);
  const replyFileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [user, setUser] = useState(
    safeParseUser()
  );

  const [tickets, setTickets] = useState(
    []
  );

  const [selectedTicket, setSelectedTicket] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [loadingTicket, setLoadingTicket] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [updatingStatus, setUpdatingStatus] =
    useState(false);

  const [pageError, setPageError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [ticketError, setTicketError] =
    useState("");

  const [newTicket, setNewTicket] =
    useState(
      EMPTY_NEW_TICKET
    );

  const [newTicketFile, setNewTicketFile] =
    useState(null);

  const [replyText, setReplyText] =
    useState("");

  const [replyFile, setReplyFile] =
    useState(null);

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const token =
    localStorage.getItem(
      "hypertrade_token"
    );

  const role = String(
    user?.role || ""
  ).toUpperCase();

  const isAdmin =
    role === "ADMIN" ||
    role === "SUPER_ADMIN";

  const selectedTicketId =
    selectedTicket?.id || null;

  const visibleTickets = useMemo(() => {
    if (statusFilter === "ALL") {
      return tickets;
    }

    return tickets.filter(
      (ticket) =>
        ticket.status === statusFilter
    );
  }, [
    tickets,
    statusFilter,
  ]);

  const request = useCallback(
    async (
      path,
      options = {}
    ) => {
      const currentToken =
        localStorage.getItem(
          "hypertrade_token"
        );

      if (!currentToken) {
        navigate("/");
        throw new Error(
          "Authentication required"
        );
      }

      const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${currentToken}`,
      };

      if (
        !(options.body instanceof FormData) &&
        options.body !== undefined
      ) {
        headers["Content-Type"] =
          "application/json";
      }

      const response = await fetch(
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
        localStorage.removeItem(
          "hypertrade_token"
        );

        localStorage.removeItem(
          "hypertrade_user"
        );

        navigate("/");
        throw new Error(
          "Authentication required"
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Request failed"
        );
      }

      return data;
    },
    [navigate]
  );

  const loadTickets = useCallback(
    async ({
      keepSelection = true,
    } = {}) => {
      setLoading(true);
      setPageError("");

      try {
        const query =
          statusFilter !== "ALL"
            ? `?status=${encodeURIComponent(
                statusFilter
              )}`
            : "";

        const data =
          await request(
            `/support/tickets${query}`
          );

        const list = Array.isArray(
          data?.data?.tickets ?? data?.tickets
        )
          ? data?.data?.tickets ?? data?.tickets
          : [];

        setTickets(list);

        if (
          keepSelection &&
          selectedTicketId
        ) {
          const stillExists =
            list.find(
              (ticket) =>
                Number(ticket.id) ===
                Number(
                  selectedTicketId
                )
            );

          if (!stillExists) {
            setSelectedTicket(null);
          }
        }
      } catch (error) {
        console.error(
          "Support ticket loading error:",
          error
        );

        setPageError(
          error.message ||
            "Unable to load support tickets."
        );
      } finally {
        setLoading(false);
      }
    },
    [
      request,
      selectedTicketId,
      statusFilter,
    ]
  );

  const loadTicket = useCallback(
    async (ticketId) => {
      if (!ticketId) {
        return;
      }

      setLoadingTicket(true);
      setTicketError("");

      try {
        const data =
          await request(
            `/support/tickets/${ticketId}`
          );

        setSelectedTicket(
          data?.data?.ticket || data?.data || data?.ticket || null
        );
      } catch (error) {
        console.error(
          "Support ticket details error:",
          error
        );

        setTicketError(
          error.message ||
            "Unable to load this ticket."
        );
      } finally {
        setLoadingTicket(false);
      }
    },
    [request]
  );

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    loadTickets({
      keepSelection: false,
    });
  }, [
    token,
    navigate,
    loadTickets,
  ]);

  useEffect(() => {
    const ticketFromUrl =
      searchParams.get("ticket");

    if (!ticketFromUrl) {
      return;
    }

    const numericId =
      Number(ticketFromUrl);

    if (
      Number.isInteger(numericId) &&
      numericId > 0
    ) {
      loadTicket(numericId);
    }
  }, [
    searchParams,
    loadTicket,
  ]);

  useEffect(() => {
    if (!selectedTicketId) {
      return;
    }

    messagesEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      }
    );
  }, [
    selectedTicketId,
    selectedTicket?.messages?.length,
  ]);

  const handleNewTicketChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setNewTicket(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  };

  const validateFile = (file) => {
    if (!file) {
      return "";
    }

    if (
      !file.type.startsWith(
        "image/"
      ) &&
      !file.type.startsWith(
        "video/"
      )
    ) {
      return "Only image and video files are allowed.";
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      return "The maximum attachment size is 50 MB.";
    }

    return "";
  };

  const handleNewTicketFile = (
    event
  ) => {
    const file =
      event.target.files?.[0] ||
      null;

    if (!file) {
      setNewTicketFile(null);
      return;
    }

    const error =
      validateFile(file);

    if (error) {
      setTicketError(error);

      event.target.value = "";
      setNewTicketFile(null);
      return;
    }

    setTicketError("");
    setNewTicketFile(file);
  };

  const handleReplyFile = (
    event
  ) => {
    const file =
      event.target.files?.[0] ||
      null;

    if (!file) {
      setReplyFile(null);
      return;
    }

    const error =
      validateFile(file);

    if (error) {
      setTicketError(error);

      event.target.value = "";
      setReplyFile(null);
      return;
    }

    setTicketError("");
    setReplyFile(file);
  };

  const createTicket = async (
    event
  ) => {
    event.preventDefault();

    setTicketError("");
    setSuccessMessage("");

    const subject =
      newTicket.subject.trim();

    const body =
      newTicket.body.trim();

    if (!subject) {
      setTicketError(
        "Please enter a ticket subject."
      );
      return;
    }

    if (!body && !newTicketFile) {
      setTicketError(
        "Enter a message or attach an image/video."
      );
      return;
    }

    setCreating(true);

    try {
      const formData =
        new FormData();

      formData.append(
        "subject",
        subject
      );

      if (body) {
        formData.append(
          "body",
          body
        );
      }

      if (newTicketFile) {
        formData.append(
          "file",
          newTicketFile
        );
      }

      const data =
        await request(
          "/support/tickets",
          {
            method: "POST",
            body: formData,
          }
        );

      const createdTicket =
        data?.data?.ticket || data?.data || data?.ticket;

      if (createdTicket) {
        setTickets(
          (previous) => [
            createdTicket,
            ...previous,
          ]
        );

        setSelectedTicket(
          createdTicket
        );

        navigate(
          `/support?ticket=${createdTicket.id}`
        );
      }

      setNewTicket(
        EMPTY_NEW_TICKET
      );

      setNewTicketFile(null);

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }

      setShowCreateForm(
        false
      );

      setSuccessMessage(
        "Your support ticket has been created."
      );
    } catch (error) {
      console.error(
        "Create support ticket error:",
        error
      );

      setTicketError(
        error.message ||
          "Unable to create support ticket."
      );
    } finally {
      setCreating(false);
    }
  };

  const sendReply = async (
    event
  ) => {
    event.preventDefault();

    if (!selectedTicketId) {
      return;
    }

    setTicketError("");
    setSuccessMessage("");

    const body =
      replyText.trim();

    if (!body && !replyFile) {
      setTicketError(
        "Enter a message or attach an image/video."
      );
      return;
    }

    setSending(true);

    try {
      const formData =
        new FormData();

      if (body) {
        formData.append(
          "body",
          body
        );
      }

      if (replyFile) {
        formData.append(
          "file",
          replyFile
        );
      }

      const data =
        await request(
          `/support/tickets/${selectedTicketId}/messages`,
          {
            method: "POST",
            body: formData,
          }
        );

      if (data?.data?.ticket || data?.data || data?.ticket) {
        const returnedTicket =
          data?.data?.ticket || data?.data || data?.ticket;

        setSelectedTicket(
          returnedTicket
        );

        setTickets(
          (previous) =>
            previous.map(
              (ticket) =>
                Number(ticket.id) ===
                Number(
                  selectedTicketId
                )
                  ? {
                      ...ticket,
                      ...returnedTicket,
                    }
                  : ticket
            )
        );
      }

      setReplyText("");
      setReplyFile(null);

      if (
        replyFileInputRef.current
      ) {
        replyFileInputRef.current.value =
          "";
      }

      setSuccessMessage(
        "Message sent successfully."
      );
    } catch (error) {
      console.error(
        "Support reply error:",
        error
      );

      setTicketError(
        error.message ||
          "Unable to send your message."
      );
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (
    status
  ) => {
    if (
      !selectedTicketId ||
      !isAdmin
    ) {
      return;
    }

    setUpdatingStatus(true);
    setTicketError("");
    setSuccessMessage("");

    try {
      const data =
        await request(
          `/support/tickets/${selectedTicketId}/status`,
          {
            method: "PATCH",
            body: JSON.stringify({
              status,
            }),
          }
        );

      if (data?.data?.ticket || data?.data || data?.ticket) {
        const returnedTicket =
          data?.data?.ticket || data?.data || data?.ticket;

        setSelectedTicket(
          returnedTicket
        );

        setTickets(
          (previous) =>
            previous.map(
              (ticket) =>
                Number(ticket.id) ===
                Number(
                  selectedTicketId
                )
                  ? {
                      ...ticket,
                      status:
                        returnedTicket.status,
                      updatedAt:
                        returnedTicket.updatedAt,
                    }
                  : ticket
            )
        );
      }

      setSuccessMessage(
        "Ticket status updated."
      );
    } catch (error) {
      console.error(
        "Support status error:",
        error
      );

      setTicketError(
        error.message ||
          "Unable to update ticket status."
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const selectTicket = async (
    ticket
  ) => {
    setSelectedTicket(
      ticket
    );

    setTicketError("");

    navigate(
      `/support?ticket=${ticket.id}`,
      {
        replace: true,
      }
    );

    await loadTicket(
      ticket.id
    );
  };

  const goBackToDashboard = () => {
    navigate("/dashboard");
  };

  const removeNewTicketFile = () => {
    setNewTicketFile(null);

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  };

  const removeReplyFile = () => {
    setReplyFile(null);

    if (
      replyFileInputRef.current
    ) {
      replyFileInputRef.current.value =
        "";
    }
  };

  const renderAttachment = (
    message
  ) => {
    if (
      !message?.attachmentUrl
    ) {
      return null;
    }

    const url =
      getAttachmentUrl(
        message.attachmentUrl
      );

    if (
      isImageMessage(message)
    ) {
      return (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block overflow-hidden rounded-xl border border-white/10 bg-black/20"
        >
          <img
            src={url}
            alt={
              message.attachmentName ||
              "Support attachment"
            }
            className="max-h-[420px] w-full object-contain"
          />
        </a>
      );
    }

    if (
      isVideoMessage(message)
    ) {
      return (
        <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black">
          <video
            controls
            preload="metadata"
            className="max-h-[420px] w-full"
            src={url}
          >
            Your browser does not support
            video playback.
          </video>
        </div>
      );
    }

    return null;
  };

  const renderMessage = (
    message
  ) => {
    const ownMessage =
      Number(
        message?.senderId
      ) ===
      Number(user?.id);

    const senderRole =
      String(
        message?.senderRole ||
          message?.senderType ||
          message?.sender?.role ||
          ""
      ).toUpperCase();

    const senderName =
      ownMessage
        ? "You"
        : senderRole ===
            "SUPER_ADMIN"
          ? "Super Admin"
          : senderRole === "ADMIN"
          ? "Admin"
          : message?.sender
              ?.fullName ||
            "Support";

    return (
      <div
        key={message.id}
        className={`flex ${
          ownMessage
            ? "justify-end"
            : "justify-start"
        }`}
      >
        <div
          className={`max-w-[88%] rounded-2xl border p-4 ${
            ownMessage
              ? "border-blue-500/30 bg-blue-500/10"
              : "border-white/10 bg-white/[0.04]"
          }`}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-white">
              {senderName}
            </span>

            {senderRole ===
              "SUPER_ADMIN" && (
              <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-300">
                Super Admin
              </span>
            )}

            {senderRole ===
              "ADMIN" && (
              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
                Admin
              </span>
            )}

            <span className="text-xs text-zinc-500">
              {formatDate(
                message.createdAt
              )}
            </span>
          </div>

          {(message.body || message.message) && (
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-200">
              {message.body || message.message}
            </p>
          )}

          {renderAttachment(
            message
          )}

          {message.attachmentName && (
            <p className="mt-2 truncate text-xs text-zinc-500">
              {message.attachmentName}
            </p>
          )}
        </div>
      </div>
    );
  };

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050816]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <div>
            <button
              type="button"
              onClick={
                goBackToDashboard
              }
              className="text-left"
            >
              <div className="text-lg font-black tracking-tight">
                HYPER TRADE
              </div>

              <div className="text-xs text-zinc-500">
                Support Center
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={() =>
                  navigate("/admin")
                }
                className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-300 transition hover:bg-purple-500/20"
              >
                Admin Panel
              </button>
            )}

            <button
              type="button"
              onClick={
                goBackToDashboard
              }
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.08]"
            >
              Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-5 py-6 lg:px-8 lg:py-8">
        <div className="mb-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
                Hyper Trade
              </p>

              <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                Support Center
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Contact the Hyper Trade support team.
                You can send text messages, images, and
                videos directly from your account.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowCreateForm(
                  (value) => !value
                )
              }
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
            >
              {showCreateForm
                ? "Close Form"
                : "New Support Ticket"}
            </button>
          </div>
        </div>

        {pageError && (
          <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {pageError}
          </div>
        )}

        {ticketError && (
          <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {ticketError}
          </div>
        )}

        {successMessage && (
          <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            {successMessage}
          </div>
        )}

        {showCreateForm && (
          <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl lg:p-6">
            <div className="mb-5">
              <h2 className="text-xl font-bold">
                Create Support Ticket
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Describe your issue and attach an image
                or video if necessary.
              </p>
            </div>

            <form
              onSubmit={createTicket}
              className="space-y-4"
            >
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-300">
                  Subject
                </label>

                <input
                  name="subject"
                  value={
                    newTicket.subject
                  }
                  onChange={
                    handleNewTicketChange
                  }
                  maxLength={200}
                  placeholder="What do you need help with?"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-300">
                  Message
                </label>

                <textarea
                  name="body"
                  value={
                    newTicket.body
                  }
                  onChange={
                    handleNewTicketChange
                  }
                  maxLength={10000}
                  rows={6}
                  placeholder="Describe your problem..."
                  className="w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500/50"
                />
              </div>

              <div className="rounded-2xl border border-dashed border-white/15 bg-black/10 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">
                      Attachment
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      Images or videos only. Maximum 50 MB.
                    </p>
                  </div>

                  <label className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.08]">
                    Choose File
                    <input
                      ref={
                        fileInputRef
                      }
                      type="file"
                      accept="image/*,video/*"
                      onChange={
                        handleNewTicketFile
                      }
                      className="hidden"
                    />
                  </label>
                </div>

                {newTicketFile && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-zinc-200">
                        {newTicketFile.name}
                      </p>

                      <p className="text-xs text-zinc-500">
                        {(
                          newTicketFile.size /
                          1024 /
                          1024
                        ).toFixed(2)}{" "}
                        MB
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        removeNewTicketFile
                      }
                      className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating
                    ? "Creating..."
                    : "Create Ticket"}
                </button>
              </div>
            </form>
          </section>
        )}

        <div className="grid min-h-[650px] gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]">
            <div className="border-b border-white/10 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold">
                    {isAdmin
                      ? "All Support Tickets"
                      : "My Tickets"}
                  </h2>

                  <p className="mt-1 text-xs text-zinc-500">
                    {tickets.length} ticket
                    {tickets.length === 1
                      ? ""
                      : "s"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    loadTickets()
                  }
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/[0.06]"
                >
                  Refresh
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  ["ALL", "All"],
                  ["OPEN", "Open"],
                  [
                    "IN_PROGRESS",
                    "In Progress",
                  ],
                  [
                    "ANSWERED",
                    "Answered",
                  ],
                  [
                    "RESOLVED",
                    "Resolved",
                  ],
                  [
                    "CLOSED",
                    "Closed",
                  ],
                ].map(
                  ([
                    value,
                    label,
                  ]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setStatusFilter(
                          value
                        )
                      }
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                        statusFilter ===
                        value
                          ? "bg-blue-600 text-white"
                          : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08]"
                      }`}
                    >
                      {label}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="max-h-[650px] overflow-y-auto">
              {loading ? (
                <div className="flex min-h-[300px] items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
                    <p className="text-sm text-zinc-500">
                      Loading tickets...
                    </p>
                  </div>
                </div>
              ) : visibleTickets.length ===
                0 ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.05] text-2xl">
                    ?
                  </div>

                  <h3 className="font-semibold">
                    No support tickets
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    Create a ticket if you need help from
                    the Hyper Trade support team.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {visibleTickets.map(
                    (ticket) => {
                      const active =
                        Number(
                          selectedTicketId
                        ) ===
                        Number(
                          ticket.id
                        );

                      const latest =
                        ticket.latestMessage;

                      return (
                        <button
                          key={
                            ticket.id
                          }
                          type="button"
                          onClick={() =>
                            selectTicket(
                              ticket
                            )
                          }
                          className={`w-full p-4 text-left transition ${
                            active
                              ? "bg-blue-500/10"
                              : "hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">
                                {
                                  ticket.subject
                                }
                              </p>

                              {isAdmin &&
                                ticket.user && (
                                  <p className="mt-1 truncate text-xs text-zinc-500">
                                    {
                                      ticket
                                        .user
                                        .fullName
                                    }{" "}
                                    ·{" "}
                                    {
                                      ticket
                                        .user
                                        .email
                                    }
                                  </p>
                                )}
                            </div>

                            <span
                              className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${getStatusClasses(
                                ticket.status
                              )}`}
                            >
                              {
                                STATUS_LABELS[
                                  ticket
                                    .status
                                ]
                              }
                            </span>
                          </div>

                          <p className="mt-2 truncate text-xs text-zinc-500">
                            {latest?.body ||
                              latest?.message ||
                              latest?.attachmentName ||
                              "Attachment"}
                          </p>

                          <p className="mt-2 text-[11px] text-zinc-600">
                            {formatDate(
                              ticket.updatedAt
                            )}
                          </p>
                        </button>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="flex min-h-[650px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]">
            {!selectedTicket ? (
              <div className="flex flex-1 items-center justify-center px-6 text-center">
                <div className="max-w-md">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-2xl text-blue-400">
                    ?
                  </div>

                  <h2 className="text-xl font-bold">
                    Select a Support Ticket
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    Select a ticket from the list to view
                    the conversation and communicate with
                    support.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setShowCreateForm(
                        true
                      )
                    }
                    className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-500"
                  >
                    Create New Ticket
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="border-b border-white/10 p-5">
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                          Ticket #
                          {
                            selectedTicket.id
                          }
                        </span>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getStatusClasses(
                            selectedTicket.status
                          )}`}
                        >
                          {
                            STATUS_LABELS[
                              selectedTicket
                                .status
                            ]
                          }
                        </span>
                      </div>

                      <h2 className="mt-2 break-words text-xl font-bold">
                        {
                          selectedTicket.subject
                        }
                      </h2>

                      {isAdmin &&
                        selectedTicket.user && (
                          <p className="mt-2 text-sm text-zinc-500">
                            Customer:{" "}
                            <span className="text-zinc-300">
                              {
                                selectedTicket
                                  .user
                                  .fullName
                              }
                            </span>{" "}
                            ·{" "}
                            {
                              selectedTicket
                                .user
                                .email
                            }
                          </p>
                        )}
                    </div>

                    {isAdmin && (
                      <div className="flex flex-wrap gap-2">
                        {[
                          "OPEN",
                          "IN_PROGRESS",
                          "ANSWERED",
                          "RESOLVED",
                          "CLOSED",
                        ].map(
                          (status) => (
                            <button
                              key={
                                status
                              }
                              type="button"
                              disabled={
                                updatingStatus ||
                                selectedTicket.status ===
                                  status
                              }
                              onClick={() =>
                                changeStatus(
                                  status
                                )
                              }
                              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${getStatusClasses(
                                status
                              )}`}
                            >
                              {
                                STATUS_LABELS[
                                  status
                                ]
                              }
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-5">
                  {loadingTicket ? (
                    <div className="flex min-h-[300px] items-center justify-center">
                      <div className="text-center">
                        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
                        <p className="text-sm text-zinc-500">
                          Loading conversation...
                        </p>
                      </div>
                    </div>
                  ) : selectedTicket.messages?.length ? (
                    selectedTicket.messages.map(
                      renderMessage
                    )
                  ) : (
                    <div className="py-20 text-center text-sm text-zinc-500">
                      No messages yet.
                    </div>
                  )}

                  <div
                    ref={
                      messagesEndRef
                    }
                  />
                </div>

                <div className="border-t border-white/10 p-4">
                  {selectedTicket.status ===
                    "CLOSED" &&
                    !isAdmin && (
                      <div className="mb-3 rounded-xl border border-zinc-700 bg-zinc-800/50 p-3 text-xs text-zinc-400">
                        This ticket is closed. Sending a
                        new message will reopen it.
                      </div>
                    )}

                  <form
                    onSubmit={
                      sendReply
                    }
                    className="space-y-3"
                  >
                    <textarea
                      value={
                        replyText
                      }
                      onChange={(event) =>
                        setReplyText(
                          event.target
                            .value
                        )
                      }
                      maxLength={10000}
                      rows={4}
                      placeholder={
                        isAdmin
                          ? "Write a reply to the customer..."
                          : "Write a message to support..."
                      }
                      className="w-full resize-y rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-600 focus:border-blue-500/50"
                    />

                    {replyFile && (
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm text-zinc-200">
                            {
                              replyFile.name
                            }
                          </p>

                          <p className="text-xs text-zinc-500">
                            {(
                              replyFile.size /
                              1024 /
                              1024
                            ).toFixed(
                              2
                            )}{" "}
                            MB
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={
                            removeReplyFile
                          }
                          className="rounded-lg px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10"
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/[0.08]">
                          Attach Image / Video
                          <input
                            ref={
                              replyFileInputRef
                            }
                            type="file"
                            accept="image/*,video/*"
                            onChange={
                              handleReplyFile
                            }
                            className="hidden"
                          />
                        </label>

                        <span className="text-[11px] text-zinc-600">
                          Max 50 MB
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={
                          sending
                        }
                        className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {sending
                          ? "Sending..."
                          : isAdmin
                          ? "Send Reply"
                          : "Send Message"}
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}