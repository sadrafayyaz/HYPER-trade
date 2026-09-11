import EthereumProvider from "@walletconnect/ethereum-provider";

const PROJECT_ID =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ||
  "";

const DEFAULT_METADATA = {
  name: "Hyper Trade",

  description:
    "Hyper Trade external wallet connection",

  url:
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:5173",

  icons: [
    typeof window !== "undefined"
      ? `${window.location.origin}/hyper-trade-logo.png`
      : "http://localhost:5173/hyper-trade-logo.png",
  ],
};

let providerInstance = null;

let initializingPromise = null;

function requireProjectId() {
  if (
    !PROJECT_ID ||
    PROJECT_ID === "YOUR_PROJECT_ID"
  ) {
    throw new Error(
      "WalletConnect is not configured. Set VITE_WALLETCONNECT_PROJECT_ID in the frontend environment and restart Vite."
    );
  }
}

export async function getWalletConnectProvider() {
  requireProjectId();

  if (providerInstance) {
    return providerInstance;
  }

  if (initializingPromise) {
    return initializingPromise;
  }

  initializingPromise =
    EthereumProvider.init({
      projectId:
        PROJECT_ID,

      chains: [1],

      showQrModal:
        true,

      metadata:
        DEFAULT_METADATA,
    })
      .then(
        (provider) => {
          providerInstance =
            provider;

          return provider;
        }
      )
      .finally(() => {
        initializingPromise =
          null;
      });

  return initializingPromise;
}

export async function connectWalletConnect() {
  const provider =
    await getWalletConnectProvider();

  if (
    typeof provider.on ===
    "function"
  ) {
    provider.on(
      "error",
      (error) => {
        console.error(
          "WalletConnect provider error:",
          error
        );
      }
    );
  }

  if (
    provider.session
  ) {
    try {
      const accounts =
        await provider.request(
          {
            method:
              "eth_accounts",
          }
        );

      if (
        Array.isArray(
          accounts
        ) &&
        accounts.length > 0
      ) {
        return provider;
      }
    } catch {}
  }

  await provider.enable();

  return provider;
}

export async function disconnectWalletConnect(
  provider = providerInstance
) {
  if (!provider) {
    return;
  }

  try {
    await provider.disconnect();
  } catch (error) {
    console.warn(
      "WalletConnect disconnect warning:",
      error
    );
  }

  if (
    provider ===
    providerInstance
  ) {
    providerInstance =
      null;
  }
}

export function getWalletConnectProjectId() {
  return PROJECT_ID;
}