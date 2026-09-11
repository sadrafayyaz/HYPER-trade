import { BrowserProvider } from "ethers";

export async function connectMetaMask() {

    if (!window.ethereum) {
        throw new Error("MetaMask is not installed.");
    }

    const provider = new BrowserProvider(window.ethereum);

    await provider.send("eth_requestAccounts", []);

    const signer = await provider.getSigner();

    return {
        address: await signer.getAddress(),
        provider,
        signer,
    };
}